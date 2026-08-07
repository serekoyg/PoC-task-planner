import { FormEvent, useState } from 'react'
import type { CalendarEvent } from '../data/initialData'
import { toDateKey } from '../data/initialData'
import { formatSelectedDate } from '../lib/date'

type SchedulePanelProps = {
  selectedDate: Date
  events: CalendarEvent[]
  onAddEvent: (title: string, time: string) => void
}

export default function SchedulePanel({
  selectedDate,
  events,
  onAddEvent,
}: SchedulePanelProps) {
  const [eventTitle, setEventTitle] = useState('')
  const [eventTime, setEventTime] = useState('09:00')
  const [isEventFormOpen, setIsEventFormOpen] = useState(false)
  const selectedKey = toDateKey(selectedDate)
  const selectedEvents = events
    .filter((event) => event.date === selectedKey)
    .sort((a, b) => a.time.localeCompare(b.time))

  const addEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = eventTitle.trim()
    if (!title) return

    onAddEvent(title, eventTime)
    setEventTitle('')
    setEventTime('09:00')
    setIsEventFormOpen(false)
  }

  return (
    <aside
      className="day-panel schedule-panel"
      aria-labelledby="selected-date-title"
    >
      <div className="section-heading day-heading">
        <div>
          <p className="eyebrow">선택한 날짜</p>
          <h2 id="selected-date-title">{formatSelectedDate(selectedDate)}</h2>
        </div>
        <button
          className="add-event-button"
          type="button"
          onClick={() => setIsEventFormOpen((current) => !current)}
          aria-expanded={isEventFormOpen}
        >
          <span aria-hidden="true">＋</span> 일정
        </button>
      </div>

      {isEventFormOpen && (
        <form className="event-form" onSubmit={addEvent}>
          <label>
            <span className="sr-only">일정 시간</span>
            <input
              type="time"
              value={eventTime}
              onChange={(event) => setEventTime(event.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">일정 이름</span>
            <input
              type="text"
              value={eventTitle}
              onChange={(event) => setEventTitle(event.target.value)}
              placeholder="새 일정 이름"
              autoFocus
            />
          </label>
          <button type="submit">추가</button>
        </form>
      )}

      <div className="schedule-list" aria-label="선택한 날짜의 일정">
        {selectedEvents.length ? (
          selectedEvents.map((item) => (
            <article className="schedule-item" key={item.id}>
              <span
                className={`schedule-dot ${item.color}`}
                aria-hidden="true"
              />
              <div>
                <time>{item.time}</time>
                <p>{item.title}</p>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-schedule-card">
            <span aria-hidden="true">＋</span>
            <p>등록된 일정이 없습니다.</p>
            <small>이날의 첫 일정을 추가해 보세요.</small>
          </div>
        )}
      </div>

      <div className="schedule-tip">
        <span aria-hidden="true">•</span>
        <p>달력에서 날짜를 선택하면 해당 날짜의 일정을 확인할 수 있어요.</p>
      </div>
    </aside>
  )
}
