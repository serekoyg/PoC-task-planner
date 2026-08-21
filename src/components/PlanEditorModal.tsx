import { FormEvent, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type {
  CalendarEvent,
  CalendarEventInput,
  Todo,
  TodoInput,
} from '../data/initialData'
import { toDateKey } from '../data/initialData'
import type { PlannerProject } from '../data/projects'
import { BACKLOG_PROJECT_NAME } from '../data/projects'
import type {
  StudyRoom,
  StudySharedItem,
  StudySharedItemInput,
  StudySharedMonthWeek,
  StudySharedRepeat,
} from '../data/studyRooms'
import {
  getWeekdaySelectionLabel,
  monthWeekLabels,
  weekdayLabels,
} from '../lib/studyShared'
import MarkdownEditor from './MarkdownEditor'

type PlanType = 'todo' | 'event'
type RepeatEnd = 'never' | 'count' | 'date'

const getDefaultRepeatEndDate = (date: string) => {
  const target = new Date(`${date}T00:00:00`)
  target.setMonth(target.getMonth() + 1)
  return toDateKey(target)
}

type PlanEditorModalProps = {
  initialType: PlanType
  selectedDate: Date
  projects?: PlannerProject[]
  fixedRoom?: StudyRoom
  memberId?: string
  item?: StudySharedItem
  todo?: Todo
  calendarEvent?: CalendarEvent
  defaultProjectName?: string
  bulkDateSummary?: string
  bulkDateCount?: number
  bulkDateKeys?: string[]
  defaultStartTime?: string
  defaultEndTime?: string
  onClose: () => void
  onSaveTodo?: (input: TodoInput) => void
  onSaveEvent?: (input: CalendarEventInput) => void
  onSaveShared?: (input: StudySharedItemInput) => void
  onDelete?: () => void
}

export default function PlanEditorModal({
  initialType,
  selectedDate,
  projects = [],
  fixedRoom,
  memberId,
  item,
  todo,
  calendarEvent,
  defaultProjectName,
  bulkDateSummary,
  bulkDateCount = 0,
  bulkDateKeys = [],
  defaultStartTime,
  defaultEndTime,
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
  const storedRepeat = item?.repeat ?? personalItem?.repeat ?? 'none'
  const initialRepeat = storedRepeat === 'daily' || storedRepeat === 'weekdays'
    ? 'weekly'
    : storedRepeat
  const initialRepeatWeekdays = storedRepeat === 'daily'
    ? [0, 1, 2, 3, 4, 5, 6]
    : storedRepeat === 'weekdays'
      ? [1, 2, 3, 4, 5]
      : item?.repeatWeekdays?.length
        ? item.repeatWeekdays
        : personalItem?.repeatWeekdays?.length
          ? personalItem.repeatWeekdays
          : [new Date(`${initialDate}T00:00:00`).getDay()]
  const [type, setType] = useState<PlanType>(initialPlanType)
  const [title, setTitle] = useState(item?.title ?? todo?.text ?? calendarEvent?.title ?? '')
  const [date, setDate] = useState(initialDate)
  const [time, setTime] = useState(
    item?.time ?? todo?.dueTime ?? calendarEvent?.startTime ?? defaultStartTime ?? (initialPlanType === 'todo' ? '18:00' : '09:00'),
  )
  const [endTime, setEndTime] = useState(item?.endTime ?? calendarEvent?.endTime ?? defaultEndTime ?? '10:00')
  const [location, setLocation] = useState(item?.location ?? calendarEvent?.location ?? '')
  const [note, setNote] = useState(item?.note ?? personalItem?.note ?? '')
  const [repeat, setRepeat] = useState<StudySharedRepeat>(initialRepeat)
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([
    ...initialRepeatWeekdays,
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
  const [repeatEnd, setRepeatEnd] = useState<RepeatEnd>(
    item?.repeatEnd ?? personalItem?.repeatEnd ?? 'never',
  )
  const [repeatCount, setRepeatCount] = useState(
    item?.repeatCount ?? personalItem?.repeatCount ?? 10,
  )
  const [repeatEndDate, setRepeatEndDate] = useState(
    item?.repeatEndDate ?? personalItem?.repeatEndDate ?? getDefaultRepeatEndDate(initialDate),
  )
  const [project, setProject] = useState(
    personalItem?.project ?? defaultProjectName ?? BACKLOG_PROJECT_NAME,
  )
  const [priority, setPriority] = useState<TodoInput['priority']>(todo?.priority ?? 'medium')
  const [reminder, setReminder] = useState<TodoInput['reminder']>(personalItem?.reminder ?? '30m')
  const [error, setError] = useState('')
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false)
  const [isCloseConfirming, setIsCloseConfirming] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isRepeatDetailsOpen, setIsRepeatDetailsOpen] = useState(
    storedRepeat !== 'none',
  )
  const panelRef = useRef<HTMLElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const isPersonal = !fixedRoom
  const isBulkCreating = !isEditing && bulkDateCount > 1
  const member = fixedRoom?.members.find((candidate) => candidate.id === memberId)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [])

  useEffect(() => {
    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (isDeleteConfirming) {
          setIsDeleteConfirming(false)
          return
        }
        if (isCloseConfirming) {
          setIsCloseConfirming(false)
          return
        }
        if (isDirty) {
          setIsCloseConfirming(true)
          return
        }
        onClose()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleDialogKeyDown)
    return () => window.removeEventListener('keydown', handleDialogKeyDown)
  }, [isCloseConfirming, isDeleteConfirming, isDirty, onClose])

  const requestClose = () => {
    if (isDirty) {
      setIsCloseConfirming(true)
      return
    }
    onClose()
  }

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
    repeatEnd: repeat === 'none' ? undefined : repeatEnd,
    repeatCount: repeat !== 'none' && repeatEnd === 'count' ? repeatCount : undefined,
    repeatEndDate: repeat !== 'none' && repeatEnd === 'date' ? repeatEndDate : undefined,
  }

  const savePlan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) {
      setError('계획 제목을 입력해 주세요.')
      titleInputRef.current?.focus()
      return
    }
    if (repeat === 'weekly' && !repeatWeekdays.length) {
      setError('반복할 요일을 하나 이상 선택해 주세요.')
      return
    }
    if (repeat !== 'none' && repeatEnd === 'date' && repeatEndDate < date) {
      setError('반복 마감 날짜는 시작일 이후로 선택해 주세요.')
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

    if (type === 'todo') {
      onSaveTodo?.({
        date,
        text: title.trim(),
        priority,
        dueTime: time,
        reminder,
        color: todo?.color ?? 'blue',
        note: note.trim(),
        project,
        estimatedMinutes: todo?.estimatedMinutes ?? 30,
        ...repeatFields,
      })
    } else {
      onSaveEvent?.({
        date,
        title: title.trim(),
        startTime: time,
        endTime,
        allDay: false,
        color: calendarEvent?.color ?? 'blue',
        project,
        location: location.trim(),
        note: note.trim(),
        reminder,
        ...repeatFields,
      })
    }
  }

  return createPortal(
    <div
      className="study-modal-backdrop plan-editor-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      <section
        className="study-create-modal shared-plan-modal unified-plan-modal plan-editor-drawer"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="unified-plan-editor-title"
      >
        <header className="plan-editor-header">
          <div>
            <p className="eyebrow">
              {fixedRoom
                ? `${fixedRoom.name}에 공유`
                : isEditing
                  ? '계획 관리'
                  : '새로운 계획'}
            </p>
            <h2 id="unified-plan-editor-title">
              {isEditing ? '계획 편집' : '계획 만들기'}
            </h2>
          </div>
          <button
            type="button"
            aria-label={`${isEditing ? '계획 편집' : '계획 만들기'} 패널 닫기`}
            onClick={requestClose}
          >
            ×
          </button>
        </header>

        <form
          className="plan-editor-form"
          ref={formRef}
          onChange={() => {
            setIsDirty(true)
            setIsCloseConfirming(false)
          }}
          onSubmit={savePlan}
        >
          <div className="plan-editor-scroll">
            <fieldset className="plan-type-switch">
              <legend className="visually-hidden">종류</legend>
              {([
                ['todo', '✓', '할 일'],
                ['event', '▦', '일정'],
              ] as const).map(([value, icon, label]) => (
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
                </label>
              ))}
            </fieldset>

            <label className="plan-title-field">
              <span className="visually-hidden">제목</span>
              <input
                autoFocus
                required
                maxLength={60}
                ref={titleInputRef}
                value={title}
                placeholder={
                  type === 'todo'
                    ? '무엇을 완료해야 하나요?'
                    : '어떤 일정인가요?'
                }
                onChange={(event) => {
                  setTitle(event.target.value)
                  setError('')
                }}
              />
            </label>

            {isBulkCreating && (
              <div className="bulk-plan-create-info" role="status">
                <span aria-hidden="true">⌁</span>
                <p>
                  <strong>{bulkDateSummary}</strong>
                  <small>
                    각 날짜에 하나씩 생성되며 반복 설정은 사용할 수 없어요.
                  </small>
                </p>
              </div>
            )}

            <section className="plan-properties" aria-labelledby="plan-properties-title">
              <div className="plan-section-heading">
                <h3 id="plan-properties-title">속성</h3>
                <small>계획에 필요한 정보만 설정하세요.</small>
              </div>

              <div className={isBulkCreating ? 'plan-property-row wide' : 'plan-property-row'}>
                <span className="plan-property-label">
                  <i aria-hidden="true">▦</i>
                  {repeat === 'none'
                    ? type === 'todo'
                      ? '마감일'
                      : '날짜'
                    : '시작일'}
                </span>
                <div className="plan-property-control">
                  {isBulkCreating ? (
                    <div
                      className="bulk-selected-date-field compact"
                      role="group"
                      aria-label="선택한 날짜"
                    >
                      <strong>{bulkDateCount}개 날짜</strong>
                      <div role="list" aria-label="선택한 날짜 목록">
                        {bulkDateKeys.map((dateKey) => {
                          const selectedBulkDate = new Date(`${dateKey}T00:00:00`)
                          return (
                            <span role="listitem" key={dateKey}>
                              {selectedBulkDate.getMonth() + 1}월{' '}
                              {selectedBulkDate.getDate()}일
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <label>
                      <span className="visually-hidden">
                        {type === 'todo' ? '마감일' : '날짜'}
                      </span>
                      <input
                        type="date"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="plan-property-row">
                <span className="plan-property-label">
                  <i aria-hidden="true">↻</i>
                  반복
                </span>
                <div className="plan-property-control inline">
                  <label>
                    <span className="visually-hidden">반복 방식</span>
                    <select
                      value={repeat}
                      disabled={isBulkCreating}
                      onChange={(event) => {
                        const nextRepeat = event.target.value as StudySharedRepeat
                        setRepeat(nextRepeat)
                        setIsRepeatDetailsOpen(nextRepeat !== 'none')
                      }}
                    >
                      <option value="none">반복 안 함</option>
                      <option value="weekly">특정 요일</option>
                      <option value="monthly">매월 특정 날짜</option>
                      <option value="monthlyWeekday">매월 특정 요일</option>
                    </select>
                  </label>
                  {repeat !== 'none' && (
                    <button
                      className="plan-property-detail-button"
                      type="button"
                      aria-expanded={isRepeatDetailsOpen}
                      onClick={() => setIsRepeatDetailsOpen((current) => !current)}
                    >
                      {isRepeatDetailsOpen ? '접기' : '세부 설정'}
                    </button>
                  )}
                </div>
              </div>

              {repeat !== 'none' && isRepeatDetailsOpen && (
                <div className="plan-repeat-detail-panel">
                  {repeat === 'weekly' && (
                    <div className="shared-repeat-settings">
                      <fieldset className="shared-repeat-interval">
                        <legend>반복 주기</legend>
                        <div>
                          {([
                            ['one', '1주마다'],
                            ['two', '2주마다'],
                          ] as const).map(([value, label]) => (
                            <label
                              className={repeatIntervalMode === value ? 'active' : ''}
                              key={value}
                            >
                              <input
                                type="radio"
                                name="unified-repeat-interval"
                                checked={repeatIntervalMode === value}
                                onChange={() => setRepeatIntervalMode(value)}
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                          <div
                            className={
                              repeatIntervalMode === 'custom'
                                ? 'active custom'
                                : 'custom'
                            }
                          >
                            <label>
                              <input
                                type="radio"
                                name="unified-repeat-interval"
                                checked={repeatIntervalMode === 'custom'}
                                onChange={() => setRepeatIntervalMode('custom')}
                              />
                              <span>직접 입력</span>
                            </label>
                            <input
                              type="number"
                              aria-label="직접 입력 반복 주기"
                              min={1}
                              max={52}
                              value={customRepeatInterval}
                              disabled={repeatIntervalMode !== 'custom'}
                              onChange={(event) =>
                                setCustomRepeatInterval(
                                  Math.min(52, Math.max(1, Number(event.target.value) || 1)),
                                )
                              }
                            />
                            <span>주마다</span>
                          </div>
                        </div>
                      </fieldset>
                      <fieldset className="shared-repeat-weekdays">
                        <legend>
                          반복 요일
                          <small>여러 요일을 선택할 수 있어요.</small>
                          <strong>{getWeekdaySelectionLabel(repeatWeekdays)}</strong>
                        </legend>
                        <div>
                          {weekdayLabels.map((label, index) => (
                            <label
                              className={
                                repeatWeekdays.includes(index) ? 'active' : ''
                              }
                              key={label}
                            >
                              <input
                                type="checkbox"
                                checked={repeatWeekdays.includes(index)}
                                onChange={() => toggleWeekday(index)}
                              />
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
                      <div>
                        <span>매월</span>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={repeatMonthDay}
                          aria-label="매월 반복 날짜"
                          onChange={(event) =>
                            setRepeatMonthDay(
                              Math.min(31, Math.max(1, Number(event.target.value) || 1)),
                            )
                          }
                        />
                        <span>일</span>
                      </div>
                      <small>해당 날짜가 없는 달에는 표시되지 않아요.</small>
                    </label>
                  )}

                  {repeat === 'monthlyWeekday' && (
                    <fieldset className="shared-repeat-monthly-weekday">
                      <legend>반복 요일</legend>
                      <div>
                        <label>
                          <span>몇 번째 주</span>
                          <select
                            value={repeatMonthlyWeek}
                            onChange={(event) =>
                              setRepeatMonthlyWeek(
                                event.target.value as StudySharedMonthWeek,
                              )
                            }
                          >
                            {Object.entries(monthWeekLabels).map(([value, label]) => (
                              <option value={value} key={value}>{label}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>요일</span>
                          <select
                            value={repeatMonthlyWeekday}
                            onChange={(event) =>
                              setRepeatMonthlyWeekday(Number(event.target.value))
                            }
                          >
                            {weekdayLabels.map((label, index) => (
                              <option value={index} key={label}>{label}요일</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <p>
                        매월 {monthWeekLabels[repeatMonthlyWeek]}{' '}
                        {weekdayLabels[repeatMonthlyWeekday]}요일에 반복돼요.
                      </p>
                    </fieldset>
                  )}

                  <fieldset className="shared-repeat-end">
                    <legend>반복 종료</legend>
                    <div className="shared-repeat-end-options">
                      {([
                        ['never', '계속 반복'],
                        ['count', '횟수 제한'],
                        ['date', '날짜까지'],
                      ] as const).map(([value, label]) => (
                        <label className={repeatEnd === value ? 'active' : ''} key={value}>
                          <input
                            type="radio"
                            name="repeat-end"
                            checked={repeatEnd === value}
                            onChange={() => setRepeatEnd(value)}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                    {repeatEnd === 'count' && (
                      <label className="shared-repeat-end-value">
                        <span>총 반복 횟수</span>
                        <div>
                          <input
                            type="number"
                            min={1}
                            max={999}
                            value={repeatCount}
                            onChange={(event) =>
                              setRepeatCount(
                                Math.min(999, Math.max(1, Number(event.target.value) || 1)),
                              )
                            }
                          />
                          <span>회</span>
                        </div>
                      </label>
                    )}
                    {repeatEnd === 'date' && (
                      <label className="shared-repeat-end-value">
                        <span>마감 날짜</span>
                        <input
                          type="date"
                          min={date}
                          value={repeatEndDate}
                          onChange={(event) => setRepeatEndDate(event.target.value)}
                        />
                      </label>
                    )}
                  </fieldset>
                </div>
              )}

              <div className={type === 'event' ? 'plan-property-row wide' : 'plan-property-row'}>
                <span className="plan-property-label">
                  <i aria-hidden="true">◷</i>
                  {type === 'todo' ? '마감 시간' : '시간'}
                </span>
                <div className="plan-property-control plan-time-control">
                  <label>
                    <span className="visually-hidden">
                      {type === 'todo' ? '마감 시간' : '시작 시간'}
                    </span>
                    <input
                      type="time"
                      value={time}
                      onChange={(event) => setTime(event.target.value)}
                    />
                  </label>
                  {type === 'event' && (
                    <>
                      <span aria-hidden="true">→</span>
                      <label>
                        <span className="visually-hidden">종료 시간</span>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(event) => setEndTime(event.target.value)}
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>

              {type === 'event' && (
                <div className="plan-property-row wide">
                  <span className="plan-property-label">
                    <i aria-hidden="true">⌖</i>
                    장소
                  </span>
                  <div className="plan-property-control">
                    <label>
                      <span className="visually-hidden">장소 또는 링크</span>
                      <input
                        value={location}
                        maxLength={80}
                        placeholder="장소 또는 화상 회의 링크"
                        onChange={(event) => setLocation(event.target.value)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {isPersonal ? (
                <>
                  <div className="plan-property-row">
                    <span className="plan-property-label">
                      <i aria-hidden="true">◉</i>
                      목록
                    </span>
                    <div className="plan-property-control">
                      <label>
                        <span className="visually-hidden">목록 선택</span>
                        <select
                          aria-label="목록 선택"
                          value={project}
                          onChange={(event) => setProject(event.target.value)}
                        >
                          <option value={BACKLOG_PROJECT_NAME}>
                            {BACKLOG_PROJECT_NAME}
                          </option>
                          {projects.map((item) => (
                            <option value={item.name} key={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>

                  {type === 'todo' && (
                    <div className="plan-property-row">
                      <span className="plan-property-label">
                        <i aria-hidden="true">!</i>
                        우선순위
                      </span>
                      <div className="plan-property-control">
                        <label>
                          <span className="visually-hidden">우선순위</span>
                          <select
                            value={priority}
                            onChange={(event) =>
                              setPriority(event.target.value as TodoInput['priority'])
                            }
                          >
                            <option value="high">높음</option>
                            <option value="medium">보통</option>
                            <option value="low">낮음</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="plan-property-row">
                    <span className="plan-property-label">
                      <i aria-hidden="true">♢</i>
                      알림
                    </span>
                    <div className="plan-property-control">
                      <label>
                        <span className="visually-hidden">알림</span>
                        <select
                          value={reminder}
                          onChange={(event) =>
                            setReminder(event.target.value as TodoInput['reminder'])
                          }
                        >
                          <option value="none">알림 없음</option>
                          <option value="10m">10분 전</option>
                          <option value="30m">30분 전</option>
                          <option value="1h">1시간 전</option>
                          <option value="1d">1일 전</option>
                        </select>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <div className="shared-plan-permission-info compact">
                  <span aria-hidden="true">◉</span>
                  <p>
                    <strong>{member?.name ?? '내'} 이름으로 공동 계획에 등록돼요.</strong>
                    <small>
                      {type === 'todo'
                        ? '완료 상태는 멤버마다 따로 기록됩니다.'
                        : '참여 상태는 멤버마다 따로 기록됩니다.'}
                    </small>
                  </p>
                </div>
              )}
            </section>

            <section className="plan-document-section" aria-labelledby="plan-document-title">
              <div className="plan-section-heading">
                <h3 id="plan-document-title">내용</h3>
                <small>메모, 링크, 체크리스트를 한곳에 정리하세요.</small>
              </div>
              <MarkdownEditor
                value={note}
                maxLength={16000}
                placeholder={
                  type === 'todo'
                    ? '해야 할 일의 배경, 체크리스트, 참고 링크를 적어보세요.'
                    : '일정의 안건, 준비물, 참고 링크를 적어보세요.'
                }
                onChange={(nextNote) => {
                  setNote(nextNote)
                  setIsDirty(true)
                  setIsCloseConfirming(false)
                }}
                onSaveShortcut={() => formRef.current?.requestSubmit()}
              />
            </section>
          </div>

          <footer className="plan-editor-footer">
            {error && <p className="event-form-error" role="alert">{error}</p>}
            {isCloseConfirming && (
              <div className="plan-close-confirm" role="alert">
                <p>
                  <strong>저장하지 않은 변경사항이 있어요.</strong>
                  <span>계속 작성하거나 변경사항을 버릴 수 있어요.</span>
                </p>
                <div>
                  <button type="button" onClick={() => setIsCloseConfirming(false)}>
                    계속 작성
                  </button>
                  <button className="danger" type="button" onClick={onClose}>
                    변경 버리기
                  </button>
                </div>
              </div>
            )}
            {!isCloseConfirming && (
              <div className="plan-editor-actions">
                <div>
                  {isPersonalEditing && onDelete && !isDeleteConfirming && (
                    <button
                      className="event-delete-button"
                      type="button"
                      onClick={() => setIsDeleteConfirming(true)}
                    >
                      계획 삭제
                    </button>
                  )}
                  {isPersonalEditing && onDelete && isDeleteConfirming && (
                    <div className="event-delete-confirm" role="alert">
                      <span>정말 삭제할까요?</span>
                      <button type="button" onClick={() => setIsDeleteConfirming(false)}>
                        아니요
                      </button>
                      <button type="button" onClick={onDelete}>삭제</button>
                    </div>
                  )}
                </div>
                <div>
                  <button type="button" onClick={requestClose}>취소</button>
                  <button className="study-submit-button" type="submit">
                    {isEditing
                      ? '변경 저장'
                      : fixedRoom
                        ? '모임에 공유'
                        : '계획 저장'}
                  </button>
                </div>
              </div>
            )}
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  )
}
