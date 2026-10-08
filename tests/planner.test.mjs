import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createServer } from 'vite'

// Use the project's existing TS transform; no test framework or new dependency.
const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-tests',
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
})
after(() => server.close())
const focus = await server.ssrLoadModule('/src/lib/focus.ts')
const shared = await server.ssrLoadModule('/src/lib/studyPlans.ts')
const calendar = await server.ssrLoadModule('/src/lib/calendarTime.ts')
const color = await server.ssrLoadModule('/src/lib/color.ts')
const storage = await server.ssrLoadModule('/src/lib/plannerStorage.ts')
const { normalizeStudyRooms, createInitialStudyRooms } = await server.ssrLoadModule('/src/data/studyRooms.ts')
const { createInitialTodos, createInitialEvents } = await server.ssrLoadModule('/src/data/initialData.ts')

const at = (minute) => new Date(Date.UTC(2026, 8, 22, 9, minute)).toISOString()
const record = (overrides = {}) => ({
  id: 'focus-one', sourceType: 'todo', sourceId: 'todo-one', title: '집중',
  startedAt: at(0), segments: [{ startedAt: at(0) }], ...overrides,
})
const room = () => normalizeStudyRooms(createInitialStudyRooms())[0]

test('focus: repeated start reuses the running session', () => {
  const records = [record()]
  assert.equal(focus.startFocusRecord(records, record({ id: 'duplicate' })), records)
})

test('focus: pausing is idempotent and stops elapsed time', () => {
  const original = record()
  const paused = focus.pauseFocusRecord(original, at(2))
  assert.equal(focus.isFocusRecordRunning(paused), false)
  assert.equal(focus.getFocusDurationSeconds(paused, Date.parse(at(20))), 120)
  assert.equal(focus.pauseFocusRecord(paused, at(4)), paused)
  assert.equal(original.segments[0].endedAt, undefined)
})

test('focus: resume excludes the pause gap and retains the session identity', () => {
  const paused = focus.pauseFocusRecord(record(), at(2))
  const [resumed] = focus.startFocusRecord([paused], record({ id: 'ignored', startedAt: at(5) }))
  assert.equal(resumed.id, paused.id)
  assert.equal(focus.isFocusRecordRunning(resumed), true)
  assert.equal(focus.getFocusDurationSeconds(resumed, Date.parse(at(6))), 180)
})

test('focus: finishing a paused session never adds paused time', () => {
  const paused = focus.pauseFocusRecord(record(), at(2))
  const finished = focus.finishFocusRecord(paused, at(8))
  assert.equal(finished.endedAt, at(8))
  assert.equal(finished.segments[0].endedAt, at(2))
  assert.equal(focus.getFocusDurationSeconds(finished, Date.parse(at(30))), 120)
  assert.equal(focus.finishFocusRecord(finished, at(9)), finished)
})

test('focus: finishing a running session closes its last segment', () => {
  const finished = focus.finishFocusRecord(record(), at(3))
  assert.equal(focus.getFocusDurationSeconds(finished, Date.parse(at(30))), 180)
  assert.equal(focus.isFocusRecordRunning(finished), false)
})

test('focus: legacy records without segments still pause, resume and finish', () => {
  const legacy = record({ segments: undefined })
  const paused = focus.pauseFocusRecord(legacy, at(2))
  assert.equal(focus.getFocusDurationSeconds(paused), 120)
  const [resumed] = focus.startFocusRecord([paused], record({ startedAt: at(4) }))
  assert.equal(focus.getFocusDurationSeconds(focus.finishFocusRecord(resumed, at(5))), 180)
})

test('focus: the same shared plan id in different rooms stays separate', () => {
  const first = record({ sourceType: 'study', roomId: 'room-a' })
  const second = record({ id: 'focus-two', sourceType: 'study', roomId: 'room-b' })
  const records = focus.startFocusRecord([first], second)
  assert.equal(records.length, 2)
  assert.equal(records[0], first)
})

test('focus: restart replaces only the selected source history', () => {
  const first = record({ sourceType: 'study', roomId: 'room-a', endedAt: at(1) })
  const otherRoom = record({ id: 'other', sourceType: 'study', roomId: 'room-b' })
  const personal = record({ id: 'personal' })
  const replacement = record({ id: 'new', sourceType: 'study', roomId: 'room-a', startedAt: at(5) })
  assert.deepEqual(focus.restartFocusRecord([first, otherRoom, personal], replacement), [otherRoom, personal, replacement])
})

test('focus: overlapping sessions count total and pure time separately', () => {
  const records = [
    focus.finishFocusRecord(record(), at(3)),
    focus.finishFocusRecord(record({ startedAt: at(2), segments: [{ startedAt: at(2) }] }), at(5)),
  ]
  assert.equal(focus.getTotalFocusSeconds(records), 360)
  assert.equal(focus.getPureFocusSeconds(records), 300)
})

test('focus: invalid or reversed intervals do not add duration', () => {
  assert.equal(focus.getFocusDurationSeconds(record({ segments: [{ startedAt: 'bad' }, { startedAt: at(5), endedAt: at(2) }] })), 0)
})

test('shared plans: completing twice preserves timestamp and other members', () => {
  const original = room().sharedItems.find((item) => item.id === 'shared-morning-3')
  const completed = shared.setSharedItemStatus(original, 'me', true, at(3))
  assert.deepEqual(completed.completedMemberIds, [...original.completedMemberIds, 'me'])
  assert.equal(completed.completedAtByMember.me, at(3))
  assert.equal(shared.setSharedItemStatus(completed, 'me', true, at(5)), completed)
  assert.equal(original.completedMemberIds.includes('me'), false)
  assert.deepEqual(completed.participantMemberIds, original.participantMemberIds)
})

test('shared plans: undo clears only my completion and timestamp', () => {
  const original = room().sharedItems[0]
  const undone = shared.setSharedItemStatus(original, 'me', false, at(5))
  assert.equal(undone.completedMemberIds.includes('me'), false)
  assert.equal(undone.completedAtByMember.me, undefined)
  assert.equal(undone.completedAtByMember['member-1'], original.completedAtByMember['member-1'])
  assert.equal(original.completedMemberIds.includes('me'), true)
})

test('shared plans: event participation never changes completion fields', () => {
  const original = room().sharedItems.find((item) => item.type === 'event')
  const joined = shared.setSharedItemStatus(original, 'me', true, at(3))
  assert.equal(joined.participantMemberIds.includes('me'), true)
  assert.equal(joined.completedMemberIds, original.completedMemberIds)
  assert.equal(joined.completedAtByMember, original.completedAtByMember)
})

test('shared plans: activity completion does not join or complete an event', () => {
  const original = room()
  const event = original.sharedItems.find((item) => item.type === 'event')
  assert.equal(shared.setRoomTodoCompleted(original, event.id, true, at(3)), original)
})

test('shared plans: activity start reopens only my todo', () => {
  const original = room()
  const reopened = shared.setRoomTodoCompleted(original, 'shared-morning-1', false, at(4))
  assert.equal(reopened.sharedItems[0].completedMemberIds.includes('me'), false)
  assert.equal(reopened.sharedItems[1], original.sharedItems[1])
  assert.equal(reopened.sharedItems[0].completedMemberIds.includes('member-1'), true)
})

test('shared plans: missing plan or current member is a no-op', () => {
  const original = room()
  assert.equal(shared.toggleRoomSharedItemStatus(original, 'missing', at(2)), original)
  const noMe = { ...original, members: [] }
  assert.equal(shared.setRoomTodoCompleted(noMe, original.sharedItems[0].id, true, at(2)), noMe)
})

test('shared plans: joined rooms and per-plan permissions drive inline details', () => {
  const rooms = normalizeStudyRooms(createInitialStudyRooms())
  const original = rooms[0]
  const ownPlan = original.sharedItems[0]
  assert.equal(shared.canManageSharedItem(original, ownPlan, original.ownerId), true)
  assert.equal(shared.canManageSharedItem(original, ownPlan, original.managerIds[0]), true)
  assert.equal(shared.canManageSharedItem(original, ownPlan, 'member-5'), false)
  const entries = shared.getSharedItemEntries(rooms)
  assert.equal(entries.length, original.sharedItems.length)
  assert.equal(entries[0].item, ownPlan)
  assert.equal(entries[0].memberId, 'me')
})

test('calendar: date shifts cross month, year and leap-day boundaries', () => {
  assert.equal(calendar.shiftDateKey('2026-12-31', 1), '2027-01-01')
  assert.equal(calendar.shiftDateKey('2024-03-01', -1), '2024-02-29')
  assert.equal(calendar.getDayNumber('2026-03-09') - calendar.getDayNumber('2026-03-08'), 1)
  assert.equal(calendar.dateKeyFromDayNumber(calendar.getDayNumber('2026-09-22')), '2026-09-22')
})

test('calendar: moving a selected block retains relative dates and times', () => {
  assert.deepEqual(calendar.shiftDateTime('2026-09-22', '23:30', '2026-09-22', 23 * 60, '2026-12-31', 23 * 60 + 45), {
    date: '2027-01-01', time: '00:15',
  })
  assert.deepEqual(calendar.shiftDateTime('2026-09-22', '08:30', '2026-09-22', 9 * 60, '2027-01-01', 0), {
    date: '2026-12-31', time: '23:30',
  })
})

test('calendar: time slots and display formatting use the same units', () => {
  assert.deepEqual(calendar.parseTimeSlotKey(calendar.getTimeSlotKey('2026-09-22', 390)), { dateKey: '2026-09-22', startMinutes: 390 })
  assert.equal(calendar.parseTime(calendar.formatMinutes(390)), 390)
  assert.equal(calendar.TIME_SLOT_MINUTES, 30)
  assert.deepEqual(calendar.sortDateKeys('2026-09-24', '2026-09-22'), ['2026-09-22', '2026-09-24'])
  assert.equal(calendar.formatRangeLabel('2026-09-30', '2026-10-02'), '9월 30일–10월 2일')
})

test('colors: RGB/HSV round trips preserve preset and grayscale colors', () => {
  for (const hex of ['#000000', '#ffffff', '#808080', '#2563eb', '#d65c4a', '#2f7d5a', '#7c3aed']) {
    const rgb = color.hexToRgb(hex)
    const hsv = color.rgbToHsv(...rgb)
    assert.equal(color.rgbToHex(...rgb), hex)
    assert.equal(color.hsvToHex(hsv.hue, hsv.saturation, hsv.value), hex)
  }
  assert.equal(color.rgbToHex(-1, 300, 0), '#00ff00')
})

test('storage: existing keys, legacy migrations and malformed JSON remain compatible', (t) => {
  const values = new Map()
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key) => values.get(key) ?? null },
  })
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
    else delete globalThis.localStorage
  })
  values.set(storage.TODO_STORAGE_KEY, JSON.stringify(createInitialTodos().map((todo) => ({ ...todo, project: '백로그' }))))
  values.set(storage.EVENT_STORAGE_KEY, JSON.stringify(createInitialEvents().map((event) => ({ ...event, project: '받은 편지함' }))))
  assert.equal(storage.TODO_STORAGE_KEY, 'haru.v2.todos')
  assert.equal(storage.readTodos()[0].project, '미분류')
  assert.equal(storage.readEvents()[0].project, '미분류')
  const rooms = normalizeStudyRooms(createInitialStudyRooms())
  values.set(storage.STUDY_STORAGE_KEY, JSON.stringify(rooms))
  assert.deepEqual(storage.readStudyRooms(), rooms)
  values.set(storage.FOCUS_RECORD_STORAGE_KEY, JSON.stringify([record({ segments: undefined }), { id: 'invalid' }]))
  assert.equal(storage.readFocusRecords().length, 1)
  values.set(storage.TODO_STORAGE_KEY, '{invalid JSON')
  assert.equal(storage.readTodos().length, createInitialTodos().length)
})
