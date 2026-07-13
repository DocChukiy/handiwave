import {
  Camera,
  Bell,
  ChevronDown,
  Download,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Moon,
  Phone,
  Share2,
  Sun,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import AuthProvider from './auth/AuthProvider.jsx'
import { useAuth } from './auth/useAuth.js'
import ProtectedRoute from './components/ProtectedRoute.jsx'
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'))
const ArtisanAnalytics = lazy(() => import('./pages/ArtisanAnalytics.jsx'))
const ArtisanAvailability = lazy(() => import('./pages/ArtisanAvailability.jsx'))
const ArtisanDashboard = lazy(() => import('./pages/ArtisanDashboard.jsx'))
const ArtisanJobs = lazy(() => import('./pages/ArtisanJobs.jsx'))
const ArtisanOnboarding = lazy(() => import('./pages/ArtisanOnboarding.jsx'))
const ArtisanProfile = lazy(() => import('./pages/ArtisanProfile.jsx'))
const ArtisanReels = lazy(() => import('./pages/ArtisanReels.jsx'))
const Artisans = lazy(() => import('./pages/Artisans.jsx'))
const Bookings = lazy(() => import('./pages/Bookings.jsx'))
const Disputes = lazy(() => import('./pages/Disputes.jsx'))
const Home = lazy(() => import('./pages/Home.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Messages = lazy(() => import('./pages/Messages.jsx'))
const PaymentCallback = lazy(() => import('./pages/PaymentCallback.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const Reels = lazy(() => import('./pages/Reels.jsx'))
const Services = lazy(() => import('./pages/Services.jsx'))
const Signup = lazy(() => import('./pages/Signup.jsx'))
const Wallet = lazy(() => import('./pages/Wallet.jsx'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'))
const TermsOfService = lazy(() => import('./pages/TermsOfService.jsx'))
import { getArtisanByProfileId } from './services/artisanService.js'
import { getTotalUnreadMessagesForUser, touchProfileLastSeen } from './services/messageService.js'
import {
  getNotificationsForUser,
  getUnreadNotificationsCount,
  markNotificationRead,
} from './services/notificationService.js'
import { getSupabaseClient } from './lib/supabaseClient.js'
import { showToast } from './utils/toast.js'
import logger from './utils/logger.js'
import './App.css'

const publicNavLinks = [
  { path: '/', label: 'Home' },
  { path: '/services', label: 'Services' },
  { path: '/artisans', label: 'Artisans' },
  { path: '/reels', label: 'Reels' },
]

const customerNavLinks = [
  { path: '/', label: 'Home' },
  { path: '/services', label: 'Services' },
  { path: '/artisans', label: 'Artisans' },
  { path: '/bookings', label: 'Bookings' },
  { path: '/reels', label: 'Reels' },
  { path: '/messages', label: 'Messages' },
  { path: '/wallet', label: 'Wallet' },
  { path: '/profile', label: 'Profile' },
]

const artisanNavLinks = [
  { path: '/artisan-dashboard', label: 'Dashboard' },
  { path: '/artisan-jobs', label: 'Jobs' },
  { path: '/artisan-analytics', label: 'Analytics' },
  { path: '/disputes', label: 'Disputes' },
  { path: '/artisan-availability', label: 'Availability' },
  { path: '/messages', label: 'Messages' },
  { path: '/artisan-reels', label: 'My Reels' },
  { path: '/wallet', label: 'Wallet' },
  { path: '/artisan-reviews', label: 'Reviews' },
  { path: '/profile', label: 'My Profile' },
]

const quickLinks = [
  { path: '/', label: 'Home' },
  { path: '/artisans', label: 'Find Artisans' },
  { path: '/bookings', label: 'My Bookings' },
  { path: '/messages', label: 'Messages' },
]

const serviceLinks = [
  'Electrician',
  'Plumber',
  'Cleaner',
  'AC Repair',
  'Generator Repair',
]

function isStandaloneDisplay() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
}

function needsArtisanSetup(artisan) {
  if (!artisan) {
    return true
  }

  return [
    artisan.businessName,
    artisan.bio,
    artisan.primaryService,
    artisan.serviceArea,
    artisan.startingPrice,
  ].some((field) => !field)
}

function RoleHome() {
  const { isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <section className="auth-loading-state">
        <span></span>
        <p>Loading Handiwave...</p>
      </section>
    )
  }

  if (user?.role === 'artisan') {
    return <Navigate replace to="/artisan-dashboard" />
  }

  if (user?.role === 'admin') {
    return <Navigate replace to="/admin" />
  }

  return <Home />
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="route-shell"
        key={location.pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      >
        <Suspense fallback={(
          <section className="auth-loading-state">
            <span></span>
            <p>Loading Handiwave...</p>
          </section>
        )}>
          <Routes location={location}>
          <Route path="/" element={<RoleHome />} />
          <Route path="/services" element={<Services />} />
          <Route path="/artisans" element={<Artisans />} />
          <Route
            path="/artisan-onboarding"
            element={(
              <ProtectedRoute allowedRoles={['artisan']}>
                <ArtisanOnboarding />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/artisan-dashboard"
            element={(
              <ProtectedRoute allowedRoles={['artisan']}>
                <ArtisanDashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/artisan-jobs"
            element={(
              <ProtectedRoute allowedRoles={['artisan']}>
                <ArtisanJobs />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/artisan-availability"
            element={(
              <ProtectedRoute allowedRoles={['artisan']}>
                <ArtisanAvailability />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/artisan-analytics"
            element={(
              <ProtectedRoute allowedRoles={['artisan']}>
                <ArtisanAnalytics />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/artisan-reviews"
            element={(
              <ProtectedRoute allowedRoles={['artisan']}>
                <ArtisanDashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/artisan-reels"
            element={(
              <ProtectedRoute allowedRoles={['artisan']}>
                <ArtisanReels />
              </ProtectedRoute>
            )}
          />
          <Route path="/artisan-profile" element={<ArtisanProfile />} />
          <Route path="/artisan-profile/:artisanId" element={<ArtisanProfile />} />
          <Route
            path="/bookings"
            element={(
              <ProtectedRoute allowedRoles={['customer', 'artisan', 'admin']}>
                <Bookings />
              </ProtectedRoute>
            )}
          />
          <Route path="/reels" element={<Reels />} />
          <Route
            path="/profile"
            element={(
              <ProtectedRoute allowedRoles={['customer', 'artisan', 'admin']}>
                <Profile />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/wallet"
            element={(
              <ProtectedRoute allowedRoles={['customer', 'artisan', 'admin']}>
                <Wallet />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/payment/callback"
            element={(
              <ProtectedRoute allowedRoles={['customer', 'admin']}>
                <PaymentCallback />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/messages"
            element={(
              <ProtectedRoute allowedRoles={['customer', 'artisan', 'admin']}>
                <Messages />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/disputes"
            element={(
              <ProtectedRoute allowedRoles={['customer', 'artisan', 'admin']}>
                <Disputes />
              </ProtectedRoute>
            )}
          />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route
            path="/admin"
            element={(
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            )}
          />
        </Routes>
      </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}

function AppShell() {
  const { isAuthenticated, logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('handiwave-theme')

    if (savedTheme) {
      return savedTheme
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  })
  const [artisanNeedsSetup, setArtisanNeedsSetup] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [toast, setToast] = useState(null)
  const [installPromptEvent, setInstallPromptEvent] = useState(null)
  const [isInstallPromptDismissed, setIsInstallPromptDismissed] = useState(() => (
    sessionStorage.getItem('handiwave-install-dismissed') === 'true'
  ))
  const [awarenessRefreshTick, setAwarenessRefreshTick] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)

  const isDarkMode = theme === 'dark'
  const navLinks = user?.role === 'artisan'
    ? artisanNavLinks
    : user?.role === 'customer'
      ? customerNavLinks
      : publicNavLinks
  const visibleNavLinks = isAuthenticated
    ? navLinks.filter((link) => link.path !== '/profile')
    : navLinks
  const desktopPrimaryCount = isAuthenticated ? 5 : navLinks.length
  const primaryNavLinks = visibleNavLinks.slice(0, desktopPrimaryCount)
  const moreNavLinks = visibleNavLinks.slice(desktopPrimaryCount)
  const isMoreActive = moreNavLinks.some((link) => location.pathname === link.path)
  function renderNavLabel(link) {
    const count = link.path === '/messages' ? unreadMessagesCount : 0

    return (
      <>
        <span>{link.label}</span>
        {count > 0 && <span className="nav-count-bubble">{count}</span>}
      </>
    )
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('handiwave-theme', theme)
  }, [theme])

  useEffect(() => {
    let isMounted = true

    async function checkArtisanSetup() {
      if (user?.role !== 'artisan') {
        return
      }

      const { data, error } = await getArtisanByProfileId(user.id)

      if (!isMounted) {
        return
      }

      if (error) {
        logger.error('[Handiwave nav] artisan setup check failed:', error)
        setArtisanNeedsSetup(true)
        return
      }

      setArtisanNeedsSetup(needsArtisanSetup(data))
    }

    checkArtisanSetup()

    return () => {
      isMounted = false
    }
  }, [user?.id, user?.role])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return undefined
    }

    let isMounted = true

    async function touchLastSeen() {
      const { error } = await touchProfileLastSeen()

      if (error && isMounted) {
        logger.error('[Handiwave presence] last_seen update failed:', error)
      }
    }

    touchLastSeen()
    const presenceTimer = window.setInterval(touchLastSeen, 60000)

    return () => {
      isMounted = false
      window.clearInterval(presenceTimer)
    }
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    let isMounted = true

    async function loadAwarenessCounts() {
      if (!isAuthenticated || !user?.id) {
        setNotifications([])
        setUnreadMessagesCount(0)
        return
      }

      const [unreadMessageResult, notificationResult, unreadNotificationResult] = await Promise.all([
        getTotalUnreadMessagesForUser(user),
        getNotificationsForUser(user.id),
        getUnreadNotificationsCount(user.id),
      ])

      if (!isMounted) {
        return
      }

      if (unreadMessageResult.error) {
        logger.error('[Handiwave nav] unread message count failed:', unreadMessageResult.error)
      } else {
        setUnreadMessagesCount(unreadMessageResult.data)
      }

      if (notificationResult.error) {
        logger.error('[Handiwave nav] notification fetch failed:', notificationResult.error)
      } else {
        setNotifications(notificationResult.data)
      }

      if (unreadNotificationResult.error) {
        logger.error('[Handiwave nav] unread notification count failed:', unreadNotificationResult.error)
      } else {
        setUnreadNotificationsCount(unreadNotificationResult.data)
      }
    }

    loadAwarenessCounts()

    function handleAwarenessRefresh() {
      setAwarenessRefreshTick((currentTick) => currentTick + 1)
    }

    window.addEventListener('handiwave-awareness-refresh', handleAwarenessRefresh)

    const awarenessTimer = window.setInterval(loadAwarenessCounts, 30000)

    return () => {
      isMounted = false
      window.removeEventListener('handiwave-awareness-refresh', handleAwarenessRefresh)
      window.clearInterval(awarenessTimer)
    }
  }, [awarenessRefreshTick, isAuthenticated, location.pathname, user])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return undefined
    }

    const supabase = getSupabaseClient()
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `profile_id=eq.${user.id}`,
          schema: 'public',
          table: 'notifications',
        },
        () => {
          setAwarenessRefreshTick((currentTick) => currentTick + 1)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    function handleToast(event) {
      setToast(event.detail)
    }

    window.addEventListener('handiwave-toast', handleToast)

    return () => window.removeEventListener('handiwave-toast', handleToast)
  }, [])

  useEffect(() => {
    if (!toast) {
      return undefined
    }

    const toastTimer = window.setTimeout(() => setToast(null), 3200)

    return () => window.clearTimeout(toastTimer)
  }, [toast])

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault()
      setInstallPromptEvent(event)
    }

    function handleAppInstalled() {
      setInstallPromptEvent(null)
      setIsInstallPromptDismissed(true)
      sessionStorage.setItem('handiwave-install-dismissed', 'true')
      showToast('Handiwave added to your home screen.')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }

  async function handleLogout() {
    try {
      setIsMenuOpen(false)
      await logout()
      showToast('You have been logged out.')
    } catch (error) {
      showToast(error.message)
    }
  }

  async function handleInstallClick() {
    if (!installPromptEvent) {
      return
    }

    await installPromptEvent.prompt()
    setInstallPromptEvent(null)
  }

  function dismissInstallPrompt() {
    setIsInstallPromptDismissed(true)
    sessionStorage.setItem('handiwave-install-dismissed', 'true')
  }

  async function handleNotificationClick(notification, event) {
    event.currentTarget.closest('details')?.removeAttribute('open')

    const { error } = await markNotificationRead(notification.id)

    if (error) {
      showToast(error.message)
      return
    }

    setNotifications((currentNotifications) => (
      currentNotifications.map((item) => (
        item.id === notification.id
          ? { ...item, isRead: true, readAt: new Date().toISOString() }
          : item
      ))
    ))
    setUnreadNotificationsCount((currentCount) => Math.max(currentCount - 1, 0))
    window.dispatchEvent(new CustomEvent('handiwave-awareness-refresh'))

    if (notification.type === 'message' && notification.data?.conversation_id) {
      navigate(`/messages?conversation=${notification.data.conversation_id}`)
      return
    }

    if (notification.data?.booking_id) {
      navigate(user?.role === 'artisan' ? '/artisan-jobs' : '/bookings')
    }
  }

  return (
      <div className="app">
        <header className="navbar">
          <div className="navbar-inner">
            <NavLink className="logo" to="/" onClick={() => setIsMenuOpen(false)}>
              Handiwave
            </NavLink>

            <button
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="menu-toggle"
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <nav
              className={isMenuOpen ? 'nav-links open' : 'nav-links'}
              aria-label="Main navigation"
            >
              {primaryNavLinks.map((link) => (
                <NavLink
                  className={({ isActive }) =>
                    isActive ? 'nav-link active' : 'nav-link'
                  }
                  end={link.path === '/'}
                  key={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  to={link.path}
                >
                  {renderNavLabel(link)}
                </NavLink>
              ))}
              {moreNavLinks.length > 0 && (
                <details className={isMoreActive ? 'more-nav active' : 'more-nav'}>
                  <summary className="nav-link">
                    More
                    <ChevronDown size={15} />
                  </summary>
                  <div className="more-menu">
                    {moreNavLinks.map((link) => (
                      <NavLink
                        className={({ isActive }) =>
                          isActive ? 'more-menu-link active' : 'more-menu-link'
                        }
                        key={link.path}
                        onClick={() => setIsMenuOpen(false)}
                        to={link.path}
                      >
                        {renderNavLabel(link)}
                      </NavLink>
                    ))}
                  </div>
                </details>
              )}
              {moreNavLinks.map((link) => (
                <NavLink
                  className={({ isActive }) =>
                    isActive ? 'nav-link mobile-only-nav-link active' : 'nav-link mobile-only-nav-link'
                  }
                  key={`mobile-${link.path}`}
                  onClick={() => setIsMenuOpen(false)}
                  to={link.path}
                >
                  {renderNavLabel(link)}
                </NavLink>
              ))}
            </nav>

            <div className="nav-actions">
              {isAuthenticated && (
                <div className="role-pill">
                  <span>{user.role}</span>
                </div>
              )}
              {isAuthenticated && (
                <details className="notification-nav">
                  <summary
                    aria-label="Notifications"
                    className="notification-trigger"
                  >
                    <Bell size={18} />
                    {unreadNotificationsCount > 0 && (
                      <span className="notification-count-bubble">
                        {unreadNotificationsCount}
                      </span>
                    )}
                  </summary>
                  <div className="notification-menu">
                    <div className="notification-menu-header">
                      <strong>Notifications</strong>
                      <span>{unreadNotificationsCount} unread</span>
                    </div>
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <button
                          className={notification.isRead ? 'notification-item' : 'notification-item unread'}
                          key={notification.id}
                          type="button"
                          onClick={(event) => handleNotificationClick(notification, event)}
                        >
                          <strong>{notification.title}</strong>
                          {notification.body && <p>{notification.body}</p>}
                          <span>{notification.time}</span>
                        </button>
                      ))
                    ) : (
                      <div className="notification-empty">
                        No notifications yet.
                      </div>
                    )}
                  </div>
                </details>
              )}
              {isAuthenticated && (
                <details className="profile-nav">
                  <summary className="login-button">
                    Profile
                    <ChevronDown size={15} />
                  </summary>
                  <div className="profile-menu">
                    <div className="profile-menu-header">
                      <span>Signed in as</span>
                      <strong>{user.name}</strong>
                    </div>
                    <NavLink
                      className="profile-menu-link"
                      to="/profile"
                      onClick={(event) => {
                        event.currentTarget.closest('details')?.removeAttribute('open')
                        setIsMenuOpen(false)
                      }}
                    >
                      My Profile
                    </NavLink>
                    {user?.role === 'admin' && (
                      <NavLink
                        className="profile-menu-link"
                        to="/admin"
                        onClick={(event) => {
                          event.currentTarget.closest('details')?.removeAttribute('open')
                          setIsMenuOpen(false)
                        }}
                      >
                        Admin
                      </NavLink>
                    )}
                    {user?.role === 'artisan' && (
                      <>
                        <NavLink
                          className="profile-menu-link"
                          to="/artisan-availability"
                          onClick={(event) => {
                            event.currentTarget.closest('details')?.removeAttribute('open')
                            setIsMenuOpen(false)
                          }}
                        >
                          Manage Availability
                        </NavLink>
                        <NavLink
                          className="profile-menu-link"
                          to="/artisan-reels"
                          onClick={(event) => {
                            event.currentTarget.closest('details')?.removeAttribute('open')
                            setIsMenuOpen(false)
                          }}
                        >
                          Manage Reels
                        </NavLink>
                        <NavLink
                          className="profile-menu-link"
                          to="/artisan-analytics"
                          onClick={(event) => {
                            event.currentTarget.closest('details')?.removeAttribute('open')
                            setIsMenuOpen(false)
                          }}
                        >
                          Analytics
                        </NavLink>
                        {artisanNeedsSetup && (
                          <NavLink
                            className="profile-menu-link"
                            to="/artisan-onboarding"
                            onClick={(event) => {
                              event.currentTarget.closest('details')?.removeAttribute('open')
                              setIsMenuOpen(false)
                            }}
                          >
                            Complete Setup
                          </NavLink>
                        )}
                      </>
                    )}
                  </div>
                </details>
              )}
              <button
                className="theme-toggle"
                type="button"
                onClick={toggleTheme}
                aria-label={
                  isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'
                }
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              {isAuthenticated ? (
                <button className="signup-button" type="button" onClick={handleLogout}>
                  Logout
                </button>
              ) : (
                <>
                  <NavLink className="login-button" to="/login" onClick={() => setIsMenuOpen(false)}>
                    Login
                  </NavLink>
                  <NavLink className="signup-button" to="/signup" onClick={() => setIsMenuOpen(false)}>
                    Sign Up
                  </NavLink>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="page-content">
          {installPromptEvent && !isInstallPromptDismissed && !isStandaloneDisplay() && (
            <section className="install-app-banner" aria-label="Install Handiwave">
              <div>
                <strong>Install Handiwave</strong>
                <span>Add it to your phone for faster access to bookings, chat, wallet, and escrow updates.</span>
              </div>
              <div className="install-app-actions">
                <button className="install-app-button" type="button" onClick={handleInstallClick}>
                  <Download size={17} />
                  Install
                </button>
                <button className="install-dismiss-button" type="button" onClick={dismissInstallPrompt}>
                  Later
                </button>
              </div>
            </section>
          )}
          <AnimatedRoutes />
        </main>

        <footer className="footer">
          <div className="footer-grid">
            <div className="footer-brand">
              <NavLink className="footer-logo" to="/">
                Handiwave
              </NavLink>
              <p>
                Book trusted artisans for home services quickly, safely, and
                confidently across Nigeria.
              </p>
              <div className="social-links" aria-label="Social links">
                <button type="button" className="social-link" disabled aria-label="Instagram (coming soon)">
                  <Camera size={18} />
                </button>
                <button type="button" className="social-link" disabled aria-label="Twitter (coming soon)">
                  <MessageCircle size={18} />
                </button>
                <button type="button" className="social-link" disabled aria-label="LinkedIn (coming soon)">
                  <Share2 size={18} />
                </button>
              </div>
            </div>

            <div className="footer-column">
              <h3>Quick Links</h3>
              {quickLinks.map((link) => (
                <NavLink key={link.path} to={link.path}>
                  {link.label}
                </NavLink>
              ))}
            </div>

            <div className="footer-column">
              <h3>Services</h3>
              {serviceLinks.map((service) => (
                <NavLink key={service} to="/services">
                  {service}
                </NavLink>
              ))}
            </div>

            <div className="footer-column contact-column">
              <h3>Contact</h3>
              <span>
                <Phone size={17} />
                +234 800 123 4567
              </span>
              <span>
                <Mail size={17} />
                support@handiwave.com
              </span>
              <span>
                <MapPin size={17} />
                Lagos, Nigeria
              </span>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} Handiwave. All rights reserved.</p>
            <div>
              <NavLink to="/privacy">Privacy Policy</NavLink>
              <NavLink to="/terms">Terms of Service</NavLink>
            </div>
          </div>
        </footer>

        <AnimatePresence>
          {toast && (
            <motion.div
              className="toast"
              role="status"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <span>Done</span>
              <p>{toast}</p>
            </motion.div>
          )}
        </AnimatePresence>
        {isAuthenticated && (
          <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
            <NavLink to={user?.role === 'artisan' ? '/artisan-dashboard' : '/'}>
              {user?.role === 'artisan' ? 'Dashboard' : 'Home'}
            </NavLink>
            <NavLink to={user?.role === 'artisan' ? '/artisan-jobs' : '/services'}>
              {user?.role === 'artisan' ? 'Jobs' : 'Services'}
            </NavLink>
            <NavLink to={user?.role === 'artisan' ? '/artisan-availability' : '/bookings'}>
              {user?.role === 'artisan' ? 'Availability' : 'Bookings'}
            </NavLink>
            <NavLink to={user?.role === 'artisan' ? '/artisan-analytics' : '/reels'}>
              {user?.role === 'artisan' ? 'Analytics' : 'Reels'}
            </NavLink>
            <NavLink to={user?.role === 'artisan' ? '/profile' : '/wallet'}>
              {user?.role === 'artisan' ? 'Profile' : 'Wallet'}
            </NavLink>
          </nav>
        )}
      </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
