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
      className="schedule-panel"
      aria-labelledby="selected-date-title"
    >
      <div className="schedule-header">
        <div>
          <p className="section-label">선택한 날짜</p>
          <h2 id="selected-date-title">{formatSelectedDate(selectedDate)}</h2>
          <span className="event-count">일정 {selectedEvents.length}개</span>
        </div>
        <button
          className="add-event-button"
          type="button"
          onClick={() => setIsEventFormOpen((current) => !current)}
          aria-expanded={isEventFormOpen}
        >
          <span aria-hidden="true">＋</span> 일정 추가
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
              placeholder="일정 이름을 입력하세요"
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
              <time className={`schedule-time ${item.color}`}>{item.time}</time>
              <div className="schedule-content">
                <p>{item.title}</p>
                <small>개인 일정</small>
              </div>
              <span className={`schedule-dot ${item.color}`} aria-hidden="true" />
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

      <div className="schedule-footer">
        <span aria-hidden="true">✦</span>
        <p>
          {selectedEvents.length
            ? '일정 사이에 여유 시간을 남겨두면 하루가 한결 가벼워져요.'
            : '비어 있는 날이에요. 중요한 약속이 있다면 지금 추가해 보세요.'}
        </p>
      </div>
    </aside>
  )
}
