import type { RefObject } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  getProjectColor,
  type PlanCollection,
  type PlannerProject,
} from '../data/projects'

type AppSidebarProps = {
  projects: PlannerProject[]
  itemCounts: Record<string, number>
  collectionCounts: Record<PlanCollection, number>
  today: Date
  unreadNotificationCount: number
  isNotificationInboxOpen: boolean
  isProfileMenuOpen: boolean
  isMobileOpen: boolean
  isCollapsed: boolean
  isFocusAlwaysVisible: boolean
  profileActionMessage: string
  profileMenuRef: RefObject<HTMLDivElement | null>
  onToggleMobile: () => void
  onToggleCollapsed: () => void
  onCloseMobile: () => void
  onSearch: () => void
  onSelectToday: () => void
  onToggleNotifications: () => void
  onToggleProfile: () => void
  onToggleFocusAlwaysVisible: () => void
  onSync: () => void
  onLogout: () => void
}

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="6" />
    <path d="m16 16 4 4" />
  </svg>
)

const BellIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8" />
    <path d="M10 21h4" />
  </svg>
)

export default function AppSidebar({
  projects,
  itemCounts,
  collectionCounts,
  today,
  unreadNotificationCount,
  isNotificationInboxOpen,
  isProfileMenuOpen,
  isMobileOpen,
  isCollapsed,
  isFocusAlwaysVisible,
  profileActionMessage,
  profileMenuRef,
  onToggleMobile,
  onToggleCollapsed,
  onCloseMobile,
  onSearch,
  onSelectToday,
  onToggleNotifications,
  onToggleProfile,
  onToggleFocusAlwaysVisible,
  onSync,
  onLogout,
}: AppSidebarProps) {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const selectedProjectId = searchParams.get('project') ?? 'all'
  const isPlannerRoute =
    location.pathname.startsWith('/calendar') ||
    location.pathname.startsWith('/todos')
  const plannerPath = location.pathname.startsWith('/calendar')
    ? '/calendar'
    : '/todos'
  const selectedCollection = location.pathname.startsWith('/collections/')
    ? (location.pathname.split('/').at(-1) as PlanCollection)
    : undefined
  const projectTarget = (projectId: string) =>
    projectId === 'all'
      ? plannerPath
      : `${plannerPath}?project=${encodeURIComponent(projectId)}`

  return (
    <>
      <button
        className={`sidebar-mobile-toggle${isMobileOpen ? ' open' : ''}`}
        type="button"
        aria-label={isMobileOpen ? '메뉴 닫기' : '메뉴 열기'}
        aria-expanded={isMobileOpen}
        aria-controls="app-sidebar"
        onClick={onToggleMobile}
      >
        <span aria-hidden="true">{isMobileOpen ? '×' : '☰'}</span>
      </button>

      <button
        className={`sidebar-desktop-toggle${isCollapsed ? ' visible' : ''}`}
        type="button"
        aria-label="왼쪽 사이드바 열기"
        aria-controls="app-sidebar"
        aria-expanded={!isCollapsed}
        onClick={onToggleCollapsed}
      >
        <span aria-hidden="true">›</span>
      </button>

      {isMobileOpen && (
        <button
          className="sidebar-mobile-backdrop"
          type="button"
          aria-label="메뉴 닫기"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`app-sidebar${isMobileOpen ? ' mobile-open' : ''}${
          isCollapsed ? ' collapsed' : ''
        }`}
        id="app-sidebar"
        aria-label="전체 메뉴"
      >
        <div className="sidebar-brand-row">
          <Link className="sidebar-brand" to="/calendar" aria-label="하루 홈">
            <span className="brand-mark" aria-hidden="true">H</span>
            <span>
              <strong>하루</strong>
              <small>나의 하루 플래너</small>
            </span>
          </Link>
          <button
            className="sidebar-collapse-button"
            type="button"
            aria-label="왼쪽 사이드바 닫기"
            aria-controls="app-sidebar"
            onClick={onToggleCollapsed}
          >
            <span aria-hidden="true">‹</span>
          </button>
        </div>

        <Link className="sidebar-today-line" to="/calendar" onClick={onSelectToday}>
          <strong>오늘</strong>
          <span aria-hidden="true">·</span>
          <small>
            {today.toLocaleDateString('ko-KR', {
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            }).replace(/[()]/g, '')}
          </small>
        </Link>

        <div className="sidebar-utility-row">
          <button className="sidebar-search" type="button" onClick={onSearch}>
            <SearchIcon />
            <span>검색</span>
            <kbd>⌘ K</kbd>
          </button>
          <button
            className={`sidebar-notification top${
              isNotificationInboxOpen ? ' active' : ''
            }`}
            type="button"
            aria-label={`알림 수신함, 읽지 않은 알림 ${unreadNotificationCount}개`}
            aria-expanded={isNotificationInboxOpen}
            onClick={onToggleNotifications}
          >
            <BellIcon />
            {unreadNotificationCount > 0 && (
              <small>{unreadNotificationCount}</small>
            )}
          </button>
        </div>

        <nav className="sidebar-primary-nav" aria-label="주요 메뉴">
          <Link
            className={location.pathname.startsWith('/calendar') ? 'active' : ''}
            to="/calendar"
          >
            <span className="sidebar-nav-icon calendar" aria-hidden="true">▦</span>
            <span>캘린더</span>
          </Link>
          <Link
            className={
              location.pathname.startsWith('/todos') || selectedCollection
                ? 'active'
                : ''
            }
            to="/todos"
          >
            <span className="sidebar-nav-icon todo" aria-hidden="true">✓</span>
            <span>할 일</span>
          </Link>
          <Link
            className={location.pathname.startsWith('/studies') ? 'active' : ''}
            to="/studies"
          >
            <span className="sidebar-nav-icon study" aria-hidden="true">◉</span>
            <span>모임</span>
          </Link>
        </nav>

        <div className="sidebar-divider" />

        <section className="sidebar-lists" aria-labelledby="sidebar-list-title">
          <div className="sidebar-section-heading">
            <h2 id="sidebar-list-title">목록</h2>
            <Link
              to="/settings?section=lists"
              state={{
                settingsReturnTo: `${location.pathname}${location.search}`,
              }}
              aria-label="목록 관리"
            >
              ＋
            </Link>
          </div>
          <nav aria-label="나의 목록">
            <Link
              className={
                isPlannerRoute && !selectedCollection && selectedProjectId === 'all'
                  ? 'active'
                  : ''
              }
              to={projectTarget('all')}
            >
              <span className="sidebar-list-icon all" aria-hidden="true">◆</span>
              <span>모든 목록</span>
              <small>{itemCounts.all ?? 0}</small>
            </Link>
            <Link
              className={
                isPlannerRoute && selectedProjectId === 'backlog' ? 'active' : ''
              }
              to={projectTarget('backlog')}
            >
              <span className="sidebar-list-icon backlog" aria-hidden="true">○</span>
              <span>미분류</span>
              <small>{itemCounts.backlog ?? 0}</small>
            </Link>
            {projects.map((project) => (
              <Link
                className={
                  isPlannerRoute && selectedProjectId === project.id ? 'active' : ''
                }
                key={project.id}
                to={projectTarget(project.id)}
              >
                <span
                  className="sidebar-list-icon"
                  style={{ backgroundColor: getProjectColor(project) }}
                  aria-hidden="true"
                />
                <span>{project.name}</span>
                <small>{itemCounts[project.id] ?? 0}</small>
              </Link>
            ))}
          </nav>

          <nav className="sidebar-collections" aria-label="계획 보관함">
            <Link
              className={selectedCollection === 'completed' ? 'active' : ''}
              to="/collections/completed"
            >
              <span className="sidebar-list-icon collection" aria-hidden="true">✓</span>
              <span>완료 모음</span>
              <small>{collectionCounts.completed}</small>
            </Link>
            <Link
              className={selectedCollection === 'trash' ? 'active' : ''}
              to="/collections/trash"
            >
              <span className="sidebar-list-icon collection muted" aria-hidden="true">♲</span>
              <span>쓰레기통</span>
              <small>{collectionCounts.trash}</small>
            </Link>
          </nav>
        </section>

        <div className="sidebar-bottom">
          <div className="profile-menu sidebar-profile-menu" ref={profileMenuRef}>
            <button
              className={`sidebar-profile-trigger${isProfileMenuOpen ? ' active' : ''}`}
              type="button"
              aria-label="사용자 메뉴"
              aria-controls="profile-menu-popover"
              aria-expanded={isProfileMenuOpen}
              onClick={onToggleProfile}
            >
              <span className="avatar" aria-hidden="true">민</span>
              <span>
                <strong>민서</strong>
                <small>개인 설정</small>
              </span>
              <i aria-hidden="true">•••</i>
            </button>

            {isProfileMenuOpen && (
              <div
                className="profile-menu-popover"
                id="profile-menu-popover"
                role="menu"
              >
                <div className="profile-menu-user">
                  <span aria-hidden="true">민</span>
                  <div>
                    <strong>민서</strong>
                    <small>오늘도 한 걸음씩</small>
                  </div>
                </div>
                <div className="profile-menu-links">
                  <Link role="menuitem" to="/profile">
                    <span aria-hidden="true">◯</span>
                    내 프로필
                    <i aria-hidden="true">›</i>
                  </Link>
                  <Link
                    role="menuitem"
                    to="/settings"
                    state={{
                      settingsReturnTo: `${location.pathname}${location.search}`,
                    }}
                  >
                    <span aria-hidden="true">⚙</span>
                    설정
                    <i aria-hidden="true">›</i>
                  </Link>
                  <button role="menuitem" type="button" onClick={onSync}>
                    <span aria-hidden="true">↻</span>
                    지금 동기화
                    <i aria-hidden="true">›</i>
                  </button>
                </div>
                <div className="profile-menu-preferences">
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={isFocusAlwaysVisible}
                    onClick={onToggleFocusAlwaysVisible}
                  >
                    <span aria-hidden="true">◉</span>
                    <span>
                      <strong>LIVE FOCUS 항상 표시</strong>
                      <small>집중이 없어도 상단에 유지해요.</small>
                    </span>
                    <span
                      className={`sidebar-setting-toggle${
                        isFocusAlwaysVisible ? ' active' : ''
                      }`}
                      aria-hidden="true"
                    >
                      <i />
                    </span>
                  </button>
                </div>
                <p className="profile-menu-message" aria-live="polite">
                  <span aria-hidden="true">●</span> {profileActionMessage}
                </p>
                <button
                  className="profile-menu-logout"
                  role="menuitem"
                  type="button"
                  onClick={onLogout}
                >
                  <span aria-hidden="true">↪</span>
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
