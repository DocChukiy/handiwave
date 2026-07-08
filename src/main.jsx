import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
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
