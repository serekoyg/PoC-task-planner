import {
  type CSSProperties,
  type PointerEventHandler,
  type RefObject,
  useMemo,
} from 'react'
import type { CalendarEvent, Todo } from '../data/initialData'
import { toDateKey } from '../data/initialData'
import {
  getProjectColorByName,
  type PlannerProject,
} from '../data/projects'
import type { StudySharedItemEntry } from '../data/studyRooms'
import {
  isCalendarEventOnDate,
  isTodoOnDate,
} from '../lib/date'
import { isSharedItemOnDate } from '../lib/studyShared'

type CalendarTimeGridProps = {
  dates: Date[]
  events: CalendarEvent[]
  todos: Todo[]
  projects: PlannerProject[]
  sharedItems: StudySharedItemEntry[]
  selectedPlanKeys: Set<string>
  cutPlanKeys: Set<string>
  selectedTimeSlotKeys: Set<string>
  isSelecting: boolean
  surfaceRef: RefObject<HTMLDivElement | null>
  onPointerDown: PointerEventHandler<HTMLDivElement>
  onPointerMove: PointerEventHandler<HTMLDivElement>
  onPointerUp: PointerEventHandler<HTMLDivElement>
  onPointerCancel: PointerEventHandler<HTMLDivElement>
  onOpenEvent: (event: CalendarEvent, occurrenceDate: Date) => void
  onOpenTodo: (todo: Todo, occurrenceDate: Date) => void
  onOpenShared: (entry: StudySharedItemEntry, occurrenceDate: Date) => void
}

const START_HOUR = 6
const END_HOUR = 24
const PIXELS_PER_MINUTE = 1
const MIN_CARD_HEIGHT = 28
const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']

const toMinutes = (time?: string) => {
  if (!time) return START_HOUR * 60
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

const getTimePosition = (time?: string) =>
  Math.max(
    0,
    Math.min(
      (END_HOUR - START_HOUR) * 60,
      toMinutes(time) - START_HOUR * 60,
    ),
  ) * PIXELS_PER_MINUTE

const getPlanKey = (kind: 'event' | 'todo', id: string) => `${kind}:${id}`

export default function CalendarTimeGrid({
  dates,
  events,
  todos,
  projects,
  sharedItems,
  selectedPlanKeys,
  cutPlanKeys,
  selectedTimeSlotKeys,
  isSelecting,
  surfaceRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onOpenEvent,
  onOpenTodo,
  onOpenShared,
}: CalendarTimeGridProps) {
  const hours = useMemo(
    () =>
      Array.from(
        { length: END_HOUR - START_HOUR + 1 },
        (_, index) => START_HOUR + index,
      ),
    [],
  )
  const dayWidth = 100 / dates.length

  return (
    <section
      className={`calendar-card time-calendar-card${
        dates.length === 1 ? ' day-time-calendar' : ' week-time-calendar'
      }`}
      aria-label={dates.length === 1 ? '일간 시간표' : '주간 시간표'}
    >
      <p className="calendar-range-hint">
        <span aria-hidden="true">⌁</span>
        30분 블록을 드래그해 선택에 추가하세요. 선택 모드에서는 블록을
        눌러 개별 선택하거나 해제할 수 있어요.
      </p>
      <div
        className="time-grid-header"
        style={{ '--time-day-count': dates.length } as CSSProperties}
      >
        <span aria-hidden="true" />
        {dates.map((date) => (
          <strong key={toDateKey(date)}>
            <small>{weekdayLabels[date.getDay()]}</small>
            {date.getMonth() + 1}/{date.getDate()}
          </strong>
        ))}
      </div>
      <div className="time-grid-layout">
        <div className="time-grid-hours" aria-hidden="true">
          {hours.map((hour) => (
            <span
              key={hour}
              style={{ top: `${(hour - START_HOUR) * 60}px` }}
            >
              {String(hour % 24).padStart(2, '0')}:00
            </span>
          ))}
        </div>
        <div
          className={`calendar-selection-surface time-grid-canvas${
            isSelecting ? ' selecting' : ''
          }`}
          ref={surfaceRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onContextMenu={(event) => {
            if (isSelecting) event.preventDefault()
          }}
        >
          {dates.map((date, index) => {
            const dateKey = toDateKey(date)
            return (
              <span
                className="time-grid-day-column"
                data-calendar-date={dateKey}
                key={dateKey}
                style={{
                  left: `${index * dayWidth}%`,
                  width: `${dayWidth}%`,
                }}
                aria-hidden="true"
              />
            )
          })}
          {Array.from(selectedTimeSlotKeys).map((slotKey) => {
            const separatorIndex = slotKey.lastIndexOf(':')
            const dateKey = slotKey.slice(0, separatorIndex)
            const startMinutes = Number(slotKey.slice(separatorIndex + 1))
            const dayIndex = dates.findIndex(
              (date) => toDateKey(date) === dateKey,
            )
            if (dayIndex < 0) return null
            return (
              <span
                className="time-grid-selected-slot"
                key={slotKey}
                style={{
                  left: `${dayIndex * dayWidth}%`,
                  width: `${dayWidth}%`,
                  top: `${startMinutes - START_HOUR * 60}px`,
                  height: '30px',
                }}
                aria-hidden="true"
              />
            )
          })}
          {hours.map((hour) => (
            <span
              className="time-grid-hour-line"
              key={hour}
              style={{ top: `${(hour - START_HOUR) * 60}px` }}
              aria-hidden="true"
            />
          ))}

          {dates.flatMap((date, dayIndex) => {
            const dateKey = toDateKey(date)
            const dateEvents = events.filter((event) =>
              isCalendarEventOnDate(event, dateKey),
            )
            const dateTodos = todos.filter((todo) =>
              isTodoOnDate(todo, dateKey),
            )
            const dateShared = sharedItems.filter(
              (entry) =>
                entry.item.type === 'event' &&
                isSharedItemOnDate(entry.item, dateKey),
            )

            return [
              ...dateEvents.map((event) => {
                const planKey = getPlanKey('event', event.id)
                const top = getTimePosition(event.startTime)
                const duration = event.allDay
                  ? 60
                  : Math.max(
                      toMinutes(event.endTime) - toMinutes(event.startTime),
                      30,
                    )
                const isSelectable = (event.repeat ?? 'none') === 'none'
                return (
                  <button
                    className={`time-grid-plan project-color-surface${
                      selectedPlanKeys.has(planKey) ? ' marquee-selected' : ''
                    }${cutPlanKeys.has(planKey) ? ' cut-pending' : ''}${
                      isSelectable ? '' : ' recurring'
                    }`}
                    data-selectable-plan={isSelectable ? planKey : undefined}
                    data-calendar-date={dateKey}
                    style={
                      {
                        '--project-color': getProjectColorByName(
                          projects,
                          event.project,
                        ),
                        left: `calc(${dayIndex * dayWidth}% + 3px)`,
                        width: `calc(${dayWidth}% - 6px)`,
                        top: `${top}px`,
                        height: `${Math.max(
                          duration * PIXELS_PER_MINUTE,
                          MIN_CARD_HEIGHT,
                        )}px`,
                      } as CSSProperties
                    }
                    type="button"
                    key={`${dateKey}-${event.id}`}
                    onClick={() => onOpenEvent(event, date)}
                    aria-label={`${event.title} 편집`}
                  >
                    <time>
                      {event.allDay
                        ? '종일'
                        : `${event.startTime}–${event.endTime}`}
                    </time>
                    <strong>{event.title}</strong>
                  </button>
                )
              }),
              ...dateTodos.map((todo) => {
                const planKey = getPlanKey('todo', todo.id)
                const isSelectable = (todo.repeat ?? 'none') === 'none'
                return (
                  <button
                    className={`time-grid-plan time-grid-todo project-color-surface${
                      selectedPlanKeys.has(planKey) ? ' marquee-selected' : ''
                    }${cutPlanKeys.has(planKey) ? ' cut-pending' : ''}${
                      isSelectable ? '' : ' recurring'
                    }`}
                    data-selectable-plan={isSelectable ? planKey : undefined}
                    data-calendar-date={dateKey}
                    style={
                      {
                        '--project-color': getProjectColorByName(
                          projects,
                          todo.project,
                        ),
                        left: `calc(${dayIndex * dayWidth}% + 3px)`,
                        width: `calc(${dayWidth}% - 6px)`,
                        top: `${getTimePosition(todo.dueTime)}px`,
                        height: `${MIN_CARD_HEIGHT}px`,
                      } as CSSProperties
                    }
                    type="button"
                    key={`${dateKey}-${todo.id}`}
                    onClick={() => onOpenTodo(todo, date)}
                    aria-label={`${todo.text} 할 일 상세 보기`}
                  >
                    <time>{todo.dueTime}</time>
                    <strong>{todo.text}</strong>
                  </button>
                )
              }),
              ...dateShared.map((entry) => (
                <button
                  className="time-grid-plan shared recurring"
                  data-calendar-date={dateKey}
                  style={{
                    left: `calc(${dayIndex * dayWidth}% + 3px)`,
                    width: `calc(${dayWidth}% - 6px)`,
                    top: `${getTimePosition(entry.item.time)}px`,
                    height: `${Math.max(
                      toMinutes(entry.item.endTime) -
                        toMinutes(entry.item.time),
                      MIN_CARD_HEIGHT,
                    )}px`,
                  }}
                  type="button"
                  key={`${dateKey}-${entry.roomId}-${entry.item.id}`}
                  onClick={() => onOpenShared(entry, date)}
                  aria-label={`${entry.item.title}, 모임 일정`}
                >
                  <time>{entry.item.time ?? '시간 미정'}</time>
                  <strong>{entry.item.title}</strong>
                </button>
              )),
            ]
          })}

        </div>
      </div>
      <p className="time-grid-footnote">
        반복 계획과 모임 공동 계획은 이번 일괄 작업에서 제외됩니다.
      </p>
    </section>
  )
}
