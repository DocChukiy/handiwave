import { NavLink } from 'react-router-dom'
import { Camera, MessageCircle, Share2, Phone, Mail, MapPin } from 'lucide-react'

const quickLinks = [
  { path: '/', label: 'Home' },
  { path: '/artisans', label: 'Find Artisans' },
  { path: '/bookings', label: 'My Bookings' },
  { path: '/messages', label: 'Messages' },
]

const serviceLinks = [
  { path: '/services', label: 'Electrician' },
  { path: '/services', label: 'Plumber' },
  { path: '/services', label: 'Cleaner' },
  { path: '/services', label: 'AC Repair' },
  { path: '/services', label: 'Generator Repair' },
]

function Footer() {
  return (
    <footer className="hw-footer">
      <div className="hw-footer-grid">
        <div className="hw-footer-brand">
          <NavLink className="hw-footer-logo" to="/">
            <img src="/handiwave-mark.svg" alt="Handiwave" className="hw-footer-logo-mark" />
            <span>Handiwave</span>
          </NavLink>
          <p>
            Book trusted artisans for home services quickly, safely, and confidently across Nigeria.
          </p>
          <div className="hw-social-links" aria-label="Social links">
            <button type="button" className="hw-social-link" disabled aria-label="Instagram (coming soon)">
              <Camera size={18} />
            </button>
            <button type="button" className="hw-social-link" disabled aria-label="Twitter (coming soon)">
              <MessageCircle size={18} />
            </button>
            <button type="button" className="hw-social-link" disabled aria-label="LinkedIn (coming soon)">
              <Share2 size={18} />
            </button>
          </div>
        </div>

        <div className="hw-footer-column">
          <h3>Quick Links</h3>
          {quickLinks.map((link) => (
            <NavLink key={link.path} to={link.path}>
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="hw-footer-column">
          <h3>Services</h3>
          {serviceLinks.map((link) => (
            <NavLink key={link.label} to={link.path}>
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="hw-footer-column hw-footer-contact">
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

      <div className="hw-footer-bottom">
        <p>© {new Date().getFullYear()} Handiwave. All rights reserved.</p>
        <div>
          <NavLink to="/privacy">Privacy Policy</NavLink>
          <NavLink to="/terms">Terms of Service</NavLink>
        </div>
      </div>
    </footer>
  )
}

export default Footer
