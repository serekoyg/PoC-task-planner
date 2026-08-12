import { type MouseEvent, useEffect, useState } from 'react'
import type { PlannerNotification } from '../data/notifications'
import type { PlannerTarget } from '../lib/plannerNavigation'

type NotificationInboxProps = {
  notifications: PlannerNotification[]
  onClose: () => void
  onMarkAllRead: () => void
  onSelect: (notificationId: string, target: PlannerTarget) => void
}

const notificationIcon = (type: PlannerNotification['type']) => {
  if (type === 'reminder') return '◷'
  if (type === 'todo') return '✓'
  if (type === 'study') return '◉'
  return '▤'
}

export default function NotificationInbox({
  notifications,
  onClose,
  onMarkAllRead,
  onSelect,
}: NotificationInboxProps) {
  const [view, setView] = useState<'all' | 'unread'>('all')
  const unreadCount = notifications.filter((notification) => !notification.read).length
  const visibleNotifications =
    view === 'unread'
      ? notifications.filter((notification) => !notification.read)
      : notifications

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const closeFromBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.currentTarget === event.target) onClose()
  }

  return (
    <div className="notification-backdrop" onMouseDown={closeFromBackdrop}>
      <section
        className="notification-inbox"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-inbox-title"
      >
        <header className="notification-inbox-header">
          <div>
            <p className="eyebrow">NOTIFICATIONS</p>
            <h2 id="notification-inbox-title">알림 수신함</h2>
          </div>
          <button type="button" aria-label="알림 수신함 닫기" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="notification-inbox-toolbar">
          <div role="tablist" aria-label="알림 보기">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'all'}
              className={view === 'all' ? 'active' : ''}
              onClick={() => setView('all')}
            >
              전체 {notifications.length}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'unread'}
              className={view === 'unread' ? 'active' : ''}
              onClick={() => setView('unread')}
            >
              읽지 않음 {unreadCount}
            </button>
          </div>
          <button type="button" onClick={onMarkAllRead} disabled={unreadCount === 0}>
            모두 읽음
          </button>
        </div>

        {visibleNotifications.length > 0 ? (
          <ul className="notification-list">
            {visibleNotifications.map((notification) => (
              <li key={notification.id} className={notification.read ? '' : 'unread'}>
                <button
                  type="button"
                  onClick={() => onSelect(notification.id, notification.target)}
                >
                  <span
                    className={`notification-item-icon ${notification.type}`}
                    aria-hidden="true"
                  >
                    {notificationIcon(notification.type)}
                  </span>
                  <span className="notification-item-copy">
                    <strong>{notification.title}</strong>
                    <span>{notification.description}</span>
                    <small>{notification.timeLabel}</small>
                  </span>
                  {!notification.read && (
                    <span className="notification-unread-dot">
                      <span className="sr-only">읽지 않음</span>
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="notification-empty">
            <span aria-hidden="true">✓</span>
            <strong>새 알림을 모두 확인했어요</strong>
            <p>새로운 소식이 도착하면 여기에 모아둘게요.</p>
          </div>
        )}
      </section>
    </div>
  )
}
