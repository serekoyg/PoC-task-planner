import { type CSSProperties, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { CalendarEvent } from '../data/initialData'
import {
  BACKLOG_PROJECT_NAME,
  getProjectColorByName,
  type PlannerProject,
} from '../data/projects'
import { toDateKey } from '../data/initialData'
import type { StudySharedItemEntry } from '../data/studyRooms'
import { formatSelectedDate, isCalendarEventOnDate } from '../lib/date'
import { getSharedRepeatLabel, isSharedItemOnDate } from '../lib/studyShared'

type SchedulePanelProps = {
  selectedDate: Date
  events: CalendarEvent[]
  projects: PlannerProject[]
  sharedItems: StudySharedItemEntry[]
  onCreateEvent: () => void
  onEditEvent: (event: CalendarEvent) => void
  onEditSharedEvent: (entry: StudySharedItemEntry) => void
  onToggleSharedItemStatus: (roomId: string, itemId: string) => void
}

const repeatLabels: Record<CalendarEvent['repeat'], string> = {
  none: '',
  daily: '매일 반복',
  weekdays: '평일 반복',
  weekly: '매주 반복',
  monthly: '매월 반복',
  monthlyWeekday: '매월 특정 요일 반복',
}

const reminderLabels: Record<CalendarEvent['reminder'], string> = {
  none: '',
  '10m': '10분 전 알림',
  '30m': '30분 전 알림',
  '1h': '1시간 전 알림',
  '1d': '1일 전 알림',
}

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest}분`
  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`
}

export default function SchedulePanel({
  selectedDate,
  events,
  projects,
  sharedItems,
  onCreateEvent,
  onEditEvent,
  onEditSharedEvent,
  onToggleSharedItemStatus,
}: SchedulePanelProps) {
  const selectedKey = toDateKey(selectedDate)
  const selectedEvents = useMemo(
    () =>
      events
        .filter((event) => isCalendarEventOnDate(event, selectedKey))
        .sort((a, b) => {
          if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
          return a.startTime.localeCompare(b.startTime)
        }),
    [events, selectedKey],
  )
  const selectedSharedEvents = useMemo(
    () =>
      sharedItems.filter(
        (entry) =>
          entry.item.type === 'event' &&
          isSharedItemOnDate(entry.item, selectedKey),
      ),
    [selectedKey, sharedItems],
  )
  const scheduledMinutes = selectedEvents.reduce((total, event) => {
    if (event.allDay) return total
    return total + Math.max(toMinutes(event.endTime) - toMinutes(event.startTime), 0)
  }, 0) + selectedSharedEvents.reduce((total, { item }) => {
    if (!item.time || !item.endTime) return total
    return total + Math.max(toMinutes(item.endTime) - toMinutes(item.time), 0)
  }, 0)
  const nextReminder = selectedEvents.find((event) => event.reminder !== 'none')
  const totalEventCount = selectedEvents.length + selectedSharedEvents.length

  return (
    <aside
      className="day-panel schedule-panel"
      aria-labelledby="selected-date-title"
    >
      <div className="section-heading day-heading schedule-heading">
        <div>
          <p className="eyebrow">선택한 날짜</p>
          <h2 id="selected-date-title">{formatSelectedDate(selectedDate)}</h2>
          <p className="schedule-heading-summary">
            {totalEventCount
              ? `${totalEventCount}개의 일정이 있어요.`
              : '아직 등록된 일정이 없어요.'}
          </p>
        </div>
      </div>

      <div className="schedule-list" aria-label="선택한 날짜의 일정">
        {totalEventCount ? (
          <>
            {selectedEvents.map((item) => (
              <article
                className="schedule-item project-color-surface"
                style={{
                  '--project-color': getProjectColorByName(projects, item.project),
                } as CSSProperties}
                key={item.id}
              >
              <div className="schedule-time-block">
                {item.allDay ? (
                  <strong>하루 종일</strong>
                ) : (
                  <>
                    <strong>{item.startTime}</strong>
                    <span>{item.endTime}</span>
                  </>
                )}
              </div>
              <span className="schedule-dot" aria-hidden="true" />
              <div className="schedule-item-copy">
                <div className="schedule-item-title">
                  <h3>{item.title}</h3>
                  <span>{item.project ?? BACKLOG_PROJECT_NAME} · 나의 계획</span>
                  {item.repeat !== 'none' && <span>{repeatLabels[item.repeat]}</span>}
                </div>
                <div className="schedule-item-meta">
                  {item.location && (
                    <span><i aria-hidden="true">⌖</i>{item.location}</span>
                  )}
                  {item.reminder !== 'none' && (
                    <span><i aria-hidden="true">◷</i>{reminderLabels[item.reminder]}</span>
                  )}
                </div>
                {item.note && <p>{item.note}</p>}
              </div>
              <button
                className="edit-event-button"
                type="button"
                onClick={() => onEditEvent(item)}
                aria-label={`${item.title} 편집`}
              >
                편집
              </button>
              </article>
            ))}
            {selectedSharedEvents.map((entry) => {
              const { roomId, roomName, memberId, item } = entry
              const isParticipating = item.participantMemberIds.includes(memberId)
              return (
                <article className="schedule-item blue shared-schedule-item" key={`${roomId}-${item.id}`}>
                  <div className="schedule-time-block">
                    <strong>{item.time ?? '시간 미정'}</strong>
                    {item.endTime && <span>{item.endTime}</span>}
                  </div>
                  <span className="schedule-dot blue" aria-hidden="true" />
                  <div className="schedule-item-copy">
                    <div className="schedule-item-title">
                      <h3>{item.title}</h3>
                      <Link className="shared-source-badge" to={`/studies/${roomId}`}>
                        {roomName} · 모임
                      </Link>
                      {item.repeat !== 'none' && <span>{getSharedRepeatLabel(item)}</span>}
                    </div>
                    <div className="schedule-item-meta">
                      {item.location && <span><i aria-hidden="true">⌖</i>{item.location}</span>}
                      <span>{item.participantMemberIds.length}명 참여 예정</span>
                    </div>
                    {item.note && <p>{item.note}</p>}
                  </div>
                  <div className="schedule-item-actions">
                    {entry.canManage && (
                      <button
                        className="edit-event-button"
                        type="button"
                        onClick={() => onEditSharedEvent(entry)}
                        aria-label={`${item.title} 편집`}
                      >
                        편집
                      </button>
                    )}
                    <button
                      className={isParticipating ? 'edit-event-button shared-active' : 'edit-event-button'}
                      type="button"
                      onClick={() => onToggleSharedItemStatus(roomId, item.id)}
                    >
                      {isParticipating ? '✓ 참여함' : '참여할게요'}
                    </button>
                  </div>
                </article>
              )
            })}
          </>
        ) : (
          <button className="empty-schedule-card" type="button" onClick={onCreateEvent}>
            <span aria-hidden="true">＋</span>
            <strong>이날의 첫 일정을 추가해 보세요.</strong>
            <small>시간, 장소, 반복과 알림까지 함께 설정할 수 있어요.</small>
          </button>
        )}
      </div>

      <div className="schedule-side-column">
        <section className="schedule-summary-card" aria-label="일정 요약">
          <p className="eyebrow">하루 요약</p>
          <div>
            <span>등록된 일정</span>
            <strong>{totalEventCount}개</strong>
          </div>
          <div>
            <span>예정된 시간</span>
            <strong>{scheduledMinutes ? formatDuration(scheduledMinutes) : '없음'}</strong>
          </div>
          <div>
            <span>다음 알림</span>
            <strong>{nextReminder ? nextReminder.startTime : '없음'}</strong>
          </div>
        </section>

        <div className="schedule-tip">
          <span aria-hidden="true">✦</span>
          <div>
            <strong>잊지 않도록 미리 준비하세요.</strong>
            <p>일정마다 장소와 알림을 함께 적어두면 당일에 다시 찾지 않아도 돼요.</p>
          </div>
        </div>
      </div>

    </aside>
  )
}
