import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import DateJumpDialog from '../components/DateJumpDialog'
import CalendarTimeGrid from '../components/CalendarTimeGrid'
import PlanEditorModal from '../components/PlanEditorModal'
import type {
  CalendarEvent,
  CalendarEventInput,
  Todo,
  TodoInput,
} from '../data/initialData'
import { toDateKey } from '../data/initialData'
import {
  BACKLOG_PROJECT_NAME,
  getProjectColorByName,
  isBacklogProject,
  type CalendarTodoVisibility,
  type PlannerProject,
  type ProjectFilter,
} from '../data/projects'
import type {
  StudyRoom,
  StudySharedItemEntry,
  StudySharedItemInput,
} from '../data/studyRooms'
import {
  formatSelectedDate,
  getCalendarDays,
  getWeekDays,
  isCalendarEventOnDate,
  isTodoOnDate,
  moveDate,
} from '../lib/date'
import { isSharedItemOnDate } from '../lib/studyShared'

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']

type CalendarView = 'day' | 'week' | 'month'

type CalendarClipboard = {
  mode: 'copy' | 'cut'
  sourceStartKey: string
  sourceStartMinutes?: number
  events: CalendarEvent[]
  todos: Todo[]
}

type SelectionSurface = CalendarView

type RangeGesture = {
  pointerId: number
  pointerType: string
  startX: number
  startY: number
  surface: SelectionSurface
  container: HTMLDivElement
}

type SelectedTimeRange = {
  startMinutes: number
  endMinutes: number
}

const viewLabels: Record<CalendarView, string> = {
  day: '일간',
  week: '주간',
  month: '월간',
}

const formatShortDate = (date: Date) =>
  `${date.getMonth() + 1}월 ${date.getDate()}일`

const formatWeekTitle = (weekDays: Date[]) => {
  const start = weekDays[0]
  const end = weekDays[weekDays.length - 1]
  return `${start.getFullYear()}년 ${formatShortDate(start)} – ${formatShortDate(end)}`
}

const toLocalDate = (dateKey: string) => new Date(`${dateKey}T00:00:00`)

const sortDateKeys = (first: string, second: string) =>
  first <= second ? [first, second] : [second, first]

const getDayNumber = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return Math.round(Date.UTC(year, month - 1, day) / 86_400_000)
}

const shiftDateKey = (dateKey: string, offset: number) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + offset))
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`
}

const formatRangeLabel = (startKey: string, endKey: string) => {
  const [start, end] = sortDateKeys(startKey, endKey)
  const startDate = toLocalDate(start)
  const endDate = toLocalDate(end)
  const startLabel = `${startDate.getMonth() + 1}월 ${startDate.getDate()}일`
  if (start === end) return startLabel
  const endLabel =
    startDate.getMonth() === endDate.getMonth()
      ? `${endDate.getDate()}일`
      : `${endDate.getMonth() + 1}월 ${endDate.getDate()}일`
  return `${startLabel}–${endLabel}`
}

const formatMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(
    minutes % 60,
  ).padStart(2, '0')}`

const parseTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

const dateKeyFromDayNumber = (dayNumber: number) => {
  const date = new Date(dayNumber * 86_400_000)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getUTCDate()).padStart(2, '0')}`
}

const shiftDateTime = (
  dateKey: string,
  time: string,
  sourceStartKey: string,
  sourceStartMinutes: number,
  targetStartKey: string,
  targetStartMinutes: number,
) => {
  const relativeMinutes =
    (getDayNumber(dateKey) - getDayNumber(sourceStartKey)) * 1_440 +
    parseTime(time) -
    sourceStartMinutes
  const targetAbsoluteMinutes =
    getDayNumber(targetStartKey) * 1_440 +
    targetStartMinutes +
    relativeMinutes
  const targetDayNumber = Math.floor(targetAbsoluteMinutes / 1_440)
  const targetMinutes =
    ((targetAbsoluteMinutes % 1_440) + 1_440) % 1_440
  return {
    date: dateKeyFromDayNumber(targetDayNumber),
    time: formatMinutes(targetMinutes),
  }
}

const TIME_GRID_START_MINUTES = 6 * 60
const TIME_GRID_END_MINUTES = 24 * 60
const TIME_SLOT_MINUTES = 30

const getTimeSlotKey = (dateKey: string, startMinutes: number) =>
  `${dateKey}:${startMinutes}`

const parseTimeSlotKey = (slotKey: string) => {
  const separatorIndex = slotKey.lastIndexOf(':')
  return {
    dateKey: slotKey.slice(0, separatorIndex),
    startMinutes: Number(slotKey.slice(separatorIndex + 1)),
  }
}

type CalendarPageProps = {
  today: Date
  selectedDate: Date
  visibleMonth: Date
  events: CalendarEvent[]
  todos: Todo[]
  projects: PlannerProject[]
  calendarTodoVisibility: CalendarTodoVisibility
  studyRooms: StudyRoom[]
  sharedItems: StudySharedItemEntry[]
  onSelectDate: (date: Date) => void
  onMoveMonth: (amount: number) => void
  onSelectToday: () => void
  onAddEvent: (event: CalendarEventInput) => void
  onAddTodo: (todo: TodoInput) => void
  onUpdateEvent: (eventId: string, event: CalendarEventInput) => void
  onRemoveEvent: (eventId: string) => void
  onRemoveTodo: (todoId: string) => void
  onChangeRoom: (
    roomId: string,
    update: (current: StudyRoom) => StudyRoom,
  ) => void
}

export default function CalendarPage({
  today,
  selectedDate,
  visibleMonth,
  events,
  todos,
  projects,
  calendarTodoVisibility,
  studyRooms,
  sharedItems,
  onSelectDate,
  onMoveMonth,
  onSelectToday,
  onAddEvent,
  onAddTodo,
  onUpdateEvent,
  onRemoveEvent,
  onRemoveTodo,
  onChangeRoom,
}: CalendarPageProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedProjectId = (searchParams.get('project') ??
    'all') as ProjectFilter
  const [calendarView, setCalendarView] = useState<CalendarView>('month')
  const [isDateJumpOpen, setIsDateJumpOpen] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editorDate, setEditorDate] = useState(selectedDate)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent>()
  const [editingSharedEvent, setEditingSharedEvent] =
    useState<StudySharedItemEntry>()
  const [rangeStartKey, setRangeStartKey] = useState<string>()
  const [rangeEndKey, setRangeEndKey] = useState<string>()
  const [isBlockSelectionMode, setIsBlockSelectionMode] = useState(false)
  const [isRangeDragging, setIsRangeDragging] = useState(false)
  const [selectionSurface, setSelectionSurface] =
    useState<SelectionSurface>()
  const [selectedPlanKeys, setSelectedPlanKeys] = useState<Set<string>>(
    new Set(),
  )
  const [selectedDateKeys, setSelectedDateKeys] = useState<string[]>([])
  const [selectedTimeSlotKeys, setSelectedTimeSlotKeys] = useState<Set<string>>(
    new Set(),
  )
  const [selectedTimeRange, setSelectedTimeRange] =
    useState<SelectedTimeRange>()
  const [calendarClipboard, setCalendarClipboard] =
    useState<CalendarClipboard>()
  const [rangeNotice, setRangeNotice] = useState('')
  const [bulkCreateDateKeys, setBulkCreateDateKeys] = useState<string[]>([])
  const [bulkCreateTimeRange, setBulkCreateTimeRange] =
    useState<SelectedTimeRange>()
  const [isRangeDeleteConfirming, setIsRangeDeleteConfirming] =
    useState(false)
  const dateJumpTriggerRef = useRef<HTMLButtonElement>(null)
  const monthGridRef = useRef<HTMLDivElement>(null)
  const weekGridRef = useRef<HTMLDivElement>(null)
  const dayGridRef = useRef<HTMLDivElement>(null)
  const rangeGestureRef = useRef<RangeGesture | undefined>(undefined)
  const selectedDateKeysRef = useRef<string[]>([])
  const selectedTimeSlotKeysRef = useRef<Set<string>>(new Set())
  const dragBaseDateKeysRef = useRef<Set<string>>(new Set())
  const dragBaseTimeSlotKeysRef = useRef<Set<string>>(new Set())
  const longPressTimerRef = useRef<number | undefined>(undefined)
  const isRangeDraggingRef = useRef(false)
  const suppressDayClickRef = useRef(false)
  const selectedKey = toDateKey(selectedDate)
  const todayKey = toDateKey(today)
  const calendarDays = useMemo(
    () => getCalendarDays(visibleMonth),
    [visibleMonth],
  )
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate])
  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  )
  const isBacklogEvent = (event: CalendarEvent) =>
    isBacklogProject(event.project)
  const filteredEvents = useMemo(() => {
    if (selectedProjectId === 'all') return events
    if (selectedProjectId === 'backlog') return events.filter(isBacklogEvent)
    const project = projects.find((item) => item.id === selectedProjectId)
    return project
      ? events.filter((event) => event.project === project.name)
      : events
  }, [events, projects, selectedProjectId])
  const enabledCalendarTodos = useMemo(
    () =>
      todos.filter((todo) => {
        if (isBacklogProject(todo.project)) {
          return Boolean(calendarTodoVisibility.backlog)
        }
        const project = projects.find((item) => item.name === todo.project)
        return project
          ? Boolean(calendarTodoVisibility[project.id])
          : false
      }),
    [calendarTodoVisibility, projects, todos],
  )
  const filteredTodos = useMemo(() => {
    if (selectedProjectId === 'all') return enabledCalendarTodos
    if (selectedProjectId === 'backlog') {
      return enabledCalendarTodos.filter((todo) =>
        isBacklogProject(todo.project),
      )
    }
    const project = projects.find((item) => item.id === selectedProjectId)
    return project
      ? enabledCalendarTodos.filter((todo) => todo.project === project.name)
      : enabledCalendarTodos
  }, [enabledCalendarTodos, projects, selectedProjectId])
  const selectedRange = useMemo(() => {
    if (!rangeStartKey) return undefined
    const [startKey, endKey] = sortDateKeys(
      rangeStartKey,
      rangeEndKey ?? rangeStartKey,
    )
    return { startKey, endKey }
  }, [rangeEndKey, rangeStartKey])
  const selectedPersonalEvents = useMemo(
    () =>
      filteredEvents.filter((event) =>
        selectedPlanKeys.has(`event:${event.id}`),
      ),
    [filteredEvents, selectedPlanKeys],
  )
  const selectedPersonalTodos = useMemo(
    () =>
      filteredTodos.filter((todo) =>
        selectedPlanKeys.has(`todo:${todo.id}`),
      ),
    [filteredTodos, selectedPlanKeys],
  )
  const selectedPersonalPlanCount =
    selectedPersonalEvents.length + selectedPersonalTodos.length
  const cutPlanKeys = useMemo(() => {
    if (calendarClipboard?.mode !== 'cut') return new Set<string>()
    return new Set([
      ...calendarClipboard.events.map((event) => `event:${event.id}`),
      ...calendarClipboard.todos.map((todo) => `todo:${todo.id}`),
    ])
  }, [calendarClipboard])
  const selectedRangeDayCount = selectedDateKeys.length
  const participatingSharedEvents = useMemo(
    () =>
      sharedItems.filter(
        ({ item, memberId }) =>
          item.type === 'event' &&
          item.participantMemberIds.includes(memberId),
      ),
    [sharedItems],
  )
  const visibleSharedEvents = useMemo(
    () =>
      selectedProjectId === 'all'
        ? participatingSharedEvents
        : [],
    [participatingSharedEvents, selectedProjectId],
  )
  const selectedProjectName =
    selectedProject?.name ??
    (selectedProjectId === 'backlog'
      ? BACKLOG_PROJECT_NAME
      : '모든 목록')
  const getEventProjectStyle = (projectName?: string) =>
    ({
      '--project-color': getProjectColorByName(projects, projectName),
    }) as CSSProperties
  const periodTitle =
    calendarView === 'day'
      ? formatSelectedDate(selectedDate)
      : calendarView === 'week'
        ? formatWeekTitle(weekDays)
        : `${visibleMonth.getFullYear()}년 ${visibleMonth.getMonth() + 1}월`

  const movePeriod = (amount: number) => {
    setRangeNotice(
      calendarClipboard
        ? '붙여넣을 날짜를 선택하세요.'
        : isBlockSelectionMode
          ? '선택 모드가 유지되고 있어요.'
          : '',
    )
    if (calendarView === 'month') {
      const nextMonth = new Date(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth() + amount,
        1,
      )
      onMoveMonth(amount)
      onSelectDate(nextMonth)
      return
    }
    onSelectDate(
      moveDate(selectedDate, calendarView === 'week' ? amount * 7 : amount),
    )
  }

  const closeDateJump = () => {
    setIsDateJumpOpen(false)
    window.requestAnimationFrame(() => dateJumpTriggerRef.current?.focus())
  }

  const jumpToDate = (date: Date) => {
    onSelectDate(date)
    closeDateJump()
  }

  const openDayView = (date: Date) => {
    onSelectDate(date)
    setCalendarView('day')
  }

  const closeEditor = () => {
    setIsEditorOpen(false)
    setEditingEvent(undefined)
    setEditingSharedEvent(undefined)
    setBulkCreateDateKeys([])
    setBulkCreateTimeRange(undefined)
  }

  const openNewEvent = (
    date = selectedDate,
    targetDateKeys: string[] = [],
    targetTimeRange?: SelectedTimeRange,
  ) => {
    onSelectDate(date)
    setEditorDate(date)
    setEditingEvent(undefined)
    setEditingSharedEvent(undefined)
    setBulkCreateDateKeys(targetDateKeys)
    setBulkCreateTimeRange(targetTimeRange)
    setIsEditorOpen(true)
  }

  const openEditEvent = (event: CalendarEvent, occurrenceDate?: Date) => {
    if (occurrenceDate) onSelectDate(occurrenceDate)
    setEditorDate(occurrenceDate ?? new Date(`${event.date}T00:00:00`))
    setEditingEvent(event)
    setEditingSharedEvent(undefined)
    setIsEditorOpen(true)
  }

  const openEditSharedEvent = (
    entry: StudySharedItemEntry,
    occurrenceDate?: Date,
  ) => {
    if (!entry.canManage) return
    if (occurrenceDate) onSelectDate(occurrenceDate)
    setEditorDate(occurrenceDate ?? new Date(`${entry.item.date}T00:00:00`))
    setEditingEvent(undefined)
    setEditingSharedEvent(entry)
    setIsEditorOpen(true)
  }

  const updateSharedEvent = (input: StudySharedItemInput) => {
    if (!editingSharedEvent) return
    onChangeRoom(editingSharedEvent.roomId, (room) => ({
      ...room,
      sharedItems: room.sharedItems.map((item) =>
        item.id === editingSharedEvent.item.id ? { ...item, ...input } : item,
      ),
    }))
    closeEditor()
  }

  const removeSharedEvent = () => {
    if (!editingSharedEvent) return
    onChangeRoom(editingSharedEvent.roomId, (room) => ({
      ...room,
      sharedItems: room.sharedItems.filter(
        (item) => item.id !== editingSharedEvent.item.id,
      ),
    }))
    closeEditor()
  }

  const cancelLongPress = () => {
    if (longPressTimerRef.current !== undefined) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = undefined
    }
  }

  const syncSelectedDates = (dateKeys: Iterable<string>) => {
    const nextDateKeys = Array.from(new Set(dateKeys)).sort()
    selectedDateKeysRef.current = nextDateKeys
    setSelectedDateKeys(nextDateKeys)
    setRangeStartKey(nextDateKeys[0])
    setRangeEndKey(nextDateKeys[nextDateKeys.length - 1])
    return nextDateKeys
  }

  const getPlanKeysForDates = (dateKeys: string[]) => {
    const planKeys = new Set<string>()
    filteredEvents.forEach((event) => {
      if (
        (event.repeat ?? 'none') === 'none' &&
        dateKeys.some((dateKey) => isCalendarEventOnDate(event, dateKey))
      ) {
        planKeys.add(`event:${event.id}`)
      }
    })
    filteredTodos.forEach((todo) => {
      if (
        (todo.repeat ?? 'none') === 'none' &&
        dateKeys.some((dateKey) => isTodoOnDate(todo, dateKey))
      ) {
        planKeys.add(`todo:${todo.id}`)
      }
    })
    return planKeys
  }

  const getPlanKeysForTimeSlots = (slotKeys: Set<string>) => {
    const slots = Array.from(slotKeys, parseTimeSlotKey)
    const planKeys = new Set<string>()
    filteredEvents.forEach((event) => {
      if ((event.repeat ?? 'none') !== 'none') return
      const eventStart = event.allDay
        ? TIME_GRID_START_MINUTES
        : parseTime(event.startTime)
      const eventEnd = event.allDay
        ? TIME_GRID_START_MINUTES + 60
        : Math.max(parseTime(event.endTime), eventStart + TIME_SLOT_MINUTES)
      if (
        slots.some(
          ({ dateKey, startMinutes }) =>
            isCalendarEventOnDate(event, dateKey) &&
            eventStart < startMinutes + TIME_SLOT_MINUTES &&
            eventEnd > startMinutes,
        )
      ) {
        planKeys.add(`event:${event.id}`)
      }
    })
    filteredTodos.forEach((todo) => {
      if ((todo.repeat ?? 'none') !== 'none') return
      const todoStart = parseTime(todo.dueTime)
      if (
        slots.some(
          ({ dateKey, startMinutes }) =>
            isTodoOnDate(todo, dateKey) &&
            todoStart < startMinutes + TIME_SLOT_MINUTES &&
            todoStart + TIME_SLOT_MINUTES > startMinutes,
        )
      ) {
        planKeys.add(`todo:${todo.id}`)
      }
    })
    return planKeys
  }

  const applySelectedDates = (dateKeys: Set<string>) => {
    const nextDateKeys = syncSelectedDates(dateKeys)
    selectedTimeSlotKeysRef.current = new Set()
    setSelectedTimeSlotKeys(new Set())
    setSelectedTimeRange(undefined)
    const nextPlanKeys = getPlanKeysForDates(nextDateKeys)
    setSelectedPlanKeys(nextPlanKeys)
    setRangeNotice(
      nextDateKeys.length
        ? `${nextDateKeys.length}개 날짜 블록 · 개인 계획 ${nextPlanKeys.size}개`
        : '날짜 블록을 클릭하거나 드래그해 추가하세요.',
    )
  }

  const applySelectedTimeSlots = (slotKeys: Set<string>) => {
    const nextSlotKeys = new Set(slotKeys)
    selectedTimeSlotKeysRef.current = nextSlotKeys
    setSelectedTimeSlotKeys(nextSlotKeys)
    const slots = Array.from(nextSlotKeys, parseTimeSlotKey)
    const nextDateKeys = syncSelectedDates(slots.map((slot) => slot.dateKey))
    if (slots.length) {
      const startMinutes = Math.min(...slots.map((slot) => slot.startMinutes))
      const endMinutes =
        Math.max(...slots.map((slot) => slot.startMinutes)) + TIME_SLOT_MINUTES
      setSelectedTimeRange({ startMinutes, endMinutes })
    } else {
      setSelectedTimeRange(undefined)
    }
    const nextPlanKeys = getPlanKeysForTimeSlots(nextSlotKeys)
    setSelectedPlanKeys(nextPlanKeys)
    setRangeNotice(
      slots.length
        ? `${slots.length}개 시간 블록 · ${nextDateKeys.length}일 · 개인 계획 ${nextPlanKeys.size}개`
        : '30분 시간 블록을 클릭하거나 드래그해 추가하세요.',
    )
  }

  const toggleTimeInterval = (
    date: Date,
    startTime: string | undefined,
    endTime?: string,
  ) => {
    const startMinutes = Math.max(
      TIME_GRID_START_MINUTES,
      startTime ? parseTime(startTime) : TIME_GRID_START_MINUTES,
    )
    const endMinutes = Math.min(
      TIME_GRID_END_MINUTES,
      Math.max(
        endTime ? parseTime(endTime) : startMinutes + TIME_SLOT_MINUTES,
        startMinutes + TIME_SLOT_MINUTES,
      ),
    )
    const dateKey = toDateKey(date)
    const intervalKeys: string[] = []
    for (
      let minutes =
        Math.floor(startMinutes / TIME_SLOT_MINUTES) * TIME_SLOT_MINUTES;
      minutes < endMinutes;
      minutes += TIME_SLOT_MINUTES
    ) {
      intervalKeys.push(getTimeSlotKey(dateKey, minutes))
    }
    const nextSlotKeys = new Set(selectedTimeSlotKeysRef.current)
    const removeInterval = intervalKeys.every((key) => nextSlotKeys.has(key))
    intervalKeys.forEach((key) => {
      if (removeInterval) nextSlotKeys.delete(key)
      else nextSlotKeys.add(key)
    })
    setIsBlockSelectionMode(true)
    applySelectedTimeSlots(nextSlotKeys)
  }

  const getBlockAtPoint = (
    gesture: RangeGesture,
    clientX: number,
    clientY: number,
  ) => {
    if (gesture.surface === 'month') {
      const dateElement = document
        .elementsFromPoint(clientX, clientY)
        .map((element) => element.closest<HTMLElement>('.calendar-day'))
        .find(
          (element) =>
            element &&
            gesture.container.contains(element) &&
            element.dataset.calendarDate,
        )
      const dateKey = dateElement?.dataset.calendarDate
      return dateKey ? { kind: 'date' as const, key: dateKey } : undefined
    }

    const containerRect = gesture.container.getBoundingClientRect()
    if (
      clientX < containerRect.left ||
      clientX >= containerRect.right ||
      clientY < containerRect.top ||
      clientY >= containerRect.bottom
    ) {
      return undefined
    }
    const dates = gesture.surface === 'week' ? weekDays : [selectedDate]
    const dayIndex = Math.min(
      dates.length - 1,
      Math.floor(
        ((clientX - containerRect.left) / containerRect.width) * dates.length,
      ),
    )
    const startMinutes = Math.min(
      TIME_GRID_END_MINUTES - TIME_SLOT_MINUTES,
      TIME_GRID_START_MINUTES +
        Math.floor((clientY - containerRect.top) / TIME_SLOT_MINUTES) *
          TIME_SLOT_MINUTES,
    )
    return {
      kind: 'time' as const,
      key: getTimeSlotKey(toDateKey(dates[dayIndex]), startMinutes),
    }
  }

  const applyBlockRange = (
    gesture: RangeGesture,
    clientX: number,
    clientY: number,
  ) => {
    const startBlock = getBlockAtPoint(
      gesture,
      gesture.startX,
      gesture.startY,
    )
    const endBlock = getBlockAtPoint(gesture, clientX, clientY)
    if (!startBlock || !endBlock || startBlock.kind !== endBlock.kind) return

    if (startBlock.kind === 'date' && endBlock.kind === 'date') {
      const nextDateKeys = new Set(dragBaseDateKeysRef.current)
      const startDay = getDayNumber(startBlock.key)
      const endDay = getDayNumber(endBlock.key)
      const firstDay = Math.min(startDay, endDay)
      const lastDay = Math.max(startDay, endDay)
      for (let day = firstDay; day <= lastDay; day += 1) {
        nextDateKeys.add(dateKeyFromDayNumber(day))
      }
      applySelectedDates(nextDateKeys)
      return
    }

    if (startBlock.kind === 'time' && endBlock.kind === 'time') {
      const startSlot = parseTimeSlotKey(startBlock.key)
      const endSlot = parseTimeSlotKey(endBlock.key)
      const dates = gesture.surface === 'week' ? weekDays : [selectedDate]
      const dateKeys = dates.map(toDateKey)
      const startDateIndex = dateKeys.indexOf(startSlot.dateKey)
      const endDateIndex = dateKeys.indexOf(endSlot.dateKey)
      if (startDateIndex < 0 || endDateIndex < 0) return
      const firstDateIndex = Math.min(startDateIndex, endDateIndex)
      const lastDateIndex = Math.max(startDateIndex, endDateIndex)
      const firstMinutes = Math.min(
        startSlot.startMinutes,
        endSlot.startMinutes,
      )
      const lastMinutes = Math.max(
        startSlot.startMinutes,
        endSlot.startMinutes,
      )
      const nextSlotKeys = new Set(dragBaseTimeSlotKeysRef.current)
      for (
        let dateIndex = firstDateIndex;
        dateIndex <= lastDateIndex;
        dateIndex += 1
      ) {
        for (
          let minutes = firstMinutes;
          minutes <= lastMinutes;
          minutes += TIME_SLOT_MINUTES
        ) {
          nextSlotKeys.add(getTimeSlotKey(dateKeys[dateIndex], minutes))
        }
      }
      applySelectedTimeSlots(nextSlotKeys)
    }
  }

  const toggleBlockAtPoint = (
    gesture: RangeGesture,
    clientX: number,
    clientY: number,
  ) => {
    const block = getBlockAtPoint(gesture, clientX, clientY)
    if (!block) return
    setIsBlockSelectionMode(true)
    setSelectionSurface(gesture.surface)
    if (block.kind === 'date') {
      const nextDateKeys = new Set(selectedDateKeysRef.current)
      if (nextDateKeys.has(block.key)) nextDateKeys.delete(block.key)
      else nextDateKeys.add(block.key)
      applySelectedDates(nextDateKeys)
      return
    }
    const nextSlotKeys = new Set(selectedTimeSlotKeysRef.current)
    if (nextSlotKeys.has(block.key)) nextSlotKeys.delete(block.key)
    else nextSlotKeys.add(block.key)
    applySelectedTimeSlots(nextSlotKeys)
  }

  const clearRangeSelection = () => {
    setRangeStartKey(undefined)
    setRangeEndKey(undefined)
    setIsBlockSelectionMode(false)
    setSelectionSurface(undefined)
    setSelectedPlanKeys(new Set())
    setSelectedDateKeys([])
    selectedDateKeysRef.current = []
    setSelectedTimeSlotKeys(new Set())
    selectedTimeSlotKeysRef.current = new Set()
    setSelectedTimeRange(undefined)
    setIsRangeDeleteConfirming(false)
  }

  const clearBulkContext = () => {
    clearRangeSelection()
    setCalendarClipboard(undefined)
    setRangeNotice('')
  }

  const cancelSelectionOrClipboard = () => {
    if (isBlockSelectionMode || selectedRange) {
      clearRangeSelection()
      setRangeNotice(
        calendarClipboard
          ? '현재 선택만 해제했어요. 붙여넣기는 계속 사용할 수 있어요.'
          : '',
      )
      return
    }
    clearBulkContext()
  }

  const beginRangeSelection = (gesture: RangeGesture) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    setIsBlockSelectionMode(true)
    isRangeDraggingRef.current = true
    setIsRangeDragging(true)
    setSelectionSurface(gesture.surface)
    dragBaseDateKeysRef.current = new Set(selectedDateKeysRef.current)
    dragBaseTimeSlotKeysRef.current = new Set(
      selectedTimeSlotKeysRef.current,
    )
    setIsRangeDeleteConfirming(false)
    setRangeNotice(
      gesture.surface === 'month'
        ? '지나간 날짜 블록을 선택에 추가하고 있어요.'
        : '지나간 30분 블록을 선택에 추가하고 있어요.',
    )
    applyBlockRange(gesture, gesture.startX, gesture.startY)
    document.body.classList.add('calendar-range-dragging')
  }

  const handleRangePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    surface: SelectionSurface,
  ) => {
    if (event.button !== 0) return
    cancelLongPress()
    rangeGestureRef.current = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      surface,
      container: event.currentTarget,
    }

    if (event.pointerType === 'touch') {
      longPressTimerRef.current = window.setTimeout(() => {
        const gesture = rangeGestureRef.current
        if (!gesture || gesture.pointerId !== event.pointerId) return
        beginRangeSelection(gesture)
        gesture.container.setPointerCapture(event.pointerId)
        navigator.vibrate?.(18)
      }, 280)
      return
    }
  }

  const handleRangePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const gesture = rangeGestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    const distance = Math.hypot(
      event.clientX - gesture.startX,
      event.clientY - gesture.startY,
    )

    if (!isRangeDraggingRef.current) {
      if (gesture.pointerType === 'touch') {
        if (distance > 10) {
          cancelLongPress()
          rangeGestureRef.current = undefined
        }
        return
      }
      if (distance < 5) return
      beginRangeSelection(gesture)
      gesture.container.setPointerCapture(event.pointerId)
    }

    event.preventDefault()
    applyBlockRange(gesture, event.clientX, event.clientY)

    if (gesture.pointerType === 'touch') {
      const edgeSize = 64
      if (event.clientY < edgeSize) window.scrollBy(0, -12)
      if (event.clientY > window.innerHeight - edgeSize) window.scrollBy(0, 12)
    }
  }

  const finishRangeGesture = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const gesture = rangeGestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    cancelLongPress()

    if (isRangeDraggingRef.current) {
      suppressDayClickRef.current = true
      window.setTimeout(() => {
        suppressDayClickRef.current = false
      })
      isRangeDraggingRef.current = false
      setIsRangeDragging(false)
      document.body.classList.remove('calendar-range-dragging')
      event.preventDefault()
    } else if (isBlockSelectionMode || calendarClipboard) {
      suppressDayClickRef.current = true
      window.setTimeout(() => {
        suppressDayClickRef.current = false
      })
      toggleBlockAtPoint(gesture, event.clientX, event.clientY)
      event.preventDefault()
    }

    rangeGestureRef.current = undefined

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const cancelRangeGesture = () => {
    cancelLongPress()
    rangeGestureRef.current = undefined
    isRangeDraggingRef.current = false
    setIsRangeDragging(false)
    document.body.classList.remove('calendar-range-dragging')
  }

  const handleMonthDayClick = (
    event: ReactMouseEvent<HTMLButtonElement>,
    date: Date,
  ) => {
    if (suppressDayClickRef.current) {
      event.preventDefault()
      return
    }
    const dateKey = toDateKey(date)
    if (isBlockSelectionMode) {
      const nextDateKeys = new Set(selectedDateKeysRef.current)
      if (nextDateKeys.has(dateKey)) nextDateKeys.delete(dateKey)
      else nextDateKeys.add(dateKey)
      applySelectedDates(nextDateKeys)
      return
    }
    if (calendarClipboard) {
      applySelectedDates(new Set([dateKey]))
      setRangeNotice('이 날짜를 기준으로 붙여넣을 수 있어요.')
      setIsRangeDeleteConfirming(false)
      onSelectDate(date)
      return
    }
    clearRangeSelection()
    onSelectDate(date)
  }

  const handleMonthPlanClick = (
    event: ReactMouseEvent<HTMLButtonElement>,
    date: Date,
    openPlan: () => void,
  ) => {
    if (calendarClipboard) {
      event.preventDefault()
      event.stopPropagation()
      handleMonthDayClick(event, date)
      return
    }
    if (isBlockSelectionMode) {
      event.preventDefault()
      event.stopPropagation()
      const dateKey = toDateKey(date)
      const nextDateKeys = new Set(selectedDateKeysRef.current)
      if (nextDateKeys.has(dateKey)) nextDateKeys.delete(dateKey)
      else nextDateKeys.add(dateKey)
      applySelectedDates(nextDateKeys)
      return
    }
    openPlan()
  }

  const storeSelectedPlans = (mode: CalendarClipboard['mode']) => {
    if (!selectedRange || !selectedPersonalPlanCount) return
    setCalendarClipboard({
      mode,
      sourceStartKey: selectedRange.startKey,
      sourceStartMinutes: selectedTimeRange?.startMinutes,
      events: selectedPersonalEvents.map((event) => ({ ...event })),
      todos: selectedPersonalTodos.map((todo) => ({ ...todo })),
    })
    clearRangeSelection()
    setRangeNotice(
      `${selectedPersonalPlanCount}개를 ${mode === 'copy' ? '복사했어요.' : '잘라낼 준비를 했어요.'} 붙여넣을 날짜 또는 시간 영역을 선택하세요.`,
    )
  }

  const pasteStoredPlans = () => {
    if (!calendarClipboard || !selectedRange) return
    const targetStartKey = selectedRange.startKey

    calendarClipboard.events.forEach((event) => {
      const { id, time, ...input } = event
      void id
      void time
      const shiftedStart =
        calendarClipboard.sourceStartMinutes !== undefined &&
        selectedTimeRange
          ? shiftDateTime(
              event.date,
              event.startTime,
              calendarClipboard.sourceStartKey,
              calendarClipboard.sourceStartMinutes,
              targetStartKey,
              selectedTimeRange.startMinutes,
            )
          : undefined
      const duration = Math.max(
        parseTime(event.endTime) - parseTime(event.startTime),
        30,
      )
      onAddEvent({
        ...input,
        date:
          shiftedStart?.date ??
          shiftDateKey(
            targetStartKey,
            getDayNumber(event.date) -
              getDayNumber(calendarClipboard.sourceStartKey),
          ),
        startTime: shiftedStart?.time ?? event.startTime,
        endTime: shiftedStart
          ? formatMinutes(
              Math.min(parseTime(shiftedStart.time) + duration, 23 * 60 + 59),
            )
          : event.endTime,
      })
    })
    calendarClipboard.todos.forEach((todo) => {
      const { id, done, ...input } = todo
      void id
      void done
      const shiftedDue =
        calendarClipboard.sourceStartMinutes !== undefined &&
        selectedTimeRange
          ? shiftDateTime(
              todo.date,
              todo.dueTime,
              calendarClipboard.sourceStartKey,
              calendarClipboard.sourceStartMinutes,
              targetStartKey,
              selectedTimeRange.startMinutes,
            )
          : undefined
      onAddTodo({
        ...input,
        date:
          shiftedDue?.date ??
          shiftDateKey(
            targetStartKey,
            getDayNumber(todo.date) -
              getDayNumber(calendarClipboard.sourceStartKey),
          ),
        dueTime: shiftedDue?.time ?? todo.dueTime,
      })
    })

    if (calendarClipboard.mode === 'cut') {
      calendarClipboard.events.forEach((event) => onRemoveEvent(event.id))
      calendarClipboard.todos.forEach((todo) => onRemoveTodo(todo.id))
      setCalendarClipboard({ ...calendarClipboard, mode: 'copy' })
    }

    const pastedCount =
      calendarClipboard.events.length + calendarClipboard.todos.length
    clearRangeSelection()
    setRangeNotice(
      `${pastedCount}개 계획을 붙여넣었어요. 다른 블록을 선택해 다시 붙여넣을 수 있어요.`,
    )
  }

  const deleteSelectedPlans = () => {
    selectedPersonalEvents.forEach((event) => onRemoveEvent(event.id))
    selectedPersonalTodos.forEach((todo) => onRemoveTodo(todo.id))
    setIsRangeDeleteConfirming(false)
    setRangeNotice(`${selectedPersonalPlanCount}개 계획을 삭제했어요.`)
  }

  const createEventFromSelection = () => {
    const targetDateKeys = selectedDateKeys
    if (!targetDateKeys.length) return
    const date = toLocalDate(targetDateKeys[0])
    const targetTimeRange = selectedTimeRange
    clearRangeSelection()
    openNewEvent(date, targetDateKeys, targetTimeRange)
  }

  useEffect(() => {
    const selectionGrid =
      calendarView === 'month'
        ? monthGridRef.current
        : calendarView === 'week'
          ? weekGridRef.current
          : dayGridRef.current
    if (!selectionGrid) return

    const lockTouchScrollDuringRange = (event: TouchEvent) => {
      if (!isRangeDraggingRef.current) return
      event.preventDefault()
    }

    selectionGrid.addEventListener('touchmove', lockTouchScrollDuringRange, {
      passive: false,
    })
    return () =>
      selectionGrid.removeEventListener('touchmove', lockTouchScrollDuringRange)
  }, [calendarView])

  useEffect(() => {
    const cancelWithEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (isBlockSelectionMode || selectedRange) {
        setRangeStartKey(undefined)
        setRangeEndKey(undefined)
        setIsBlockSelectionMode(false)
        setSelectionSurface(undefined)
        setSelectedPlanKeys(new Set())
        setSelectedDateKeys([])
        selectedDateKeysRef.current = []
        setSelectedTimeSlotKeys(new Set())
        selectedTimeSlotKeysRef.current = new Set()
        setSelectedTimeRange(undefined)
        setIsRangeDeleteConfirming(false)
        setIsRangeDragging(false)
        document.body.classList.remove('calendar-range-dragging')
        setRangeNotice(
          calendarClipboard
            ? '현재 선택만 해제했어요. 붙여넣기는 계속 사용할 수 있어요.'
            : '',
        )
      } else {
        setCalendarClipboard(undefined)
        setRangeNotice('')
      }
    }
    window.addEventListener('keydown', cancelWithEscape)
    return () => window.removeEventListener('keydown', cancelWithEscape)
  }, [calendarClipboard, isBlockSelectionMode, selectedRange])

  useEffect(
    () => () => {
      if (longPressTimerRef.current !== undefined) {
        window.clearTimeout(longPressTimerRef.current)
      }
      document.body.classList.remove('calendar-range-dragging')
    },
    [],
  )

  return (
    <main
      className={`planner calendar-page${
        selectedRange || calendarClipboard ? ' range-mode-active' : ''
      }`}
    >
      <div className="project-filter-content calendar-view-content">
          <header className="calendar-view-toolbar">
            <div>
              <p className="eyebrow">{selectedProjectName}</p>
              <h1>
                <button
                  className="calendar-period-trigger"
                  type="button"
                  ref={dateJumpTriggerRef}
                  aria-haspopup="dialog"
                  aria-expanded={isDateJumpOpen}
                  onClick={() => setIsDateJumpOpen(true)}
                >
                  {periodTitle}
                  <span aria-hidden="true">⌄</span>
                </button>
              </h1>
            </div>
            <div className="calendar-view-actions">
              <div className="calendar-view-tabs" aria-label="캘린더 보기 선택">
                {(Object.keys(viewLabels) as CalendarView[]).map((view) => (
                  <button
                    className={calendarView === view ? 'active' : ''}
                    type="button"
                    key={view}
                    onClick={() => {
                      if (view !== calendarView) {
                        setRangeNotice(
                          calendarClipboard
                            ? '붙여넣을 날짜 또는 시간 영역을 선택하세요.'
                            : isBlockSelectionMode
                              ? '선택 모드가 유지되고 있어요.'
                              : '',
                        )
                      }
                      setCalendarView(view)
                    }}
                    aria-pressed={calendarView === view}
                  >
                    {viewLabels[view]}
                  </button>
                ))}
              </div>
              <button
                className="add-event-button calendar-toolbar-add"
                type="button"
                onClick={() => openNewEvent()}
              >
                <span aria-hidden="true">＋</span> 새 일정
              </button>
              <div className="calendar-period-navigation">
                <button
                  className="today-button"
                  type="button"
                  onClick={onSelectToday}
                >
                  오늘
                </button>
                <div
                  className="month-navigation"
                  aria-label={`${viewLabels[calendarView]} 이동`}
                >
                  <button
                    type="button"
                    onClick={() => movePeriod(-1)}
                    aria-label={`이전 ${viewLabels[calendarView]}`}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => movePeriod(1)}
                    aria-label={`다음 ${viewLabels[calendarView]}`}
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          </header>

          {calendarView === 'day' && (
            <CalendarTimeGrid
              dates={[selectedDate]}
              events={filteredEvents}
              todos={filteredTodos}
              projects={projects}
              sharedItems={visibleSharedEvents}
              selectedPlanKeys={selectedPlanKeys}
              cutPlanKeys={cutPlanKeys}
              selectedTimeSlotKeys={selectedTimeSlotKeys}
              isSelecting={isRangeDragging && selectionSurface === 'day'}
              surfaceRef={dayGridRef}
              onPointerDown={(event) =>
                handleRangePointerDown(event, 'day')
              }
              onPointerMove={handleRangePointerMove}
              onPointerUp={finishRangeGesture}
              onPointerCancel={cancelRangeGesture}
              onOpenEvent={(event, date) => {
                if (suppressDayClickRef.current) return
                if (isBlockSelectionMode) {
                  toggleTimeInterval(
                    date,
                    event.allDay ? undefined : event.startTime,
                    event.allDay ? undefined : event.endTime,
                  )
                  return
                }
                openEditEvent(event, date)
              }}
              onOpenTodo={(todo, date) => {
                if (suppressDayClickRef.current) return
                if (isBlockSelectionMode) {
                  toggleTimeInterval(date, todo.dueTime)
                  return
                }
                navigate(`/todos/${todo.id}`)
              }}
              onOpenShared={(entry, date) => {
                if (suppressDayClickRef.current) return
                if (isBlockSelectionMode) {
                  toggleTimeInterval(
                    date,
                    entry.item.time,
                    entry.item.endTime,
                  )
                  return
                }
                if (entry.canManage) openEditSharedEvent(entry, date)
              }}
            />
          )}

          {calendarView === 'week' && (
            <CalendarTimeGrid
              dates={weekDays}
              events={filteredEvents}
              todos={filteredTodos}
              projects={projects}
              sharedItems={visibleSharedEvents}
              selectedPlanKeys={selectedPlanKeys}
              cutPlanKeys={cutPlanKeys}
              selectedTimeSlotKeys={selectedTimeSlotKeys}
              isSelecting={isRangeDragging && selectionSurface === 'week'}
              surfaceRef={weekGridRef}
              onPointerDown={(event) =>
                handleRangePointerDown(event, 'week')
              }
              onPointerMove={handleRangePointerMove}
              onPointerUp={finishRangeGesture}
              onPointerCancel={cancelRangeGesture}
              onOpenEvent={(event, date) => {
                if (suppressDayClickRef.current) return
                if (isBlockSelectionMode) {
                  toggleTimeInterval(
                    date,
                    event.allDay ? undefined : event.startTime,
                    event.allDay ? undefined : event.endTime,
                  )
                  return
                }
                openEditEvent(event, date)
              }}
              onOpenTodo={(todo, date) => {
                if (suppressDayClickRef.current) return
                if (isBlockSelectionMode) {
                  toggleTimeInterval(date, todo.dueTime)
                  return
                }
                navigate(`/todos/${todo.id}`)
              }}
              onOpenShared={(entry, date) => {
                if (suppressDayClickRef.current) return
                if (isBlockSelectionMode) {
                  toggleTimeInterval(
                    date,
                    entry.item.time,
                    entry.item.endTime,
                  )
                  return
                }
                if (entry.canManage) openEditSharedEvent(entry, date)
                else openDayView(date)
              }}
            />
          )}

          {calendarView === 'month' && (
            <section
              className="calendar-card month-calendar-card"
              aria-label="월간 일정"
            >
              <p className="calendar-range-hint">
                <span aria-hidden="true">⌁</span>
                날짜 칸을 드래그해 선택에 추가하세요. 선택 모드에서는 날짜를
                눌러 개별 선택하거나 해제할 수 있어요.
              </p>
              <div className="calendar-grid weekday-row" aria-hidden="true">
                {weekdayLabels.map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>

              <div
                className={`calendar-grid month-grid calendar-selection-surface${
                  isRangeDragging && selectionSurface === 'month'
                    ? ' selecting'
                    : ''
                }`}
                ref={monthGridRef}
                onPointerDown={(event) =>
                  handleRangePointerDown(event, 'month')
                }
                onPointerMove={handleRangePointerMove}
                onPointerUp={finishRangeGesture}
                onPointerCancel={cancelRangeGesture}
                onContextMenu={(event) => {
                  if (
                    isRangeDragging ||
                    rangeGestureRef.current?.pointerType === 'touch'
                  ) {
                    event.preventDefault()
                  }
                }}
              >
                {calendarDays.map((date) => {
                  const dateKey = toDateKey(date)
                  const dateEvents = filteredEvents.filter((event) =>
                    isCalendarEventOnDate(event, dateKey),
                  )
                  const dateSharedEvents = visibleSharedEvents.filter((entry) =>
                    isSharedItemOnDate(entry.item, dateKey),
                  )
                  const dateTodos = filteredTodos
                    .filter((todo) => isTodoOnDate(todo, dateKey))
                    .sort((first, second) =>
                      first.dueTime.localeCompare(second.dueTime),
                    )
                  const datePlanCount =
                    dateEvents.length +
                    dateTodos.length +
                    dateSharedEvents.length
                  const visibleDateEvents = dateEvents.slice(
                    0,
                    dateTodos.length ? 2 : 3,
                  )
                  const visibleDateTodos = dateTodos.slice(
                    0,
                    Math.max(0, 3 - visibleDateEvents.length),
                  )
                  const visibleSharedEventsForDate = dateSharedEvents.slice(
                    0,
                    Math.max(
                      0,
                      3 - visibleDateEvents.length - visibleDateTodos.length,
                    ),
                  )
                  const isSelected =
                    dateKey === selectedKey &&
                    !selectedRange &&
                    !calendarClipboard
                  const isRangeSelected = selectedDateKeys.includes(dateKey)
                  const isToday = dateKey === todayKey
                  const isCurrentMonth =
                    date.getMonth() === visibleMonth.getMonth()
                  return (
                    <article
                      className={`calendar-day${isSelected ? ' selected' : ''}${
                        isRangeSelected ? ' range-selected' : ''
                      }${isToday ? ' today' : ''}${
                        isCurrentMonth ? '' : ' muted'
                      }`}
                      key={dateKey}
                      data-date-key={dateKey}
                      data-calendar-date={dateKey}
                    >
                      <button
                        className="calendar-day-select"
                        type="button"
                        onClick={(event) => handleMonthDayClick(event, date)}
                        onDoubleClick={() => {
                          if (!isBlockSelectionMode && !calendarClipboard) {
                            openDayView(date)
                          }
                        }}
                        aria-label={`${formatSelectedDate(date)}${
                          datePlanCount ? `, 계획 ${datePlanCount}개` : ''
                        }`}
                        aria-pressed={isSelected || isRangeSelected}
                      >
                        <span className="day-number">{date.getDate()}</span>
                      </button>
                      <span className="day-events">
                        {visibleDateEvents.map((item) => (
                          <button
                            className={`event-chip project-color-surface${
                              selectedPlanKeys.has(`event:${item.id}`)
                                ? ' marquee-selected'
                                : ''
                            }${
                              cutPlanKeys.has(`event:${item.id}`)
                                ? ' cut-pending'
                                : ''
                            }`}
                            data-selectable-plan={
                              (item.repeat ?? 'none') === 'none'
                                ? `event:${item.id}`
                                : undefined
                            }
                            data-calendar-date={dateKey}
                            style={getEventProjectStyle(item.project)}
                            type="button"
                            key={item.id}
                            onClick={(event) =>
                              handleMonthPlanClick(event, date, () =>
                                openEditEvent(item, date),
                              )
                            }
                            aria-label={`${item.title} 편집`}
                          >
                            {item.allDay ? '종일' : item.startTime} {item.title}
                          </button>
                        ))}
                        {visibleDateTodos.map((todo) => (
                          <button
                            className={`event-chip calendar-todo-chip project-color-surface${
                              todo.done ? ' done' : ''
                            }${
                              selectedPlanKeys.has(`todo:${todo.id}`)
                                ? ' marquee-selected'
                                : ''
                            }${
                              cutPlanKeys.has(`todo:${todo.id}`)
                                ? ' cut-pending'
                                : ''
                            }`}
                            data-selectable-plan={
                              (todo.repeat ?? 'none') === 'none'
                                ? `todo:${todo.id}`
                                : undefined
                            }
                            data-calendar-date={dateKey}
                            style={getEventProjectStyle(todo.project)}
                            type="button"
                            key={todo.id}
                            onClick={(event) =>
                              handleMonthPlanClick(event, date, () =>
                                navigate(`/todos/${todo.id}`),
                              )
                            }
                            aria-label={`${todo.text} 할 일 상세 보기`}
                          >
                            <span aria-hidden="true">✓</span>{' '}
                            {todo.dueTime} {todo.text}
                          </button>
                        ))}
                        {visibleSharedEventsForDate.map((entry) => (
                          <button
                            className="event-chip blue shared"
                            type="button"
                            key={`${entry.roomId}-${entry.item.id}`}
                            onClick={(event) =>
                              handleMonthPlanClick(event, date, () =>
                                entry.canManage
                                  ? openEditSharedEvent(entry, date)
                                  : openDayView(date),
                              )
                            }
                            aria-label={
                              entry.canManage
                                ? `${entry.item.title} 편집`
                                : `${entry.item.title}, 일간 보기에서 열기`
                            }
                          >
                            {entry.item.time ?? '종일'} {entry.item.title}
                          </button>
                        ))}
                        {datePlanCount > 3 && (
                          <span className="more-events">+{datePlanCount - 3}</span>
                        )}
                      </span>
                    </article>
                  )
                })}
              </div>
            </section>
          )}

          {isDateJumpOpen && (
            <DateJumpDialog
              initialDate={selectedDate}
              today={today}
              onClose={closeDateJump}
              onSelect={jumpToDate}
            />
          )}

          {(isBlockSelectionMode || selectedRange || calendarClipboard) && (
              <aside
                className="calendar-range-toolbar"
                role="toolbar"
                aria-label="선택한 날짜 범위 작업"
              >
                <div className="calendar-range-summary" aria-live="polite">
                  <span aria-hidden="true">⌁</span>
                  <div>
                    {selectedRange ? (
                      <>
                        <strong>
                          {formatRangeLabel(
                            selectedRange.startKey,
                            selectedRange.endKey,
                          )}{' '}
                          · {selectedRangeDayCount}일
                          {selectedTimeRange
                            ? ` · ${formatMinutes(
                                selectedTimeRange.startMinutes,
                              )}–${formatMinutes(
                                selectedTimeRange.endMinutes,
                              )}`
                            : ''}
                        </strong>
                        <small>
                          {calendarClipboard
                            ? `${
                                calendarClipboard.mode === 'cut'
                                  ? '잘라낸'
                                  : '복사한'
                              } ${
                                calendarClipboard.events.length +
                                calendarClipboard.todos.length
                              }개 유지 중 · 현재 선택의 개인 계획 ${selectedPersonalPlanCount}개`
                            : `개인 계획 ${selectedPersonalPlanCount}개 · 반복 및 모임 계획 제외`}
                        </small>
                      </>
                    ) : calendarClipboard ? (
                      <>
                        <strong>
                          {(calendarClipboard?.events.length ?? 0) +
                            (calendarClipboard?.todos.length ?? 0)}
                          개 계획을{' '}
                          {calendarClipboard?.mode === 'cut'
                            ? '이동할 준비 중'
                            : '복사함'}
                        </strong>
                        <small>
                          붙여넣을 날짜 또는 시간 영역을 선택하세요.
                        </small>
                      </>
                    ) : (
                      <>
                        <strong>선택 모드</strong>
                        <small>
                          {calendarView === 'month'
                            ? '날짜를 누르거나 드래그해 선택에 추가하세요.'
                            : '30분 블록을 누르거나 드래그해 선택에 추가하세요.'}
                        </small>
                      </>
                    )}
                    {rangeNotice && <em>{rangeNotice}</em>}
                  </div>
                </div>

                {isRangeDeleteConfirming ? (
                  <div className="calendar-range-delete-confirm">
                    <strong>
                      개인 계획 {selectedPersonalPlanCount}개를 삭제할까요?
                    </strong>
                    <button
                      type="button"
                      onClick={() => setIsRangeDeleteConfirming(false)}
                    >
                      취소
                    </button>
                    <button
                      className="danger"
                      type="button"
                      onClick={deleteSelectedPlans}
                    >
                      삭제
                    </button>
                  </div>
                ) : (
                  <div className="calendar-range-actions">
                    <button
                      type="button"
                      disabled={!selectedPersonalPlanCount}
                      onClick={() => storeSelectedPlans('copy')}
                    >
                      <span aria-hidden="true">▣</span> 복사
                    </button>
                    <button
                      type="button"
                      disabled={!selectedPersonalPlanCount}
                      onClick={() => storeSelectedPlans('cut')}
                    >
                      <span aria-hidden="true">✂</span> 잘라내기
                    </button>
                    <button
                      type="button"
                      disabled={!calendarClipboard || !selectedRange}
                      onClick={pasteStoredPlans}
                    >
                      <span aria-hidden="true">▤</span> 붙여넣기
                    </button>
                    <button
                      className="danger-text"
                      type="button"
                      disabled={!selectedPersonalPlanCount}
                      onClick={() => setIsRangeDeleteConfirming(true)}
                    >
                      <span aria-hidden="true">⌫</span> 삭제
                    </button>
                    <button
                      className="primary"
                      type="button"
                      disabled={!selectedRange}
                      onClick={createEventFromSelection}
                    >
                      <span aria-hidden="true">＋</span> 새 일정
                    </button>
                    <button
                      className="calendar-range-close"
                      type="button"
                      onClick={cancelSelectionOrClipboard}
                      aria-label={
                        isBlockSelectionMode || selectedRange
                          ? calendarClipboard
                            ? '현재 선택 해제, 복사 내용 유지'
                            : '선택 모드 취소'
                          : '복사 또는 잘라내기 내용 취소'
                      }
                    >
                      ×
                    </button>
                  </div>
                )}
              </aside>
            )}
      </div>

      {isEditorOpen && (
        <PlanEditorModal
          initialType="event"
          selectedDate={editorDate}
          projects={projects}
          fixedRoom={
            editingSharedEvent
              ? studyRooms.find(
                  (room) => room.id === editingSharedEvent.roomId,
                )
              : undefined
          }
          memberId={editingSharedEvent?.memberId}
          item={editingSharedEvent?.item}
          calendarEvent={editingEvent}
          defaultProjectName={selectedProject?.name}
          bulkDateKeys={bulkCreateDateKeys}
          bulkDateCount={bulkCreateDateKeys.length}
          bulkDateSummary={
            bulkCreateDateKeys.length > 1
              ? `${formatRangeLabel(
                  bulkCreateDateKeys[0],
                  bulkCreateDateKeys[bulkCreateDateKeys.length - 1],
                )} · ${bulkCreateDateKeys.length}일`
              : undefined
          }
          defaultStartTime={
            bulkCreateTimeRange
              ? formatMinutes(bulkCreateTimeRange.startMinutes)
              : undefined
          }
          defaultEndTime={
            bulkCreateTimeRange
              ? formatMinutes(bulkCreateTimeRange.endMinutes)
              : undefined
          }
          onClose={closeEditor}
          onSaveTodo={(input) => {
            if (bulkCreateDateKeys.length > 1) {
              bulkCreateDateKeys.forEach((dateKey) =>
                onAddTodo({ ...input, date: dateKey, repeat: 'none' }),
              )
            } else {
              onAddTodo(input)
            }
            closeEditor()
          }}
          onSaveEvent={(input) => {
            if (editingEvent) {
              onUpdateEvent(editingEvent.id, input)
            } else if (bulkCreateDateKeys.length > 1) {
              bulkCreateDateKeys.forEach((dateKey) =>
                onAddEvent({ ...input, date: dateKey, repeat: 'none' }),
              )
            } else {
              onAddEvent(input)
            }
            closeEditor()
          }}
          onSaveShared={updateSharedEvent}
          onDelete={
            editingSharedEvent
              ? removeSharedEvent
              : editingEvent
                ? () => {
                    onRemoveEvent(editingEvent.id)
                    closeEditor()
                  }
                : undefined
          }
        />
      )}
    </main>
  )
}
