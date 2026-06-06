import {
  Camera,
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
import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import AuthProvider from './auth/AuthProvider.jsx'
import { useAuth } from './auth/useAuth.js'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import ArtisanDashboard from './pages/ArtisanDashboard.jsx'
import ArtisanJobs from './pages/ArtisanJobs.jsx'
import ArtisanOnboarding from './pages/ArtisanOnboarding.jsx'
import ArtisanProfile from './pages/ArtisanProfile.jsx'
import Artisans from './pages/Artisans.jsx'
import Bookings from './pages/Bookings.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Messages from './pages/Messages.jsx'
import Profile from './pages/Profile.jsx'
import Reels from './pages/Reels.jsx'
import Services from './pages/Services.jsx'
import Signup from './pages/Signup.jsx'
import Wallet from './pages/Wallet.jsx'
import { showToast } from './utils/toast.js'
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
  { path: '/profile', label: 'Profile' },
]

const artisanNavLinks = [
  { path: '/artisan-dashboard', label: 'Dashboard' },
  { path: '/artisan-jobs', label: 'Jobs' },
  { path: '/messages', label: 'Messages' },
  { path: '/reels', label: 'Reels' },
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
            path="/artisan-reviews"
            element={(
              <ProtectedRoute allowedRoles={['artisan']}>
                <ArtisanDashboard />
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
            path="/messages"
            element={(
              <ProtectedRoute allowedRoles={['customer', 'artisan', 'admin']}>
                <Messages />
              </ProtectedRoute>
            )}
          />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/admin"
            element={(
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            )}
          />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

function AppShell() {
  const { isAuthenticated, logout, user } = useAuth()
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('handiwave-theme')

    if (savedTheme) {
      return savedTheme
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  })
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [toast, setToast] = useState(null)

  const isDarkMode = theme === 'dark'
  const navLinks = user?.role === 'artisan'
    ? artisanNavLinks
    : user?.role === 'customer'
      ? customerNavLinks
      : publicNavLinks

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('handiwave-theme', theme)
  }, [theme])

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
              {navLinks.map((link) => (
                <NavLink
                  className={({ isActive }) =>
                    isActive ? 'nav-link active' : 'nav-link'
                  }
                  end={link.path === '/'}
                  key={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  to={link.path}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="nav-actions">
              {isAuthenticated && (
                <div className="role-pill">
                  <span>{user.role}</span>
                  <strong>{user.name}</strong>
                </div>
              )}
              {user?.role === 'admin' && (
                <NavLink className="login-button" to="/admin" onClick={() => setIsMenuOpen(false)}>
                  Admin
                </NavLink>
              )}
              {user?.role === 'artisan' && (
                <NavLink className="login-button" to="/artisan-onboarding" onClick={() => setIsMenuOpen(false)}>
                  Onboarding
                </NavLink>
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
                <span>{isDarkMode ? 'Light' : 'Dark'}</span>
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
                <a href="#" aria-label="Instagram">
                  <Camera size={18} />
                </a>
                <a href="#" aria-label="Twitter">
                  <MessageCircle size={18} />
                </a>
                <a href="#" aria-label="LinkedIn">
                  <Share2 size={18} />
                </a>
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
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
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
            <NavLink to={user?.role === 'artisan' ? '/messages' : '/bookings'}>
              {user?.role === 'artisan' ? 'Messages' : 'Bookings'}
            </NavLink>
            <NavLink to="/reels">Reels</NavLink>
            <NavLink to="/profile">
              Profile
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
