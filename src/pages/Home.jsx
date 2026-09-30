import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArtisanCard,
  ReelCard,
  ServiceCategoryCard,
} from '../components/cards.jsx'
import { openUrl as openInBrowser, getMobilePaymentCallbackUrl } from '../mobile/capacitor.js'
import { useAuth } from '../auth/useAuth.js'
import { featuredArtisans } from '../data/artisans.js'
import { howItWorksSteps, trustedMarkets } from '../data/home.js'
import { reelsPreview } from '../data/reels.js'
import { services } from '../data/services.js'
import {
  getBookingsForUser,
  respondToBookingReschedule,
} from '../services/bookingService.js'
import { initializeBookingPayment } from '../services/paymentService.js'
import { cardVariants } from '../utils/animations.js'
import { showToast } from '../utils/toast.js'
import logger from '../utils/logger.js'
import PageShell from '../components/ui/PageShell.jsx'
import Section from '../components/ui/Section.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Avatar from '../components/ui/Avatar.jsx'

// ============================================
// HELPERS
// ============================================

function getErrorMessage(error) {
  return [
    error.message,
    error.details,
    error.hint,
    error.code,
  ].filter(Boolean).join(' ')
}

function formatMoney(value, currency = 'NGN') {
  return `${currency} ${Number(value || 0).toLocaleString()}`
}

function getBookingPrice(booking) {
  return booking.finalPrice || booking.quotedPrice || booking.estimatedPrice || booking.escrowAmount || 0
}

function getQuoteStatus(booking) {
  if (['held_in_escrow', 'released', 'refunded'].includes(booking.paymentStatus)) {
    return 'paid'
  }

  if (booking.quoteAcceptedAt) {
    return 'accepted'
  }

  if (booking.quoteRejectedAt) {
    return 'rejected'
  }

  if (booking.quoteSentAt) {
    return 'sent'
  }

  return 'awaiting'
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// ============================================
// CATEGORY DATA
// ============================================

const presentationCategories = [
  {
    id: 'it-tech',
    title: 'IT & Technology',
    description: 'Computer repair, phone repair, IT support',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="14" height="8" x="5" y="2" rx="2"/>
        <rect width="20" height="8" x="2" y="14" rx="2"/>
        <path d="M6 18h2"/>
        <path d="M12 18h6"/>
      </svg>
    ),
    searchQuery: 'Technology',
  },
  {
    id: 'electrical',
    title: 'Electrical & Power',
    description: 'Wiring, sockets, generators, panels',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
    searchQuery: 'Electrical',
  },
  {
    id: 'ac-cooling',
    title: 'AC & Cooling',
    description: 'AC repair, installation, gas refill',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h10"/>
        <path d="M9 4v16"/>
        <path d="M21 12h-4"/>
        <path d="M12 4v4"/>
        <path d="M12 12v4"/>
        <path d="M12 20v4"/>
        <path d="m4 8 3 3 3-3"/>
        <path d="M7 11h3"/>
        <path d="M17 13h-3"/>
        <path d="m14 16 3-3 3 3"/>
      </svg>
    ),
    searchQuery: 'AC',
  },
  {
    id: 'plumbing',
    title: 'Plumbing & Water',
    description: 'Leaks, drains, taps, toilets',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>
      </svg>
    ),
    searchQuery: 'Plumbing',
  },
  {
    id: 'security',
    title: 'Security & Smart',
    description: 'CCTV, access control, smart locks',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>
    ),
    searchQuery: 'Security',
  },
  {
    id: 'maintenance',
    title: 'Maintenance & Repairs',
    description: 'General fixes, carpentry, painting',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
    searchQuery: 'Maintenance',
  },
]

// ============================================
// ACTIVE BOOKING CARD
// ============================================

function ActiveBookingCard({
  booking,
  onPay,
  onRescheduleResponse,
  payingBookingId,
  updatingBookingId,
  user,
}) {
  const bookingStatus = booking.rawStatus || booking.status
  const paymentStatus = booking.paymentStatus || 'unpaid'
  const quoteStatus = getQuoteStatus(booking)
  const price = getBookingPrice(booking)
  const shouldShowPayButton = (
    user?.role === 'customer' &&
    booking.customerId === user.id &&
    quoteStatus === 'accepted' &&
    ['unpaid', 'failed'].includes(paymentStatus)
  )

  return (
    <Card variant="interactive" className="hw-active-booking-card">
      <div className="hw-active-booking-header">
        <div className="hw-active-booking-info">
          <Badge variant={bookingStatus === 'in_progress' ? 'success' : bookingStatus === 'reschedule_requested' ? 'warning' : 'info'}>
            {bookingStatus.replace('_', ' ')}
          </Badge>
          <h3 className="hw-active-booking-service">{booking.service}</h3>
          <p className="hw-active-booking-artisan">{booking.artisan} • {booking.date}</p>
        </div>
        <Link to={`/messages?booking=${booking.id}`} className="hw-btn hw-btn-ghost hw-btn-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </Link>
      </div>

      <div className={`hw-quote-status hw-quote-${quoteStatus}`}>
        {quoteStatus === 'awaiting' && 'Waiting for artisan quote'}
        {quoteStatus === 'sent' && `Quote: ${formatMoney(booking.quotedPrice)}`}
        {quoteStatus === 'accepted' && 'Quote accepted — payment required'}
        {quoteStatus === 'rejected' && 'Waiting for revised quote'}
        {quoteStatus === 'paid' && 'Paid / escrow held'}
        {booking.quoteNotes && <span className="hw-quote-notes">"{booking.quoteNotes}"</span>}
      </div>

      {shouldShowPayButton && (
        <div className="hw-payment-action">
          <div className="hw-payment-info">
            <span className="hw-payment-amount">{formatMoney(price)}</span>
            <span className="hw-payment-label">to be paid</span>
          </div>
          <button
            className="hw-btn hw-btn-primary"
            disabled={payingBookingId === booking.id || price <= 0}
            type="button"
            onClick={() => onPay(booking)}
          >
            {payingBookingId === booking.id ? (
              'Starting...'
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="5" rx="2"/>
                  <line x1="2" x2="22" y1="10" y2="10"/>
                </svg>
                Pay Now
              </>
            )}
          </button>
        </div>
      )}

      {bookingStatus === 'reschedule_requested' && (
        <div className="hw-reschedule-card">
          <div className="hw-reschedule-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>Artisan proposed a new time</span>
          </div>
          <div className="hw-reschedule-times">
            <div className="hw-reschedule-time">
              <span className="hw-reschedule-label">Original</span>
              <span>{booking.scheduledDate} at {booking.scheduledTime}</span>
            </div>
            <div className="hw-reschedule-time hw-reschedule-new">
              <span className="hw-reschedule-label">Proposed</span>
              <span>{booking.proposedDate || 'Date pending'} at {booking.proposedTime || 'Time pending'}</span>
            </div>
          </div>
          {booking.rescheduleNote && <p className="hw-reschedule-note">{booking.rescheduleNote}</p>}
          <div className="hw-reschedule-actions">
            <button
              className="hw-btn hw-btn-primary hw-btn-sm"
              disabled={updatingBookingId === booking.id}
              type="button"
              onClick={() => onRescheduleResponse(booking, 'accept')}
            >
              {updatingBookingId === booking.id ? 'Updating...' : 'Accept'}
            </button>
            <button
              className="hw-btn hw-btn-secondary hw-btn-sm"
              disabled={updatingBookingId === booking.id}
              type="button"
              onClick={() => onRescheduleResponse(booking, 'reject')}
            >
              Decline
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

// ============================================
// TRUST CARD
// ============================================

function TrustCard() {
  const trustPoints = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      title: 'Professional Profiles',
      description: 'Detailed profiles with skills, experience, and work history',
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      ),
      title: 'Identity Verification',
      description: 'Artisans verify their identity through our screening process',
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
        </svg>
      ),
      title: 'Secure Payments',
      description: 'Money held safely in escrow until job completion',
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
      title: 'Direct Communication',
      description: 'Chat with artisans directly before and during the job',
    },
  ]

  return (
    <Card variant="outlined" className="hw-trust-card">
      <h3 className="hw-trust-title">Why choose Handiwave?</h3>
      <div className="hw-trust-grid">
        {trustPoints.map((point) => (
          <div key={point.title} className="hw-trust-point">
            <div className="hw-trust-icon">{point.icon}</div>
            <div>
              <h4>{point.title}</h4>
              <p>{point.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ============================================
// CATEGORY CARD
// ============================================

function CategoryCard({ category, index }) {
  return (
    <motion.div
      variants={cardVariants}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link
        to={`/services?search=${encodeURIComponent(category.searchQuery)}`}
        className="hw-category-card"
      >
        <div className="hw-category-icon">{category.icon}</div>
        <h3>{category.title}</h3>
        <p>{category.description}</p>
      </Link>
    </motion.div>
  )
}

// ============================================
// MAIN HOME COMPONENT
// ============================================

function Home() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const isCustomer = user?.role === 'customer'
  const firstName = user?.name?.trim().split(/\s+/)[0]
  const greeting = getGreeting()
  const [bookings, setBookings] = useState([])
  const [bookingError, setBookingError] = useState('')
  const [payingBookingId, setPayingBookingId] = useState('')
  const [updatingBookingId, setUpdatingBookingId] = useState('')

  // Load customer bookings
  useEffect(() => {
    let isMounted = true

    async function loadCustomerBookings() {
      if (!isCustomer) return

      const { data, error } = await getBookingsForUser(user)

      if (!isMounted) return

      if (error) {
        setBookingError(getErrorMessage(error))
        return
      }

      setBookings(data)
    }

    loadCustomerBookings()

    return () => {
      isMounted = false
    }
  }, [isCustomer, user])

  async function refreshCustomerBookings() {
    const { data, error } = await getBookingsForUser(user)

    if (error) {
      setBookingError(getErrorMessage(error))
      return false
    }

    setBookings(data)
    return true
  }

  async function handleRescheduleResponse(booking, decision) {
    setBookingError('')
    setUpdatingBookingId(booking.id)

    try {
      logger.debug('[Handiwave reschedule response] before update:', {
        bookingId: booking.id,
        decision,
        rawStatus: booking.rawStatus,
        status: booking.status,
      })

      const { data, error } = await respondToBookingReschedule({
        bookingId: booking.id,
        customerId: user.id,
        decision,
      })

      if (error) {
        setBookingError(getErrorMessage(error))
        return
      }

      if (!data?.id) {
        setBookingError('Supabase did not return the updated booking row.')
        return
      }

      const didRefresh = await refreshCustomerBookings()
      if (!didRefresh) return

      showToast(decision === 'accept'
        ? 'New booking time accepted.'
        : 'Proposed booking time rejected.')
    } catch (error) {
      setBookingError(getErrorMessage(error))
    } finally {
      setUpdatingBookingId('')
    }
  }

  async function handlePayWithPaystack(booking) {
    setBookingError('')
    setPayingBookingId(booking.id)

    try {
      const callbackUrl = await getMobilePaymentCallbackUrl()
      const { data, error } = await initializeBookingPayment(booking.id, callbackUrl)

      if (error) {
        setBookingError(getErrorMessage(error))
        return
      }

      if (!data?.authorization_url) {
        setBookingError('Paystack did not return an authorization URL.')
        return
      }

      try {
        const didOpen = await openInBrowser(data.authorization_url)
        if (!didOpen) {
          window.location.assign(data.authorization_url)
        }
      } catch {
        window.location.assign(data.authorization_url)
      }
    } catch (error) {
      setBookingError(getErrorMessage(error))
    } finally {
      setPayingBookingId('')
    }
  }

  // Get active bookings (limit to 3)
  const activeBookings = bookings
    .filter((booking) => (
      ['pending', 'reschedule_requested', 'confirmed', 'in_progress', 'artisan_completed'].includes(booking.rawStatus)
    ))
    .slice(0, 3)

  // Get popular services (top 4)
  const popularServices = services.slice(0, 4)

  return (
    <PageShell>
      <div className="hw-home">

        <header className="hw-home-hero">
          <div className="hw-home-hero-copy">
            <span className="hw-home-trust-pill">Trusted home services across Nigeria</span>
            {isAuthenticated && (
              <div className="hw-home-welcome">
                <span>{greeting}{firstName ? `, ${firstName}` : ''}</span>
                <Avatar name={user?.name} size="sm" />
              </div>
            )}
            <h1>Find trusted <em>professionals</em> near you</h1>
            <p>Book skilled professionals for home services quickly and safely.</p>

            <form
              className="hw-hero-search"
              onSubmit={(event) => {
                event.preventDefault()
                const query = searchQuery.trim()
                navigate(query ? `/services?search=${encodeURIComponent(query)}` : '/services')
              }}
            >
              <div className="hw-search-input-wrapper">
                <svg className="hw-search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.3-4.3"/>
                </svg>
                <input
                  className="hw-input hw-search-input"
                  type="search"
                  placeholder="Search plumbers, cleaners, electricians..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  aria-label="Search services"
                />
              </div>
              <button type="submit" className="hw-btn hw-btn-primary">Search</button>
            </form>

            <div className="hw-hero-actions">
              <Link className="hw-btn hw-btn-primary hw-btn-lg" to="/services">Book a Service</Link>
              <Link className="hw-btn hw-btn-secondary hw-btn-lg" to="/artisans">Browse Professionals</Link>
            </div>
          </div>

          <aside className="hw-home-hero-panel" aria-label="Handiwave trust highlights">
            <div className="hw-hero-panel-brand">
              <img src="/handiwave-mark.svg" alt="" />
              <span>Safe. Reliable. Trusted.</span>
            </div>
            <div className="hw-hero-stat-grid">
              <div><strong>2K+</strong><span>Verified professionals</span></div>
              <div><strong>24/7</strong><span>Fast booking</span></div>
            </div>
            <p>Trusted by homeowners and small businesses in</p>
            <div className="hw-hero-markets">
              {trustedMarkets.map((market) => <span key={market}>{market}</span>)}
            </div>
          </aside>
        </header>

        {/* ============================================
            2. ACTIVE BOOKINGS (Conditional)
            ============================================ */}
        {isCustomer && activeBookings.length > 0 && (
          <section className="hw-home-active-bookings">
            <div className="hw-section-header">
              <h2>Active Bookings</h2>
              <Link to="/bookings" className="hw-link">View all</Link>
            </div>
            {bookingError && <p className="hw-error">{bookingError}</p>}
            <div className="hw-active-bookings-list">
              {activeBookings.map((booking) => (
                <ActiveBookingCard
                  key={booking.id}
                  booking={booking}
                  onPay={handlePayWithPaystack}
                  onRescheduleResponse={handleRescheduleResponse}
                  payingBookingId={payingBookingId}
                  updatingBookingId={updatingBookingId}
                  user={user}
                />
              ))}
            </div>
          </section>
        )}

        {/* ============================================
            3. PRIMARY CATEGORY SECTION
            ============================================ */}
        <section className="hw-home-categories">
          <div className="hw-section-header">
            <h2>What do you need help with?</h2>
            <p>Choose a service and we'll help you get it handled.</p>
          </div>

          <motion.div
            className="hw-category-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ staggerChildren: 0.08 }}
          >
            {presentationCategories.map((category, index) => (
              <CategoryCard key={category.id} category={category} index={index} />
            ))}
          </motion.div>

          <div className="hw-view-all">
            <Link to="/services" className="hw-btn hw-btn-secondary">
              View all services
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/>
                <path d="m12 5 7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </section>

        {/* ============================================
            5. POPULAR SERVICES
            ============================================ */}
        <section className="hw-home-popular">
          <div className="hw-section-header hw-flex-between">
            <h2>Popular services</h2>
            <Link to="/services" className="hw-link">See all</Link>
          </div>

          <div className="hw-popular-grid">
            {popularServices.map((service) => (
              <Link
                key={service.title}
                to={`/services?search=${encodeURIComponent(service.title)}`}
                className="hw-popular-card"
              >
                <span className="hw-popular-icon">{service.icon}</span>
                <div className="hw-popular-info">
                  <h3>{service.title}</h3>
                  <span className="hw-popular-price">{service.price}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ============================================
            6. TRUST CARD
            ============================================ */}
        <TrustCard />

        {/* ============================================
            7. FEATURED PROFESSIONALS
            ============================================ */}
        <section className="hw-home-featured">
          <div className="hw-section-header hw-flex-between">
            <h2>Featured professionals</h2>
            <Link to="/artisans" className="hw-link">View all</Link>
          </div>

          <motion.div
            className="hw-featured-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ staggerChildren: 0.1 }}
          >
            {featuredArtisans.map((artisan) => (
              <ArtisanCard artisan={artisan} featured key={artisan.name} />
            ))}
          </motion.div>
        </section>

        {/* ============================================
            8. TRUST STRIP
            ============================================ */}
        <section className="hw-trust-strip" aria-label="Handiwave highlights">
          <div className="hw-trust-stats">
            <div className="hw-trust-stat">
              <strong>2K+</strong>
              <span>Verified professionals</span>
            </div>
            <div className="hw-trust-divider" />
            <div className="hw-trust-stat">
              <strong>24/7</strong>
              <span>Fast booking</span>
            </div>
            <div className="hw-trust-divider" />
            <div className="hw-trust-stat">
              <strong>Safe</strong>
              <span>Secure payments</span>
            </div>
          </div>
        </section>

        {/* ============================================
            9. HOW IT WORKS
            ============================================ */}
        <section className="hw-home-how-it-works">
          <Section
            kicker="How it works"
            title="Book trusted help in four steps"
            description="From search to safe completion, Handiwave keeps the process clear, fast, and easy to follow."
            align="center"
          >
            <motion.div
              className="hw-steps-grid"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ staggerChildren: 0.1 }}
            >
              {howItWorksSteps.map((step, index) => (
                <motion.article
                  key={step.title}
                  className="hw-step-card"
                  variants={cardVariants}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <span className="hw-step-number">0{index + 1}</span>
                  <span className="hw-step-icon">{step.icon}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </motion.article>
              ))}
            </motion.div>
          </Section>
        </section>

        {/* ============================================
            10. REELS PREVIEW
            ============================================ */}
        <section className="hw-home-reels">
          <Section
            kicker="Handiwave Reels"
            title="See professionals at work"
            description="Preview real service moments and skilled work before you book."
          >
            <motion.div
              className="hw-reels-grid"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              transition={{ staggerChildren: 0.1 }}
            >
              {reelsPreview.map((reel) => (
                <ReelCard key={`${reel.artisan}-${reel.category}`} preview reel={reel} />
              ))}
            </motion.div>
            <div className="hw-reels-cta">
              <Link to="/reels" className="hw-btn hw-btn-secondary">
                Watch more reels
              </Link>
            </div>
          </Section>
        </section>

        {/* ============================================
            11. TRUSTED MARKETS
            ============================================ */}
        <section className="hw-trusted-markets" aria-label="Service areas">
          <p>Trusted by homeowners and businesses in</p>
          <div className="hw-markets-list">
            {trustedMarkets.map((market) => (
              <span key={market}>{market}</span>
            ))}
          </div>
        </section>

        {/* ============================================
            12. FINAL CTA
            ============================================ */}
        <section className="hw-final-cta">
          <Card variant="elevated" className="hw-final-cta-card">
            <div className="hw-final-cta-content">
              <h2>Ready to get started?</h2>
              <p>Search, compare, chat, and pay with confidence from one clean Handiwave experience.</p>
              <div className="hw-final-cta-actions">
                <Link to="/services" className="hw-btn hw-btn-primary hw-btn-lg">
                  Find a professional
                </Link>
                <Link to="/reels" className="hw-btn hw-btn-secondary hw-btn-lg">
                  Watch reels
                </Link>
              </div>
            </div>
          </Card>
        </section>

      </div>
    </PageShell>
  )
}

export default Home
