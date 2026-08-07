import { useMemo } from 'react'
import SchedulePanel from '../components/SchedulePanel'
import type { CalendarEvent } from '../data/initialData'
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
  onAddEvent: (title: string, time: string) => void
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
}: CalendarPageProps) {
  const selectedKey = toDateKey(selectedDate)
  const todayKey = toDateKey(today)
  const calendarDays = useMemo(
    () => getCalendarDays(visibleMonth),
    [visibleMonth],
  )
  const monthEventCount = events.filter((event) => {
    const eventDate = new Date(`${event.date}T00:00:00`)
    return (
      eventDate.getFullYear() === visibleMonth.getFullYear() &&
      eventDate.getMonth() === visibleMonth.getMonth()
    )
  }).length

  return (
    <main className="page calendar-page">
      <section className="page-heading" aria-labelledby="calendar-page-title">
        <div>
          <p className="eyebrow">Calendar</p>
          <h1 id="calendar-page-title">이번 달의 흐름을 한눈에</h1>
          <p className="page-description">
            날짜를 선택하면 오른쪽에서 일정을 바로 확인하고 추가할 수 있어요.
          </p>
        </div>
        <div className="page-stat" aria-label={`이번 달 일정 ${monthEventCount}개`}>
          <span>이번 달 일정</span>
          <strong>{monthEventCount}</strong>
          <small>개의 약속이 있어요</small>
        </div>
      </section>

      <div className="calendar-layout">
        <section className="calendar-card" aria-labelledby="calendar-title">
          <div className="section-heading calendar-heading">
            <div>
              <p className="section-label">월간 일정</p>
              <h2 id="calendar-title">
                {visibleMonth.getFullYear()}년 {visibleMonth.getMonth() + 1}월
              </h2>
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
                        <time>{item.time}</time> {item.title}
                      </span>
                    ))}
                    {dateEvents.length > 2 && (
                      <span className="more-events">+{dateEvents.length - 2}개 더보기</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <SchedulePanel
          selectedDate={selectedDate}
          events={events}
          onAddEvent={onAddEvent}
        />
      </div>
    </main>
  )
}
