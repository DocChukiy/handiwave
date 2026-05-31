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
import { useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
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

function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('handiwave-theme')

    if (savedTheme) {
      return savedTheme
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  })

  const isDarkMode = theme === 'dark'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('handiwave-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }

  return (
    <BrowserRouter>
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
            <NavLink className="login-button" to="/login">
              Login
            </NavLink>
            <NavLink className="signup-button" to="/signup">
              Sign Up
            </NavLink>
          </div>
        </header>

        <main className="page-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/artisans" element={<Artisans />} />
            <Route path="/artisan-profile" element={<ArtisanProfile />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/reels" element={<Reels />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
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
      </div>
    </BrowserRouter>
  )
}

export default App
