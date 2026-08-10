import { useMemo, useState } from 'react'
import ProjectSidebar, {
  type ProjectFilter,
} from '../components/ProjectSidebar'
import SchedulePanel from '../components/SchedulePanel'
import type { CalendarEvent, CalendarEventInput } from '../data/initialData'
import { toDateKey } from '../data/initialData'
import type { PlannerProject, ProjectInput } from '../data/projects'
import { formatSelectedDate, getCalendarDays } from '../lib/date'

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']

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
  const selectedKey = toDateKey(selectedDate)
  const todayKey = toDateKey(today)
  const calendarDays = useMemo(
    () => getCalendarDays(visibleMonth),
    [visibleMonth],
  )
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

        <div className="project-filter-content">
          <SchedulePanel
            selectedDate={selectedDate}
            events={filteredEvents}
            projects={projects}
            defaultProjectName={selectedProject?.name}
            onAddEvent={onAddEvent}
            onUpdateEvent={onUpdateEvent}
            onRemoveEvent={onRemoveEvent}
          />

          <section className="calendar-card" aria-labelledby="calendar-title">
            <div className="section-heading calendar-heading">
              <div>
                <p className="eyebrow">
                  {selectedProject?.name ??
                    (selectedProjectId === 'inbox' ? '받은 편지함' : '모든 프로젝트')}
                </p>
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
        </div>
      </div>
    </main>
  )
}
