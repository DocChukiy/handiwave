import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/tokens.css'
import './styles/components.css'
import './styles/layout.css'
import './styles/home.css'
import './styles/services.css'
import './styles/artisans.css'
import './styles/navigation.css'
import './styles/bookings.css'
import './styles/profile.css'
import './styles/legacy-pages.css'
import './styles/join-professionals.css'
import App from './App.jsx'

// Initialize Capacitor deep-link listener if running in native
;(async () => {
  try {
    const module = await import('./mobile/capacitor.js')
    if (module && typeof module.initDeepLinkListener === 'function') {
      module.initDeepLinkListener()
    }
  } catch {
    // not running in Capacitor/native environment; ignore
  }
})()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch(() => {
        // Keep app startup quiet if a browser blocks service workers.
      })
  })
}
