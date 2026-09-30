function NotificationDropdown({ notifications, onNotificationClick, onClose }) {
  function handleNotificationClick(notification, event) {
    event.stopPropagation()

    if (onNotificationClick) {
      onNotificationClick(notification)
    }

    onClose()
  }

  return (
    <div className="hw-notification-dropdown" role="menu">
      <div className="hw-notification-header">
        <h3>Notifications</h3>
        <span>{notifications.filter(n => !n.isRead).length} unread</span>
      </div>

      <div className="hw-notification-list">
        {notifications.length > 0 ? (
          notifications.slice(0, 10).map((notification) => (
            <button
              key={notification.id}
              type="button"
              className={`hw-notification-item ${notification.isRead ? '' : 'unread'}`}
              onClick={(event) => handleNotificationClick(notification, event)}
              role="menuitem"
            >
              <div className="hw-notification-icon">
                {notification.type === 'message' && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                )}
                {notification.type === 'booking' && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                    <line x1="16" x2="16" y1="2" y2="6"/>
                    <line x1="8" x2="8" y1="2" y2="6"/>
                    <line x1="3" x2="21" y1="10" y2="10"/>
                  </svg>
                )}
                {notification.type === 'review' && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                )}
                {notification.type === 'system' && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" x2="12" y1="16" y2="12"/>
                    <line x1="12" x2="12.01" y1="8" y2="8"/>
                  </svg>
                )}
                {notification.type === 'wallet' && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="5" rx="2"/>
                    <line x1="2" x2="22" y1="10" y2="10"/>
                  </svg>
                )}
              </div>
              <div className="hw-notification-content">
                <strong>{notification.title}</strong>
                {notification.body && <p>{notification.body}</p>}
                <time>{notification.time}</time>
              </div>
            </button>
          ))
        ) : (
          <div className="hw-notification-empty">
            <p>No notifications yet</p>
          </div>
        )}
      </div>

      <div className="hw-notification-footer">
        <button type="button" className="hw-btn hw-btn-ghost hw-btn-sm" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

export default NotificationDropdown
