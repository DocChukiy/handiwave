import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Bell, Menu, MessageCircle, Moon, Sun, X } from 'lucide-react'
import { useAuth } from '../../auth/useAuth.js'
import Avatar from '../ui/Avatar.jsx'
import Badge from '../ui/Badge.jsx'
import NotificationDropdown from './NotificationDropdown.jsx'
import ProfileDropdown from './ProfileDropdown.jsx'

function Navbar({
  artisanNeedsSetup,
  isMobileMenuOpen,
  notifications,
  onCloseMobileMenu,
  onLogout,
  onNotificationClick,
  onToggleMobileMenu,
  onToggleTheme,
  theme,
  unreadMessagesCount,
  unreadNotificationsCount,
}) {
  const { isAuthenticated, user } = useAuth()
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const isDarkMode = theme === 'dark'

  const navLinks = user?.role === 'artisan'
    ? [
        { path: '/', label: 'Home' },
        { path: '/services', label: 'Services' },
        { path: '/artisans', label: 'Professionals' },
        { path: '/artisan-dashboard', label: 'Dashboard' },
        { path: '/artisan-jobs', label: 'Jobs' },
        { path: '/messages', label: 'Messages' },
        { path: '/wallet', label: 'Wallet' },
      ]
    : user?.role === 'admin'
      ? [
          { path: '/', label: 'Home' },
          { path: '/services', label: 'Services' },
          { path: '/artisans', label: 'Professionals' },
          { path: '/admin', label: 'Admin' },
          { path: '/messages', label: 'Messages' },
          { path: '/wallet', label: 'Wallet' },
        ]
      : [
          { path: '/', label: 'Home' },
          { path: '/services', label: 'Services' },
          { path: '/artisans', label: 'Professionals' },
          { path: '/bookings', label: 'Bookings' },
          { path: '/messages', label: 'Messages' },
        ]

  const visibleNavLinks = isAuthenticated
    ? navLinks.filter((link) => link.path !== '/profile')
    : navLinks

  return (
    <header className="hw-navbar">
      <div className="hw-navbar-inner">
        <NavLink className="hw-navbar-logo" to="/" onClick={onCloseMobileMenu}>
          <img src="/handiwave-mark.svg" alt="Handiwave" className="hw-navbar-logo-mark" />
          <span>Handiwave</span>
        </NavLink>

        <button
          className="hw-mobile-menu-toggle"
          type="button"
          onClick={onToggleMobileMenu}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className={`hw-nav-links ${isMobileMenuOpen ? 'open' : ''}`} aria-label="Main navigation">
          {visibleNavLinks.map((link) => (
            <NavLink
              key={link.path}
              className={({ isActive }) =>
                `hw-nav-link ${isActive ? 'active' : ''}`
              }
              end={link.path === '/'}
              onClick={onCloseMobileMenu}
              to={link.path}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hw-navbar-actions">
          {isAuthenticated && (
            <div className="hw-role-pill">
              <span>{user?.role}</span>
              {artisanNeedsSetup && user?.role === 'artisan' && <i aria-label="Profile setup required" />}
            </div>
          )}

          {isAuthenticated && (
            <NavLink className="hw-icon-button hw-message-button" to="/messages" aria-label="Messages">
              <MessageCircle size={18} />
              {unreadMessagesCount > 0 && (
                <Badge variant="error" className="hw-notification-badge">
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </Badge>
              )}
            </NavLink>
          )}

          {isAuthenticated && (
            <div className="hw-notification-wrapper">
              <button
                className="hw-icon-button"
                type="button"
                onClick={() => {
                  setIsNotificationOpen(!isNotificationOpen)
                  setIsProfileOpen(false)
                }}
                aria-label="Notifications"
                aria-expanded={isNotificationOpen}
              >
                <Bell size={18} />
                {unreadNotificationsCount > 0 && (
                  <Badge variant="error" className="hw-notification-badge">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </Badge>
                )}
              </button>
              {isNotificationOpen && (
                <NotificationDropdown
                  notifications={notifications}
                  onNotificationClick={(notification, event) => {
                    onNotificationClick(notification, event)
                    setIsNotificationOpen(false)
                  }}
                  onClose={() => setIsNotificationOpen(false)}
                />
              )}
            </div>
          )}

          {isAuthenticated && (
            <div className="hw-profile-wrapper">
              <button
                className="hw-avatar-button"
                type="button"
                onClick={() => {
                  setIsProfileOpen(!isProfileOpen)
                  setIsNotificationOpen(false)
                }}
                aria-label="Profile menu"
                aria-expanded={isProfileOpen}
              >
                <Avatar 
                  name={user?.name || 'User'} 
                  src={user?.avatarUrl} 
                  size="sm" 
                />
              </button>
              {isProfileOpen && (
                <ProfileDropdown onClose={() => setIsProfileOpen(false)} onLogout={onLogout} />
              )}
            </div>
          )}

          <button
            className="hw-icon-button"
            type="button"
            onClick={onToggleTheme}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {isAuthenticated ? (
            <button className="hw-btn hw-btn-ghost hw-btn-sm" type="button" onClick={onLogout}>
              Logout
            </button>
          ) : (
            <>
              <NavLink className="hw-btn hw-btn-ghost hw-btn-sm hw-login-link" to="/login" onClick={onCloseMobileMenu}>
                Login
              </NavLink>
              <NavLink className="hw-btn hw-btn-primary hw-btn-sm hw-signup-link" to="/signup" onClick={onCloseMobileMenu}>
                Sign Up
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
