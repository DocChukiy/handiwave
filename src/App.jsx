import {
  Camera,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  Phone,
  Share2,
  Sun,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import AuthProvider from './auth/AuthProvider.jsx'
import { useAuth } from './auth/useAuth.js'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import ArtisanProfile from './pages/ArtisanProfile.jsx'
import Artisans from './pages/Artisans.jsx'
import Bookings from './pages/Bookings.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Messages from './pages/Messages.jsx'
import Reels from './pages/Reels.jsx'
import Services from './pages/Services.jsx'
import Signup from './pages/Signup.jsx'
import Wallet from './pages/Wallet.jsx'
import { showToast } from './utils/toast.js'
import './App.css'

const navLinks = [
  { path: '/', label: 'Home' },
  { path: '/services', label: 'Services' },
  { path: '/artisans', label: 'Artisans' },
  { path: '/reels', label: 'Reels' },
  { path: '/messages', label: 'Messages' },
  { path: '/wallet', label: 'Wallet' },
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
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/artisans" element={<Artisans />} />
          <Route path="/artisan-profile" element={<ArtisanProfile />} />
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
  const [toast, setToast] = useState(null)

  const isDarkMode = theme === 'dark'

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
      await logout()
      showToast('You have been logged out.')
    } catch (error) {
      showToast(error.message)
    }
  }

  return (
      <div className="app">
        <header className="navbar">
          <NavLink className="logo" to="/">
            Handiwave
          </NavLink>

          <nav className="nav-links" aria-label="Main navigation">
            {navLinks.map((link) => (
              <NavLink
                className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }
                end={link.path === '/'}
                key={link.path}
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
              <NavLink className="login-button" to="/admin">
                Admin
              </NavLink>
            )}
            {user?.role === 'artisan' && (
              <NavLink className="login-button" to="/artisans">
                Artisan View
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
                <NavLink className="login-button" to="/login">
                  Login
                </NavLink>
                <NavLink className="signup-button" to="/signup">
                  Sign Up
                </NavLink>
              </>
            )}
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
