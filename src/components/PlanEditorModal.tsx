import { FormEvent, useEffect, useState } from 'react'
import type {
  CalendarEvent,
  CalendarEventInput,
  Todo,
  TodoInput,
} from '../data/initialData'
import { toDateKey } from '../data/initialData'
import type { PlannerProject } from '../data/projects'
import type {
  StudyRoom,
  StudySharedItem,
  StudySharedItemInput,
  StudySharedMonthWeek,
  StudySharedRepeat,
} from '../data/studyRooms'
import { monthWeekLabels, weekdayLabels } from '../lib/studyShared'

type PlanType = 'todo' | 'event'

type PlanEditorModalProps = {
  initialType: PlanType
  selectedDate: Date
  projects?: PlannerProject[]
  studyRooms?: StudyRoom[]
  fixedRoom?: StudyRoom
  memberId?: string
  item?: StudySharedItem
  todo?: Todo
  calendarEvent?: CalendarEvent
  defaultProjectName?: string
  onClose: () => void
  onSaveTodo?: (input: TodoInput, sharedRoomId?: string) => void
  onSaveEvent?: (input: CalendarEventInput, sharedRoomId?: string) => void
  onSaveShared?: (input: StudySharedItemInput) => void
  onDelete?: () => void
}

export default function PlanEditorModal({
  initialType,
  selectedDate,
  projects = [],
  studyRooms = [],
  fixedRoom,
  memberId,
  item,
  todo,
  calendarEvent,
  defaultProjectName,
  onClose,
  onSaveTodo,
  onSaveEvent,
  onSaveShared,
  onDelete,
}: PlanEditorModalProps) {
  const personalItem = todo ?? calendarEvent
  const isEditing = Boolean(item || personalItem)
  const isPersonalEditing = Boolean(personalItem)
  const initialDate = item?.date ?? personalItem?.date ?? toDateKey(selectedDate)
  const initialPlanType: PlanType = item?.type ?? (todo ? 'todo' : calendarEvent ? 'event' : initialType)
  const initialRepeat = item?.repeat ?? personalItem?.repeat ?? 'none'
  const [type, setType] = useState<PlanType>(initialPlanType)
  const [destination, setDestination] = useState(fixedRoom?.id ?? 'personal')
  const [title, setTitle] = useState(item?.title ?? todo?.text ?? calendarEvent?.title ?? '')
  const [date, setDate] = useState(initialDate)
  const [time, setTime] = useState(
    item?.time ?? todo?.dueTime ?? calendarEvent?.startTime ?? (initialPlanType === 'todo' ? '18:00' : '09:00'),
  )
  const [endTime, setEndTime] = useState(item?.endTime ?? calendarEvent?.endTime ?? '10:00')
  const [location, setLocation] = useState(item?.location ?? calendarEvent?.location ?? '')
  const [note, setNote] = useState(item?.note ?? personalItem?.note ?? '')
  const [repeat, setRepeat] = useState<StudySharedRepeat>(initialRepeat)
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([
    ...(item?.repeatWeekdays?.length
      ? item.repeatWeekdays
      : personalItem?.repeatWeekdays?.length
        ? personalItem.repeatWeekdays
        : [new Date(`${initialDate}T00:00:00`).getDay()]),
  ])
  const itemRepeatInterval = item?.repeatIntervalWeeks ?? personalItem?.repeatIntervalWeeks ?? 1
  const [repeatIntervalMode, setRepeatIntervalMode] = useState<'one' | 'two' | 'custom'>(itemRepeatInterval === 1 ? 'one' : itemRepeatInterval === 2 ? 'two' : 'custom')
  const [customRepeatInterval, setCustomRepeatInterval] = useState(itemRepeatInterval > 2 ? itemRepeatInterval : 3)
  const [repeatMonthDay, setRepeatMonthDay] = useState(
    item?.repeatMonthDay ?? personalItem?.repeatMonthDay ?? new Date(`${initialDate}T00:00:00`).getDate(),
  )
  const [repeatMonthlyWeek, setRepeatMonthlyWeek] = useState<StudySharedMonthWeek>(
    item?.repeatMonthlyWeek ?? personalItem?.repeatMonthlyWeek ?? 'first',
  )
  const [repeatMonthlyWeekday, setRepeatMonthlyWeekday] = useState(
    item?.repeatMonthlyWeekday ?? personalItem?.repeatMonthlyWeekday ?? new Date(`${initialDate}T00:00:00`).getDay(),
  )
  const [project, setProject] = useState(personalItem?.project ?? defaultProjectName ?? '받은 편지함')
  const [priority, setPriority] = useState<TodoInput['priority']>(todo?.priority ?? 'medium')
  const [reminder, setReminder] = useState<TodoInput['reminder']>(personalItem?.reminder ?? '30m')
  const [error, setError] = useState('')
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false)
  const selectedRoom = fixedRoom ?? studyRooms.find((room) => room.id === destination)
  const isPersonal = isPersonalEditing || (!fixedRoom && destination === 'personal')
  const member = fixedRoom?.members.find((candidate) => candidate.id === memberId)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const toggleWeekday = (weekday: number) => {
    setRepeatWeekdays((current) =>
      current.includes(weekday)
        ? current.filter((item) => item !== weekday)
        : [...current, weekday].sort((a, b) => a - b),
    )
  }

  const repeatFields = {
    repeat,
    repeatWeekdays: repeat === 'weekly' ? repeatWeekdays : undefined,
    repeatIntervalWeeks:
      repeat === 'weekly'
        ? repeatIntervalMode === 'one'
          ? 1
          : repeatIntervalMode === 'two'
            ? 2
            : customRepeatInterval
        : undefined,
    repeatMonthDay: repeat === 'monthly' ? repeatMonthDay : undefined,
    repeatMonthlyWeek:
      repeat === 'monthlyWeekday' ? repeatMonthlyWeek : undefined,
    repeatMonthlyWeekday:
      repeat === 'monthlyWeekday' ? repeatMonthlyWeekday : undefined,
  }

  const savePlan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) {
      setError('계획 제목을 입력해 주세요.')
      return
    }
    if (repeat === 'weekly' && !repeatWeekdays.length) {
      setError('반복할 요일을 하나 이상 선택해 주세요.')
      return
    }
    if (type === 'event' && endTime <= time) {
      setError('종료 시간은 시작 시간보다 늦어야 해요.')
      return
    }

    if (fixedRoom && onSaveShared) {
      onSaveShared({
        type,
        title: title.trim(),
        date,
        time: type === 'event' ? time : undefined,
        endTime: type === 'event' ? endTime : undefined,
        location: type === 'event' ? location.trim() : undefined,
        note: note.trim(),
        ...repeatFields,
      })
      return
    }

    const sharedRoomId = isPersonal || isPersonalEditing ? undefined : destination
    if (type === 'todo') {
      onSaveTodo?.(
        {
          date,
          text: title.trim(),
          priority,
          category: todo?.category ?? '개인',
          dueTime: time,
          reminder,
          color: todo?.color ?? 'blue',
          note: note.trim(),
          project: isPersonal ? project : '받은 편지함',
          estimatedMinutes: todo?.estimatedMinutes ?? 30,
          ...repeatFields,
        },
        sharedRoomId,
      )
    } else {
      onSaveEvent?.(
        {
          date,
          title: title.trim(),
          startTime: time,
          endTime,
          allDay: false,
          color: calendarEvent?.color ?? 'blue',
          project: isPersonal ? project : '받은 편지함',
          category: calendarEvent?.category ?? '개인',
          location: location.trim(),
          note: note.trim(),
          reminder,
          ...repeatFields,
        },
        sharedRoomId,
      )
    }
  }

  return (
    <div
      className="study-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="study-create-modal shared-plan-modal unified-plan-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unified-plan-editor-title"
      >
        <div className="study-modal-heading">
          <div>
            <p className="eyebrow">{fixedRoom ? `${fixedRoom.name}에 공유` : isEditing ? '계획 관리' : '새로운 계획'}</p>
            <h2 id="unified-plan-editor-title">{isEditing ? '계획 편집' : '계획 만들기'}</h2>
            <p>{fixedRoom ? '저장하면 모든 멤버에게 하나의 공동 계획으로 표시돼요.' : isEditing ? '등록할 때 사용한 항목을 같은 화면에서 수정하세요.' : '할 일과 일정을 같은 흐름에서 만들고 저장 위치를 선택하세요.'}</p>
          </div>
          <button
            type="button"
            aria-label={`${isEditing ? '계획 편집' : '계획 만들기'} 창 닫기`}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form className="study-create-form" onSubmit={savePlan}>
          <fieldset className="shared-plan-type-options">
            <legend>종류</legend>
            {([
              ['todo', '✓', '할 일', '완료 여부를 체크해요.'],
              ['event', '▦', '일정', '정해진 시간에 참여해요.'],
            ] as const).map(([value, icon, label, description]) => (
              <label className={type === value ? 'active' : ''} key={value}>
                <input
                  type="radio"
                  name="plan-type"
                  checked={type === value}
                  disabled={isEditing}
                  onChange={() => {
                    setType(value)
                    setTime(value === 'todo' ? '18:00' : '09:00')
                    setError('')
                  }}
                />
                <span aria-hidden="true">{icon}</span>
                <strong>{label}</strong>
                <small>{description}</small>
              </label>
            ))}
          </fieldset>

          <label className="plan-storage-field">
            <span>저장 위치</span>
            {fixedRoom ? (
              <div className="fixed-plan-storage"><span aria-hidden="true">◉</span><strong>{fixedRoom.name}</strong><small>현재 모임으로 고정</small></div>
            ) : isPersonalEditing ? (
              <div className="fixed-plan-storage"><span aria-hidden="true">●</span><strong>나의 계획</strong><small>편집 중에는 저장 위치 고정</small></div>
            ) : (
              <select value={destination} onChange={(event) => setDestination(event.target.value)}>
                <option value="personal">나의 계획</option>
                {studyRooms.map((room) => {
                  const me = room.members.find((candidate) => candidate.isMe)
                  const canShare = Boolean(
                    me &&
                      (room.ownerId === me.id ||
                        room.managerIds.includes(me.id) ||
                        room.allowMemberSharing),
                  )
                  return (
                    <option value={room.id} disabled={!canShare} key={room.id}>
                      {room.name}{canShare ? '' : ' · 공유 권한 없음'}
                    </option>
                  )
                })}
              </select>
            )}
          </label>

          <label>
            <span>제목</span>
            <input
              autoFocus
              required
              maxLength={60}
              value={title}
              placeholder={type === 'todo' ? '예: 운동 30분 하기' : '예: 토요일 온라인 모임'}
              onChange={(event) => {
                setTitle(event.target.value)
                setError('')
              }}
            />
          </label>

          <div className="study-form-row">
            <label>
              <span>{repeat === 'none' ? (type === 'todo' ? '마감일' : '날짜') : '시작일'}</span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label>
              <span>반복</span>
              <select value={repeat} onChange={(event) => setRepeat(event.target.value as StudySharedRepeat)}>
                <option value="none">반복 안 함</option>
                <option value="daily">매일</option>
                <option value="weekdays">평일</option>
                <option value="weekly">특정 요일</option>
                <option value="monthly">매월 특정 날짜</option>
                <option value="monthlyWeekday">매월 특정 요일</option>
              </select>
            </label>
          </div>

          {repeat === 'weekly' && (
            <div className="shared-repeat-settings">
              <fieldset className="shared-repeat-interval">
                <legend>반복 주기</legend>
                <div>
                  {([['one', '1주마다'], ['two', '2주마다']] as const).map(([value, label]) => (
                    <label className={repeatIntervalMode === value ? 'active' : ''} key={value}>
                      <input type="radio" name="unified-repeat-interval" checked={repeatIntervalMode === value} onChange={() => setRepeatIntervalMode(value)} />
                      <span>{label}</span>
                    </label>
                  ))}
                  <div className={repeatIntervalMode === 'custom' ? 'active custom' : 'custom'}>
                    <label>
                      <input type="radio" name="unified-repeat-interval" checked={repeatIntervalMode === 'custom'} onChange={() => setRepeatIntervalMode('custom')} />
                      <span>직접 입력</span>
                    </label>
                    <input type="number" aria-label="직접 입력 반복 주기" min={1} max={52} value={customRepeatInterval} disabled={repeatIntervalMode !== 'custom'} onChange={(event) => setCustomRepeatInterval(Math.min(52, Math.max(1, Number(event.target.value) || 1)))} />
                    <span>주마다</span>
                  </div>
                </div>
              </fieldset>
              <fieldset className="shared-repeat-weekdays">
                <legend>반복 요일 <small>여러 요일을 선택할 수 있어요.</small></legend>
                <div>
                  {weekdayLabels.map((label, index) => (
                    <label className={repeatWeekdays.includes(index) ? 'active' : ''} key={label}>
                      <input type="checkbox" checked={repeatWeekdays.includes(index)} onChange={() => toggleWeekday(index)} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {repeat === 'monthly' && (
            <label className="shared-repeat-month-day">
              <span>반복 날짜</span>
              <div><span>매월</span><input type="number" min={1} max={31} value={repeatMonthDay} aria-label="매월 반복 날짜" onChange={(event) => setRepeatMonthDay(Math.min(31, Math.max(1, Number(event.target.value) || 1)))} /><span>일</span></div>
              <small>해당 날짜가 없는 달에는 표시되지 않아요.</small>
            </label>
          )}

          {repeat === 'monthlyWeekday' && (
            <fieldset className="shared-repeat-monthly-weekday">
              <legend>반복 요일</legend>
              <div>
                <label><span>몇 번째 주</span><select value={repeatMonthlyWeek} onChange={(event) => setRepeatMonthlyWeek(event.target.value as StudySharedMonthWeek)}>{Object.entries(monthWeekLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                <label><span>요일</span><select value={repeatMonthlyWeekday} onChange={(event) => setRepeatMonthlyWeekday(Number(event.target.value))}>{weekdayLabels.map((label, index) => <option value={index} key={label}>{label}요일</option>)}</select></label>
              </div>
              <p>매월 {monthWeekLabels[repeatMonthlyWeek]} {weekdayLabels[repeatMonthlyWeekday]}요일에 반복돼요.</p>
            </fieldset>
          )}

          {type === 'todo' ? (
            <label><span>마감 시간</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
          ) : (
            <>
              <div className="study-form-row">
                <label><span>시작 시간</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
                <label><span>종료 시간</span><input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
              </div>
              <label><span>장소 또는 링크</span><input value={location} maxLength={80} placeholder="예: 헬스장, 디스코드 음성 채널" onChange={(event) => setLocation(event.target.value)} /></label>
            </>
          )}

          {isPersonal ? (
            <fieldset className="personal-plan-fields">
              <legend>나의 계획 설정</legend>
              <div className="study-form-row">
                <label><span>프로젝트</span><select value={project} onChange={(event) => setProject(event.target.value)}><option value="받은 편지함">받은 편지함</option>{projects.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}</select></label>
                {type === 'todo' && <label><span>우선순위</span><select value={priority} onChange={(event) => setPriority(event.target.value as TodoInput['priority'])}><option value="high">높음</option><option value="medium">보통</option><option value="low">낮음</option></select></label>}
                <label><span>알림</span><select value={reminder} onChange={(event) => setReminder(event.target.value as TodoInput['reminder'])}><option value="none">알림 없음</option><option value="10m">10분 전</option><option value="30m">30분 전</option><option value="1h">1시간 전</option><option value="1d">1일 전</option></select></label>
              </div>
            </fieldset>
          ) : (
            <div className="shared-plan-permission-info">
              <span aria-hidden="true">◉</span>
              <p><strong>{fixedRoom ? `${member?.name ?? '내'} 이름으로 공동 계획에 등록돼요.` : `${selectedRoom?.name}의 공동 계획으로 등록돼요.`}</strong><small>{type === 'todo' ? '모든 멤버에게 표시되며 완료 상태는 멤버마다 따로 기록됩니다.' : '모든 멤버에게 표시되며 참여 상태는 멤버마다 따로 기록됩니다.'}</small></p>
            </div>
          )}

          <label><span>메모</span><textarea maxLength={180} value={note} placeholder="필요한 내용이나 준비 사항을 적어주세요." onChange={(event) => setNote(event.target.value)} /></label>
          {error && <p className="event-form-error" role="alert">{error}</p>}
          <div className="study-form-actions unified-plan-actions">
            <div>
              {isPersonalEditing && onDelete && !isDeleteConfirming && (
                <button className="event-delete-button" type="button" onClick={() => setIsDeleteConfirming(true)}>계획 삭제</button>
              )}
              {isPersonalEditing && onDelete && isDeleteConfirming && (
                <div className="event-delete-confirm" role="alert">
                  <span>정말 삭제할까요?</span>
                  <button type="button" onClick={() => setIsDeleteConfirming(false)}>아니요</button>
                  <button type="button" onClick={onDelete}>삭제</button>
                </div>
              )}
            </div>
            <div>
              <button type="button" onClick={onClose}>취소</button>
              <button className="study-submit-button" type="submit">{isEditing ? '변경 저장' : fixedRoom ? '모임에 공유' : '계획 저장'}</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}
