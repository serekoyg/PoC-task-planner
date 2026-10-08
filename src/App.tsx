import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import GlobalSearch from './components/GlobalSearch'
import NotificationInbox from './components/NotificationInbox'
import ActiveFocusPopover from './components/ActiveFocusPopover'
import AppSidebar from './components/AppSidebar'
import type { FocusRecord } from './data/focusRecords'
import { useStoredState } from './hooks/useStoredState'
import { usePersonalPlans } from './hooks/usePersonalPlans'
import { useStudyRooms } from './hooks/useStudyRooms'
import { useFocusSessions } from './hooks/useFocusSessions'
import {
  AUTH_STORAGE_KEY,
  AUTH_METHOD_STORAGE_KEY,
  LIVE_FOCUS_ALWAYS_VISIBLE_STORAGE_KEY,
  NOTIFICATION_STORAGE_KEY,
  readNotifications,
  readStorage,
} from './lib/plannerStorage'
import {
  FocusSessionRoute,
  FocusResultRoute,
  StudyRoomRoute,
  StudyRoomManagementRoute,
  StudyMemberProfileRoute,
} from './routes/PlannerRoutes'
import type { AuthMethod } from './lib/auth'
import type { PlannerTarget } from './lib/plannerNavigation'
import CalendarPage from './pages/CalendarPage'
import LoginPage from './pages/LoginPage'
import PlanCollectionsPage from './pages/PlanCollectionsPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import SignupPage from './pages/SignupPage'
import StudyRoomsPage from './pages/StudyRoomsPage'
import TodosPage from './pages/TodosPage'

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const today = useMemo(() => new Date(), [])
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem(AUTH_STORAGE_KEY) === 'true',
  )
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isNotificationInboxOpen, setIsNotificationInboxOpen] = useState(false)
  const [isFocusPopoverOpen, setIsFocusPopoverOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isFocusAlwaysVisible, setIsFocusAlwaysVisible] = useStoredState(LIVE_FOCUS_ALWAYS_VISIBLE_STORAGE_KEY, () =>
    readStorage<boolean>(LIVE_FOCUS_ALWAYS_VISIBLE_STORAGE_KEY, () => false),
  )
  const [profileActionMessage, setProfileActionMessage] = useState(
    '오늘 오후 9:27에 동기화됨',
  )
  const [selectedDate, setSelectedDate] = useState(today)
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const {
    todos, events, projects, trash, calendarTodoVisibility, collectionCounts, projectPlanCounts,
    addTodo, updateTodo, toggleTodo, setTodoCompleted, removeTodo, addEvent, updateEvent, removeEvent,
    createProject, updateProject, deleteProject, reorderProjects,
    restoreTrash, deleteTrash, emptyTrash, setCalendarTodoVisibility,
  } = usePersonalPlans()
  const {
    studyRooms, joinedStudyRooms, myProfileVisibility, sharedItemEntries,
    requestStudyRoomJoin, changeStudyRoom, updateMyProfileVisibility,
    toggleSharedItemStatus, setSharedTodoCompleted, updateSharedItem, createStudyRoom,
  } = useStudyRooms()
  const changeFocusSourceStatus = useCallback((
    source: Pick<FocusRecord, 'sourceType' | 'sourceId' | 'roomId'>,
    completed: boolean,
    changedAt: string,
  ) => {
    if (source.sourceType === 'todo') setTodoCompleted(source.sourceId, completed)
    else if (source.roomId) setSharedTodoCompleted(source.roomId, source.sourceId, completed, changedAt)
  }, [setSharedTodoCompleted, setTodoCompleted])
  const {
    unfinishedFocusRecords, focusResults, focusNowMs,
    startFocus, restartFocus, pauseFocus, finishFocus, pauseAllFocus,
  } = useFocusSessions(changeFocusSourceStatus)
  const [notifications, setNotifications] = useStoredState(NOTIFICATION_STORAGE_KEY, readNotifications)
  const unreadNotificationCount = notifications.filter((notification) => !notification.read).length
  const shouldShowFocusIsland = unfinishedFocusRecords.length > 0 || isFocusAlwaysVisible

  const login = (method: AuthMethod) => {
    localStorage.setItem(AUTH_STORAGE_KEY, 'true')
    localStorage.setItem(AUTH_METHOD_STORAGE_KEY, method)
    setIsAuthenticated(true)
  }

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem(AUTH_METHOD_STORAGE_KEY)
    setIsProfileMenuOpen(false)
    setIsAuthenticated(false)
  }

  useEffect(() => {
    setIsProfileMenuOpen(false)
    setIsSearchOpen(false)
    setIsNotificationInboxOpen(false)
    setIsFocusPopoverOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const openGlobalSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setIsProfileMenuOpen(false)
        setIsNotificationInboxOpen(false)
        setIsFocusPopoverOpen(false)
        setIsSearchOpen(true)
      }
    }

    window.addEventListener('keydown', openGlobalSearch)
    return () => window.removeEventListener('keydown', openGlobalSearch)
  }, [])

  useEffect(() => {
    if (!isProfileMenuOpen) return

    const closeProfileMenu = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }
    const closeProfileMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsProfileMenuOpen(false)
    }

    document.addEventListener('mousedown', closeProfileMenu)
    window.addEventListener('keydown', closeProfileMenuOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeProfileMenu)
      window.removeEventListener('keydown', closeProfileMenuOnEscape)
    }
  }, [isProfileMenuOpen])

  const selectToday = () => {
    const now = new Date()
    setSelectedDate(now)
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  const selectDate = (date: Date) => {
    setSelectedDate(date)
    setVisibleMonth(
      (current) =>
        current.getFullYear() === date.getFullYear() &&
        current.getMonth() === date.getMonth()
          ? current
          : new Date(date.getFullYear(), date.getMonth(), 1),
    )
  }

  const navigateToTarget = (target: PlannerTarget) => {
    if (target.kind === 'event') {
      selectDate(new Date(`${target.date}T00:00:00`))
      navigate('/calendar')
    } else if (target.kind === 'todo') {
      navigate(`/todos/${target.id}`)
    } else {
      navigate(`/studies/${target.id}`)
    }
    setIsSearchOpen(false)
    setIsNotificationInboxOpen(false)
    setIsFocusPopoverOpen(false)
  }

  const openSearch = () => {
    setIsProfileMenuOpen(false)
    setIsNotificationInboxOpen(false)
    setIsFocusPopoverOpen(false)
    setIsSearchOpen(true)
  }

  const toggleNotificationInbox = () => {
    setIsProfileMenuOpen(false)
    setIsSearchOpen(false)
    setIsFocusPopoverOpen(false)
    setIsNotificationInboxOpen((current) => !current)
  }

  const closeFocusPopover = useCallback(() => {
    setIsFocusPopoverOpen(false)
  }, [])

  const markAllNotificationsRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true })),
    )
  }

  const openNotification = (
    notificationId: string,
    target: PlannerTarget,
  ) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification,
      ),
    )
    navigateToTarget(target)
  }

  const openFocusSource = (record: FocusRecord) => {
    navigate(
      record.sourceType === 'todo'
        ? '/todos'
        : `/studies/${record.roomId ?? record.sourceId}?tab=plans`,
    )
    setIsFocusPopoverOpen(false)
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={login} />} />
        <Route path="/signup" element={<SignupPage onSignup={login} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <div
      className={`app-shell${shouldShowFocusIsland ? ' focus-active' : ''}${
        isSidebarCollapsed ? ' sidebar-collapsed' : ''
      }`}
    >
      <AppSidebar
        projects={projects}
        itemCounts={projectPlanCounts}
        collectionCounts={collectionCounts}
        today={today}
        unreadNotificationCount={unreadNotificationCount}
        isNotificationInboxOpen={isNotificationInboxOpen}
        isProfileMenuOpen={isProfileMenuOpen}
        isMobileOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        isFocusAlwaysVisible={isFocusAlwaysVisible}
        profileActionMessage={profileActionMessage}
        profileMenuRef={profileMenuRef}
        onToggleMobile={() => setIsSidebarOpen((current) => !current)}
        onToggleCollapsed={() => {
          setIsNotificationInboxOpen(false)
          setIsProfileMenuOpen(false)
          setIsSidebarCollapsed((current) => !current)
        }}
        onCloseMobile={() => setIsSidebarOpen(false)}
        onSearch={() => {
          setIsSidebarOpen(false)
          openSearch()
        }}
        onSelectToday={selectToday}
        onToggleNotifications={() => {
          setIsSidebarOpen(false)
          toggleNotificationInbox()
        }}
        onToggleProfile={() => {
          setIsSearchOpen(false)
          setIsNotificationInboxOpen(false)
          setIsFocusPopoverOpen(false)
          setIsProfileMenuOpen((current) => !current)
        }}
        onToggleFocusAlwaysVisible={() =>
          setIsFocusAlwaysVisible((current) => !current)
        }
        onSync={() =>
          setProfileActionMessage('방금 모든 데이터를 동기화했어요')
        }
        onLogout={logout}
      />

      {shouldShowFocusIsland && (
        <div className="focus-island">
          <ActiveFocusPopover
            records={unfinishedFocusRecords}
            nowMs={focusNowMs}
            isOpen={isFocusPopoverOpen}
            onToggle={() => {
              setIsProfileMenuOpen(false)
              setIsSearchOpen(false)
              setIsNotificationInboxOpen(false)
              setIsFocusPopoverOpen((current) => !current)
            }}
            onClose={closeFocusPopover}
            onSelect={openFocusSource}
            onPause={pauseFocus}
            onResume={(recordId) => {
              const record = unfinishedFocusRecords.find(
                (candidate) => candidate.id === recordId,
              )
              if (record) {
                startFocus(record.sourceType, record.sourceId, record.title, {
                  roomId: record.roomId,
                })
              }
            }}
            onPauseAll={pauseAllFocus}
          />
        </div>
      )}

      {isSearchOpen && (
        <GlobalSearch
          events={events}
          todos={todos}
          rooms={studyRooms}
          onClose={() => setIsSearchOpen(false)}
          onSelect={navigateToTarget}
        />
      )}

      {isNotificationInboxOpen && (
        <NotificationInbox
          notifications={notifications}
          onClose={() => setIsNotificationInboxOpen(false)}
          onMarkAllRead={markAllNotificationsRead}
          onSelect={openNotification}
        />
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/calendar" replace />} />
        <Route
          path="/calendar"
          element={
            <CalendarPage
              today={today}
              selectedDate={selectedDate}
              visibleMonth={visibleMonth}
              events={events}
              todos={todos}
              projects={projects}
              calendarTodoVisibility={calendarTodoVisibility}
              studyRooms={joinedStudyRooms}
              focusRecords={unfinishedFocusRecords}
              onFinishFocus={finishFocus}
              sharedItems={sharedItemEntries}
              onSelectDate={selectDate}
              onMoveMonth={(amount) =>
                setVisibleMonth(
                  (current) =>
                    new Date(
                      current.getFullYear(),
                      current.getMonth() + amount,
                      1,
                    ),
                )
              }
              onSelectToday={selectToday}
              onAddEvent={addEvent}
              onAddTodo={addTodo}
              onUpdateEvent={updateEvent}
              onRemoveEvent={removeEvent}
              onRemoveTodo={removeTodo}
              onChangeRoom={changeStudyRoom}
            />
          }
        />
        <Route
          path="/todos/:todoId?"
          element={
            <TodosPage
              today={today}
              selectedDate={selectedDate}
              todos={todos}
              projects={projects}
              studyRooms={joinedStudyRooms}
              sharedItems={sharedItemEntries}
              focusRecords={unfinishedFocusRecords}
              onAddTodo={addTodo}
              onAddEvent={addEvent}
              onUpdateTodo={updateTodo}
              onToggleTodo={toggleTodo}
              onRemoveTodo={removeTodo}
              onUpdateSharedItem={updateSharedItem}
              onToggleSharedItemStatus={toggleSharedItemStatus}
              onStartFocus={startFocus}
              onRestartFocus={restartFocus}
              onPauseFocus={pauseFocus}
              onFinishFocus={finishFocus}
            />
          }
        />
        <Route
          path="/projects/:projectId?"
          element={<Navigate to="/todos" replace />}
        />
        <Route
          path="/collections/completed"
          element={
            <PlanCollectionsPage
              collection="completed"
              todos={todos}
              trash={trash}
              collectionCounts={collectionCounts}
              onToggleTodo={toggleTodo}
              onRemoveTodo={removeTodo}
              onRestoreTrash={restoreTrash}
              onDeleteTrash={deleteTrash}
              onEmptyTrash={emptyTrash}
            />
          }
        />
        <Route
          path="/collections/trash"
          element={
            <PlanCollectionsPage
              collection="trash"
              todos={todos}
              trash={trash}
              collectionCounts={collectionCounts}
              onToggleTodo={toggleTodo}
              onRemoveTodo={removeTodo}
              onRestoreTrash={restoreTrash}
              onDeleteTrash={deleteTrash}
              onEmptyTrash={emptyTrash}
            />
          }
        />
        <Route
          path="/todos/:todoId/focus"
          element={
            <FocusSessionRoute
              todos={todos}
              focusRecords={unfinishedFocusRecords}
              nowMs={focusNowMs}
              onStartFocus={startFocus}
              onPauseFocus={pauseFocus}
              onFinishFocus={finishFocus}
            />
          }
        />
        <Route
          path="/todos/:todoId/result"
          element={
            <FocusResultRoute
              todos={todos}
              focusResults={focusResults}
            />
          }
        />
        <Route
          path="/studies"
          element={
            <StudyRoomsPage
              rooms={studyRooms}
              onRequestJoin={requestStudyRoomJoin}
              onCreateRoom={createStudyRoom}
            />
          }
        />
        <Route
          path="/studies/:roomId/manage"
          element={
            <StudyRoomManagementRoute
              rooms={studyRooms}
              onChangeRoom={changeStudyRoom}
              focusRecords={unfinishedFocusRecords}
              onFinishFocus={finishFocus}
            />
          }
        />
        <Route
          path="/studies/:roomId/members/:memberId"
          element={<StudyMemberProfileRoute rooms={studyRooms} />}
        />
        <Route
          path="/studies/:roomId"
          element={
            <StudyRoomRoute
              onFinishFocus={finishFocus}
              rooms={studyRooms}
              focusRecords={unfinishedFocusRecords}
              nowMs={focusNowMs}
              onRequestJoin={requestStudyRoomJoin}
              onChangeRoom={changeStudyRoom}
              onStartFocus={startFocus}
              onRestartFocus={restartFocus}
              onPauseFocus={pauseFocus}
            />
          }
        />
        <Route
          path="/profile"
          element={<ProfilePage todos={todos} rooms={studyRooms} />}
        />
        <Route
          path="/settings"
          element={
            <SettingsPage
              projects={projects}
              itemCounts={projectPlanCounts}
              calendarTodoVisibility={calendarTodoVisibility}
              onCreateProject={createProject}
              onUpdateProject={updateProject}
              onDeleteProject={deleteProject}
              onReorderProjects={reorderProjects}
              onUpdateCalendarTodoVisibility={setCalendarTodoVisibility}
              profileVisibility={myProfileVisibility}
              onUpdateProfileVisibility={updateMyProfileVisibility}
            />
          }
        />
        <Route path="*" element={<Navigate to="/calendar" replace />} />
      </Routes>

      <footer>
        <p>오늘 해야 할 일과 중요한 일정을 한곳에서.</p>
        <Link to="/calendar" onClick={selectToday}>
          오늘 일정 보기
        </Link>
      </footer>
    </div>
  )
}
