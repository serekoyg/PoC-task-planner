import { useMemo } from 'react'
import SchedulePanel from '../components/SchedulePanel'
import type { CalendarEvent, CalendarEventInput } from '../data/initialData'
import { toDateKey } from '../data/initialData'
import { formatSelectedDate, getCalendarDays } from '../lib/date'

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']

type CalendarPageProps = {
  today: Date
  selectedDate: Date
  visibleMonth: Date
  events: CalendarEvent[]
  onSelectDate: (date: Date) => void
  onMoveMonth: (amount: number) => void
  onSelectToday: () => void
  onAddEvent: (event: CalendarEventInput) => void
  onUpdateEvent: (eventId: string, event: CalendarEventInput) => void
  onRemoveEvent: (eventId: string) => void
}

export default function CalendarPage({
  today,
  selectedDate,
  visibleMonth,
  events,
  onSelectDate,
  onMoveMonth,
  onSelectToday,
  onAddEvent,
  onUpdateEvent,
  onRemoveEvent,
}: CalendarPageProps) {
  const selectedKey = toDateKey(selectedDate)
  const todayKey = toDateKey(today)
  const calendarDays = useMemo(
    () => getCalendarDays(visibleMonth),
    [visibleMonth],
  )
  return (
    <main className="planner calendar-page">
      <SchedulePanel
        selectedDate={selectedDate}
        events={events}
        onAddEvent={onAddEvent}
        onUpdateEvent={onUpdateEvent}
        onRemoveEvent={onRemoveEvent}
      />

      <section className="calendar-card" aria-labelledby="calendar-title">
        <div className="section-heading calendar-heading">
          <div>
            <p className="eyebrow">나의 일정</p>
            <h1 id="calendar-title">
              {visibleMonth.getFullYear()}년 {visibleMonth.getMonth() + 1}월
            </h1>
          </div>
          <div className="calendar-actions">
            <button
              className="today-button"
              type="button"
              onClick={onSelectToday}
            >
              오늘
            </button>
            <div className="month-navigation" aria-label="월 이동">
              <button
                type="button"
                onClick={() => onMoveMonth(-1)}
                aria-label="이전 달"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => onMoveMonth(1)}
                aria-label="다음 달"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        <div className="calendar-grid weekday-row" aria-hidden="true">
          {weekdayLabels.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>

        <div className="calendar-grid month-grid">
          {calendarDays.map((date) => {
            const dateKey = toDateKey(date)
            const dateEvents = events.filter((item) => item.date === dateKey)
            const isSelected = dateKey === selectedKey
            const isToday = dateKey === todayKey
            const isCurrentMonth = date.getMonth() === visibleMonth.getMonth()

            return (
              <button
                className={`calendar-day${isSelected ? ' selected' : ''}${
                  isToday ? ' today' : ''
                }${isCurrentMonth ? '' : ' muted'}`}
                type="button"
                key={dateKey}
                onClick={() => onSelectDate(date)}
                aria-label={`${formatSelectedDate(date)}${
                  dateEvents.length ? `, 일정 ${dateEvents.length}개` : ''
                }`}
                aria-pressed={isSelected}
              >
                <span className="day-number">{date.getDate()}</span>
                <span className="day-events" aria-hidden="true">
                  {dateEvents.slice(0, 2).map((item) => (
                    <span className={`event-chip ${item.color}`} key={item.id}>
                      {item.allDay ? '종일' : item.startTime} {item.title}
                    </span>
                  ))}
                  {dateEvents.length > 2 && (
                    <span className="more-events">+{dateEvents.length - 2}</span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </section>

    </main>
  )
}
