import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarEvent, Todo } from '../data/initialData'
import { BACKLOG_PROJECT_NAME } from '../data/projects'
import type { StudyRoom } from '../data/studyRooms'
import type { PlannerTarget } from '../lib/plannerNavigation'

type GlobalSearchProps = {
  events: CalendarEvent[]
  todos: Todo[]
  rooms: StudyRoom[]
  onClose: () => void
  onSelect: (target: PlannerTarget) => void
}

type SearchResult = {
  key: string
  kind: '일정' | '할 일' | '모임'
  title: string
  description: string
  meta: string
  keywords: string
  target: PlannerTarget
}

const formatResultDate = (dateKey: string) => {
  const date = new Date(`${dateKey}T00:00:00`)
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
}

export default function GlobalSearch({
  events,
  todos,
  rooms,
  onClose,
  onSelect,
}: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const allResults = useMemo<SearchResult[]>(
    () => [
      ...events.map((event) => ({
        key: `event-${event.id}`,
        kind: '일정' as const,
        title: event.title,
        description: event.location || event.note || '등록된 일정',
        meta: `${formatResultDate(event.date)} · ${
          event.allDay ? '하루 종일' : event.startTime
        } · ${event.project ?? BACKLOG_PROJECT_NAME} · 나의 계획`,
        keywords: [
          event.title,
          event.location,
          event.note,
          event.project,
        ]
          .filter(Boolean)
          .join(' '),
        target: { kind: 'event' as const, id: event.id, date: event.date },
      })),
      ...todos.map((todo) => ({
        key: `todo-${todo.id}`,
        kind: '할 일' as const,
        title: todo.text,
        description: todo.note || todo.memo || '등록된 할 일',
        meta: `${formatResultDate(todo.date)} · ${
          todo.dueTime || '시간 미정'
        } · ${todo.project ?? BACKLOG_PROJECT_NAME} · 나의 계획${todo.done ? ' · 완료' : ''}`,
        keywords: [
          todo.text,
          todo.note,
          todo.memo,
          todo.project,
        ]
          .filter(Boolean)
          .join(' '),
        target: { kind: 'todo' as const, id: todo.id },
      })),
      ...rooms.map((room) => ({
        key: `study-${room.id}`,
        kind: '모임' as const,
        title: room.name,
        description: room.description,
        meta: `${room.category} 분류 · ${room.memberCount}/${room.maxMembers}명${
          room.joined ? ' · 참여 중' : ''
        }`,
        keywords: [room.name, room.description, room.category, room.goal].join(' '),
        target: { kind: 'study' as const, id: room.id },
      })),
    ],
    [events, rooms, todos],
  )

  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
  const visibleResults = normalizedQuery
    ? allResults.filter((result) =>
        result.keywords.toLocaleLowerCase('ko-KR').includes(normalizedQuery),
      )
    : allResults.slice(0, 6)

  const closeFromBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.currentTarget === event.target) onClose()
  }

  return (
    <div className="global-search-backdrop" onMouseDown={closeFromBackdrop}>
      <section
        className="global-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-search-title"
      >
        <h2 className="sr-only" id="global-search-title">
          통합 검색
        </h2>
        <label className="global-search-field">
          <span aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            type="search"
            aria-label="통합 검색어"
            placeholder="일정, 할 일, 모임을 검색하세요"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && visibleResults[0]) {
                onSelect(visibleResults[0].target)
              }
            }}
          />
          <kbd>ESC</kbd>
        </label>

        <div className="global-search-summary">
          <div>
            <strong>{normalizedQuery ? `'${query.trim()}' 검색 결과` : '빠른 탐색'}</strong>
            <span>{visibleResults.length}개 항목</span>
          </div>
          {query && (
            <button type="button" onClick={() => setQuery('')}>
              검색어 지우기
            </button>
          )}
        </div>

        {visibleResults.length > 0 ? (
          <ul className="global-search-results">
            {visibleResults.map((result) => (
              <li key={result.key}>
                <button type="button" onClick={() => onSelect(result.target)}>
                  <span
                    className={`search-result-icon ${
                      result.kind === '일정'
                        ? 'event'
                        : result.kind === '할 일'
                          ? 'todo'
                          : 'study'
                    }`}
                    aria-hidden="true"
                  >
                    {result.kind === '일정' ? '▦' : result.kind === '할 일' ? '✓' : '◉'}
                  </span>
                  <span className="search-result-copy">
                    <span>
                      <small>{result.kind}</small>
                      <strong>{result.title}</strong>
                    </span>
                    <span>{result.description}</span>
                  </span>
                  <span className="search-result-meta">
                    {result.meta}
                    <i aria-hidden="true">→</i>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="global-search-empty">
            <span aria-hidden="true">⌕</span>
            <strong>일치하는 항목이 없어요</strong>
            <p>다른 제목이나 목록 이름으로 다시 검색해 보세요.</p>
          </div>
        )}

        <div className="global-search-footer">
          <span>일정 · 할 일 · 모임 통합 검색</span>
          <span><kbd>Enter</kbd> 열기</span>
        </div>
      </section>
    </div>
  )
}
