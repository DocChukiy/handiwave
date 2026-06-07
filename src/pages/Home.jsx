import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArtisanCard,
  ReelCard,
  ServiceCategoryCard,
} from '../components/cards.jsx'
import { useAuth } from '../auth/useAuth.js'
import { featuredArtisans } from '../data/artisans.js'
import { howItWorksSteps, trustedMarkets } from '../data/home.js'
import { reelsPreview } from '../data/reels.js'
import { serviceCategories } from '../data/services.js'
import {
  getBookingsForUser,
  respondToBookingReschedule,
} from '../services/bookingService.js'
import { cardVariants } from '../utils/animations.js'
import { showToast } from '../utils/toast.js'

function getErrorMessage(error) {
  return [
    error.message,
    error.details,
    error.hint,
    error.code,
  ].filter(Boolean).join(' ')
}

function CustomerActiveBookings({ bookings, onRescheduleResponse, updatingBookingId }) {
  const activeBookings = bookings
    .filter((booking) => (
      ['pending', 'reschedule_requested', 'confirmed', 'in_progress', 'artisan_completed'].includes(booking.rawStatus)
    ))
    .slice(0, 3)

  if (activeBookings.length === 0) {
    return <p>No active bookings yet. Your open requests will appear here.</p>
  }

  return (
    <div className="home-active-bookings">
      {activeBookings.map((booking) => {
        const bookingStatus = booking.rawStatus || booking.status

        console.log('[Handiwave customer home booking render]', {
          bookingId: booking.id,
          status: bookingStatus,
        })

        return (
          <div className="home-active-booking-card" key={booking.id}>
            <strong>{booking.service}</strong>
            <p>{booking.artisan} - {booking.date}</p>
            <Link className="job-message-link" to={`/messages?booking=${booking.id}`}>
              Message Artisan
            </Link>
            {bookingStatus === 'reschedule_requested' && (
              <div className="booking-reschedule-note">
                <div className="booking-reschedule-heading">
                  <strong>Artisan proposed a new time</strong>
                  <span className="awaiting-response-badge">Awaiting Your Response</span>
                </div>
                <p>Original: {booking.scheduledDate} at {booking.scheduledTime}</p>
                <p>Proposed: {booking.proposedDate || 'Date pending'} at {booking.proposedTime || 'Time pending'}</p>
                {booking.rescheduleNote && <p>{booking.rescheduleNote}</p>}
                <div className="booking-reschedule-actions">
                  <button
                    disabled={updatingBookingId === booking.id}
                    type="button"
                    onClick={() => onRescheduleResponse(booking, 'accept')}
                  >
                    {updatingBookingId === booking.id ? 'Updating...' : 'Accept New Time'}
                  </button>
                  <button
                    disabled={updatingBookingId === booking.id}
                    type="button"
                    onClick={() => onRescheduleResponse(booking, 'reject')}
                  >
                    {updatingBookingId === booking.id ? 'Updating...' : 'Reject New Time'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Home() {
  const { user } = useAuth()
  const isCustomer = user?.role === 'customer'
  const [bookings, setBookings] = useState([])
  const [bookingError, setBookingError] = useState('')
  const [updatingBookingId, setUpdatingBookingId] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadCustomerBookings() {
      if (!isCustomer) {
        return
      }

      const { data, error } = await getBookingsForUser(user)

      if (!isMounted) {
        return
      }

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
      console.log('[Handiwave reschedule response] before update:', {
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
      if (!didRefresh) {
        return
      }

      showToast(decision === 'accept'
        ? 'New booking time accepted.'
        : 'Proposed booking time rejected.')
    } catch (error) {
      setBookingError(getErrorMessage(error))
    } finally {
      setUpdatingBookingId('')
    }
  }

  return (
    <>
      <section className="hero-section">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <p className="hero-badge">Trusted home services across Nigeria</p>
          <h1>Find trusted artisans near you</h1>
          <p className="hero-subheadline">
            Book skilled professionals for home services quickly and safely.
          </p>

          <form
            className="hero-search"
            onSubmit={(event) => event.preventDefault()}
          >
            <input
              aria-label="Search for artisans or services"
              placeholder="Search plumbers, cleaners, electricians..."
              type="search"
            />
            <button type="submit">Search</button>
          </form>

          <div className="hero-actions">
            <Link className="primary-cta" to="/services">
              Book a Service
            </Link>
            <Link className="secondary-cta" to="/artisans">
              Browse Artisans
            </Link>
          </div>

          <div className="hero-stats" aria-label="Handiwave highlights">
            <span>
              <strong>2k+</strong>
              Verified artisans
            </span>
            <span>
              <strong>24/7</strong>
              Fast booking
            </span>
            <span>
              <strong>Safe</strong>
              Secure payments
            </span>
          </div>
        </motion.div>

        <motion.div
          className="hero-visual"
          aria-label="Hero image placeholder"
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: 'easeOut' }}
        >
          <div className="visual-card main-card">
            <span className="card-label">Top artisan</span>
            <div className="artisan-row">
              <div className="artisan-avatar">AO</div>
              <div>
                <strong>Ada Okafor</strong>
                <p>Expert electrician in Lekki</p>
              </div>
            </div>
            <div className="rating-row">
              <span>Rating 4.9</span>
              <span>Available today</span>
            </div>
          </div>

          <div className="visual-card service-card">
            <span>AC repair</span>
            <strong>From NGN 8,500</strong>
          </div>

          <div className="visual-card payment-card">
            <span>Booking secured</span>
            <strong>Escrow protected</strong>
          </div>
        </motion.div>
      </section>

      <motion.section
        className="trust-strip"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <p>Trusted by homeowners and small businesses in</p>
        <div>
          {trustedMarkets.map((market) => (
            <span key={market}>{market}</span>
          ))}
        </div>
      </motion.section>

      {isCustomer && (
        <section className="customer-home-snapshot">
          <article>
            <p className="section-kicker">Active bookings</p>
            <h2>Track your open service requests</h2>
            {bookingError && <p className="auth-error">{bookingError}</p>}
            <CustomerActiveBookings
              bookings={bookings}
              onRescheduleResponse={handleRescheduleResponse}
              updatingBookingId={updatingBookingId}
            />
            <Link className="primary-cta" to="/bookings">View Bookings</Link>
          </article>
          <article>
            <p className="section-kicker">Saved artisans</p>
            <h2>Your trusted shortlist</h2>
            <p>Keep reliable professionals close for repeat bookings.</p>
            <Link className="secondary-cta" to="/artisans">Find Artisans</Link>
          </article>
          <article>
            <p className="section-kicker">Recent activity</p>
            <h2>Wallet, chats, and updates</h2>
            <p>Check messages and wallet activity before your next service visit.</p>
            <Link className="secondary-cta" to="/profile">Open Profile</Link>
          </article>
        </section>
      )}

      <section className="categories-section">
        <div className="section-heading">
          <p className="section-kicker">Popular categories</p>
          <h2>Services people book every day</h2>
          <p>
            Choose from reliable local professionals for everyday repairs,
            maintenance, grooming, and home support.
          </p>
        </div>

        <motion.div
          className="categories-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ staggerChildren: 0.08 }}
        >
          {serviceCategories.map((category) => (
            <ServiceCategoryCard category={category} key={category.title} />
          ))}
        </motion.div>
      </section>

      <section className="featured-artisans-section">
        <div className="section-heading">
          <p className="section-kicker">Featured artisans</p>
          <h2>Highly rated professionals you can trust</h2>
          <p>
            Meet verified experts with strong reviews, completed jobs, and local
            availability across major Nigerian cities.
          </p>
        </div>

        <motion.div
          className="featured-artisans-grid"
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

      <section className="how-it-works-section">
        <div className="section-heading">
          <p className="section-kicker">How Handiwave works</p>
          <h2>Book trusted help in four simple steps</h2>
          <p>
            From search to safe completion, Handiwave keeps the process clear,
            fast, and easy to follow.
          </p>
        </div>

        <motion.div
          className="steps-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {howItWorksSteps.map((step, index) => (
            <motion.article
              className="step-card"
              key={step.title}
              variants={cardVariants}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              whileHover={{ y: -6 }}
            >
              <span className="step-number">0{index + 1}</span>
              <span className="step-icon" aria-hidden="true">
                {step.icon}
              </span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <section className="reels-preview-section">
        <div className="section-heading">
          <p className="section-kicker">Handiwave reels</p>
          <h2>Watch artisans show their work</h2>
          <p>
            Preview real service moments, quick transformations, and skilled
            work before you book.
          </p>
        </div>

        <motion.div
          className="reels-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {reelsPreview.map((reel) => (
            <ReelCard key={`${reel.artisan}-${reel.category}`} preview reel={reel} />
          ))}
        </motion.div>
      </section>

      <motion.section
        className="final-cta-section"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div>
          <p className="section-kicker">Ready when you are</p>
          <h2>Book a verified artisan without the stress</h2>
          <p>
            Search, compare, chat, and pay with confidence from one clean
            Handiwave experience.
          </p>
        </div>
        <div className="final-cta-actions">
          <Link className="primary-cta" to="/services">
            Start Booking
          </Link>
          <Link className="secondary-cta" to="/reels">
            Watch Reels
          </Link>
        </div>
      </motion.section>
    </>
  )
}

export default Home
