import { Download } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import AuthProvider from './auth/AuthProvider.jsx'
import { useAuth } from './auth/useAuth.js'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Navbar from './components/layout/Navbar.jsx'
import MobileBottomNav from './components/layout/MobileBottomNav.jsx'
import Footer from './components/layout/Footer.jsx'
import { getTotalUnreadMessagesForUser, touchProfileLastSeen } from './services/messageService.js'
import {
  getNotificationsForUser,
  getUnreadNotificationsCount,
  markNotificationRead,
} from './services/notificationService.js'
import { getSupabaseClient } from './lib/supabaseClient.js'
import { getArtisanByProfileId } from './services/artisanService.js'
import { showToast } from './utils/toast.js'
import logger from './utils/logger.js'
import './App.css'

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

    return 'light'
  })
  const [artisanNeedsSetup, setArtisanNeedsSetup] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [toast, setToast] = useState(null)
  const [installPromptEvent, setInstallPromptEvent] = useState(null)
  const [isInstallPromptDismissed, setIsInstallPromptDismissed] = useState(() => (
    sessionStorage.getItem('handiwave-install-dismissed') === 'true'
  ))
  const [awarenessRefreshTick, setAwarenessRefreshTick] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('handiwave-theme', theme)
  }, [theme])

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

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

  async function handleLogout() {
    try {
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

  async function handleNotificationClick(notification) {
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
      return
    }

    if (notification.data?.profile_id) {
      navigate(`/artisan-profile/${notification.data.profile_id}`)
      return
    }

    navigate('/')
  }

  return (
    <div className="hw-app-shell">
      <Navbar
        artisanNeedsSetup={artisanNeedsSetup}
        theme={theme}
        notifications={notifications}
        unreadMessagesCount={unreadMessagesCount}
        unreadNotificationsCount={unreadNotificationsCount}
        onNotificationClick={handleNotificationClick}
        onToggleMobileMenu={() => setIsMobileMenuOpen((current) => !current)}
        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
        onToggleTheme={() => setTheme((currentTheme) => currentTheme === 'dark' ? 'light' : 'dark')}
        isMobileMenuOpen={isMobileMenuOpen}
        onLogout={handleLogout}
      />

      <main className="hw-app-main">
        {installPromptEvent && !isInstallPromptDismissed && !isStandaloneDisplay() && (
          <section className="hw-install-banner" aria-label="Install Handiwave">
            <div>
              <strong>Install Handiwave</strong>
              <span>Add it to your phone for faster access to bookings, chat, wallet, and escrow updates.</span>
            </div>
            <div className="hw-install-actions">
              <button className="hw-install-button" type="button" onClick={handleInstallClick}>
                <Download size={17} />
                Install
              </button>
              <button className="hw-install-dismiss-button" type="button" onClick={dismissInstallPrompt}>
                Later
              </button>
            </div>
          </section>
        )}
        <AnimatedRoutes />
      </main>

      <Footer />

      <MobileBottomNav />

      <AnimatePresence>
        {toast && (
          <motion.div
            className="hw-toast"
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
