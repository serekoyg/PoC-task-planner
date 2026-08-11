import { useMemo, useState } from 'react'
import ProjectSidebar, {
  type ProjectFilter,
} from '../components/ProjectSidebar'
import SchedulePanel from '../components/SchedulePanel'
import type { CalendarEvent, CalendarEventInput } from '../data/initialData'
import { toDateKey } from '../data/initialData'
import type { PlannerProject, ProjectInput } from '../data/projects'
import {
  formatSelectedDate,
  getCalendarDays,
  getWeekDays,
  moveDate,
} from '../lib/date'

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']

type CalendarView = 'day' | 'week' | 'month'

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

type CalendarPageProps = {
  today: Date
  selectedDate: Date
  visibleMonth: Date
  events: CalendarEvent[]
  projects: PlannerProject[]
  onSelectDate: (date: Date) => void
  onMoveMonth: (amount: number) => void
  onSelectToday: () => void
  onAddEvent: (event: CalendarEventInput) => void
  onUpdateEvent: (eventId: string, event: CalendarEventInput) => void
  onRemoveEvent: (eventId: string) => void
  onCreateProject: (input: ProjectInput) => string
  onUpdateProject: (projectId: string, input: ProjectInput) => void
  onDeleteProject: (projectId: string) => void
}

export default function CalendarPage({
  today,
  selectedDate,
  visibleMonth,
  events,
  projects,
  onSelectDate,
  onMoveMonth,
  onSelectToday,
  onAddEvent,
  onUpdateEvent,
  onRemoveEvent,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
}: CalendarPageProps) {
  const [selectedProjectId, setSelectedProjectId] =
    useState<ProjectFilter>('all')
  const [calendarView, setCalendarView] = useState<CalendarView>('month')
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
  const isInboxEvent = (event: CalendarEvent) =>
    !event.project || event.project === '받은 편지함'
  const filteredEvents = useMemo(() => {
    if (selectedProjectId === 'all') return events
    if (selectedProjectId === 'inbox') return events.filter(isInboxEvent)
    const project = projects.find((item) => item.id === selectedProjectId)
    return project
      ? events.filter((event) => event.project === project.name)
      : events
  }, [events, projects, selectedProjectId])
  const projectCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: events.length,
      inbox: events.filter(isInboxEvent).length,
    }
    projects.forEach((project) => {
      counts[project.id] = events.filter(
        (event) => event.project === project.name,
      ).length
    })
    return counts
  }, [events, projects])
  const selectedProjectName =
    selectedProject?.name ??
    (selectedProjectId === 'inbox' ? '받은 편지함' : '모든 프로젝트')
  const periodTitle =
    calendarView === 'day'
      ? formatSelectedDate(selectedDate)
      : calendarView === 'week'
        ? formatWeekTitle(weekDays)
        : `${visibleMonth.getFullYear()}년 ${visibleMonth.getMonth() + 1}월`

  const movePeriod = (amount: number) => {
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
    onSelectDate(moveDate(selectedDate, calendarView === 'week' ? amount * 7 : amount))
  }

  const openDayView = (date: Date) => {
    onSelectDate(date)
    setCalendarView('day')
  }

  return (
    <main className="planner calendar-page">
      <div className="project-filter-layout">
        <ProjectSidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          itemCounts={projectCounts}
          itemLabel="일정"
          onSelectProject={setSelectedProjectId}
          onCreateProject={onCreateProject}
          onUpdateProject={onUpdateProject}
          onDeleteProject={onDeleteProject}
        />

        <div className="project-filter-content calendar-view-content">
          <header className="calendar-view-toolbar">
            <div>
              <p className="eyebrow">{selectedProjectName}</p>
              <h1>{periodTitle}</h1>
            </div>
            <div className="calendar-view-actions">
              <div className="calendar-view-tabs" aria-label="캘린더 보기 선택">
                {(Object.keys(viewLabels) as CalendarView[]).map((view) => (
                  <button
                    className={calendarView === view ? 'active' : ''}
                    type="button"
                    key={view}
                    onClick={() => setCalendarView(view)}
                    aria-pressed={calendarView === view}
                  >
                    {viewLabels[view]}
                  </button>
                ))}
              </div>
              <div className="calendar-period-navigation">
                <button
                  className="today-button"
                  type="button"
                  onClick={onSelectToday}
                >
                  오늘
                </button>
                <div className="month-navigation" aria-label={`${viewLabels[calendarView]} 이동`}>
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
            <SchedulePanel
              selectedDate={selectedDate}
              events={filteredEvents}
              projects={projects}
              defaultProjectName={selectedProject?.name}
              onAddEvent={onAddEvent}
              onUpdateEvent={onUpdateEvent}
              onRemoveEvent={onRemoveEvent}
            />
          )}

          {calendarView === 'week' && (
            <section className="calendar-card week-calendar-card" aria-label="주간 일정">
              <div className="week-calendar-grid">
                {weekDays.map((date, index) => {
                  const dateKey = toDateKey(date)
                  const dateEvents = filteredEvents
                    .filter((event) => event.date === dateKey)
                    .sort((first, second) =>
                      first.startTime.localeCompare(second.startTime),
                    )
                  const isSelected = dateKey === selectedKey
                  const isToday = dateKey === todayKey

                  return (
                    <article
                      className={`week-day${isSelected ? ' selected' : ''}${
                        isToday ? ' today' : ''
                      }`}
                      key={dateKey}
                    >
                      <button
                        className="week-day-heading"
                        type="button"
                        onClick={() => onSelectDate(date)}
                        aria-label={`${formatSelectedDate(date)} 선택`}
                        aria-pressed={isSelected}
                      >
                        <span>{weekdayLabels[index]}</span>
                        <strong>{date.getDate()}</strong>
                      </button>
                      <div className="week-day-events">
                        {dateEvents.map((event) => (
                          <button
                            className={`week-event ${event.color}`}
                            type="button"
                            key={event.id}
                            onClick={() => openDayView(date)}
                            aria-label={`${event.title}, 일간 보기에서 열기`}
                          >
                            <time>{event.allDay ? '종일' : event.startTime}</time>
                            <strong>{event.title}</strong>
                            <small>{event.project ?? '받은 편지함'}</small>
                          </button>
                        ))}
                        {!dateEvents.length && <span className="week-day-empty">일정 없음</span>}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )}

          {calendarView === 'month' && (
            <section className="calendar-card" aria-label="월간 일정">
              <div className="calendar-grid weekday-row" aria-hidden="true">
                {weekdayLabels.map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>

              <div className="calendar-grid month-grid">
                {calendarDays.map((date) => {
                  const dateKey = toDateKey(date)
                  const dateEvents = filteredEvents.filter(
                    (item) => item.date === dateKey,
                  )
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
                      onDoubleClick={() => openDayView(date)}
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
          )}
        </div>
      </div>
    </main>
  )
}
