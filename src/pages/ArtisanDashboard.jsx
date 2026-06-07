import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import Button from '../components/Button.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import { getArtisanByProfileId } from '../services/artisanService.js'
import { getBookingsForUser } from '../services/bookingService.js'

function formatMoney(value) {
  return value ? `NGN ${Number(value).toLocaleString()}` : 'By quote'
}

function VerificationBadge({ status }) {
  return (
    <span className={`verification-badge verification-${status}`}>
      {status.replaceAll('_', ' ')}
    </span>
  )
}

function profileChecklist(artisan) {
  return [
    { done: Boolean(artisan.businessName), label: 'Business name added' },
    { done: Boolean(artisan.bio), label: 'Bio completed' },
    { done: Boolean(artisan.primaryService), label: 'Primary service selected' },
    { done: Boolean(artisan.serviceArea), label: 'Service area added' },
    { done: Boolean(artisan.startingPrice), label: 'Starting price added' },
    { done: artisan.verificationStatus === 'verified', label: 'Verification approved' },
  ]
}

function ArtisanDashboard() {
  const { user } = useAuth()
  const [artisan, setArtisan] = useState(null)
  const [bookings, setBookings] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const metrics = useMemo(() => {
    const pending = bookings.filter((booking) => booking.rawStatus === 'pending').length
    const active = bookings.filter((booking) => (
      ['confirmed', 'in_progress', 'artisan_completed'].includes(booking.rawStatus)
    )).length
    const completed = bookings.filter((booking) => booking.rawStatus === 'customer_confirmed').length

    return {
      active,
      completed,
      pending,
      total: bookings.length,
    }
  }, [bookings])

  const checklist = useMemo(() => artisan ? profileChecklist(artisan) : [], [artisan])
  const isSetupComplete = checklist.every((item) => item.done || item.label === 'Verification approved')
  const acceptedJobs = bookings.filter((booking) => booking.rawStatus === 'confirmed').length
  const inProgressJobs = bookings.filter((booking) => booking.rawStatus === 'in_progress').length
  const awaitingCustomerConfirmation = bookings.filter((booking) => (
    booking.rawStatus === 'artisan_completed'
  )).length
  const pendingJobs = bookings.filter((booking) => booking.rawStatus === 'pending')
  const recentActivity = bookings.slice(0, 3)

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      setError('')
      setIsLoading(true)

      try {
        const [artisanResult, bookingResult] = await Promise.all([
          getArtisanByProfileId(user.id),
          getBookingsForUser(user),
        ])

        if (!isMounted) {
          return
        }

        if (artisanResult.error || bookingResult.error) {
          setError(
            artisanResult.error?.message ||
              bookingResult.error?.message ||
              'Unable to load artisan dashboard.',
          )
        }

        setArtisan(artisanResult.data)
        setBookings(bookingResult.data)
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [user])

  if (isLoading) {
    return (
      <div className="starter-page artisan-dashboard-page">
        <SkeletonPreview count={4} label="Loading artisan dashboard" type="artisan" />
      </div>
    )
  }

  if (!artisan) {
    return (
      <div className="starter-page artisan-dashboard-page">
        <section className="page-hero compact">
          <p className="section-kicker">Artisan dashboard</p>
          <h1>Create your artisan profile</h1>
          <p>Your profile is required before you can receive jobs or appear publicly.</p>
          <div className="hero-actions">
            <Button className="primary-cta" to="/artisan-onboarding">
              Create Artisan Profile
            </Button>
          </div>
        </section>
        {error && <p className="auth-error">{error}</p>}
      </div>
    )
  }

  return (
    <div className="starter-page artisan-dashboard-page">
      <section className="artisan-dashboard-hero">
        <div>
          <p className="section-kicker">Artisan dashboard</p>
          <h1>Welcome, {artisan.businessName || artisan.fullName}</h1>
          <p>
            Manage your profile, track incoming jobs, and keep customers updated
            from one focused workspace.
          </p>
          <div className="profile-badge-stack dashboard-badges">
            <VerificationBadge status={artisan.verificationStatus} />
            <span>{artisan.skill}</span>
            <span>{artisan.fullLocation}</span>
          </div>
        </div>
        <div className="dashboard-profile-actions">
          <Button className="primary-cta" to="/artisan-onboarding">
            Edit Artisan Profile
          </Button>
          <Button className="secondary-cta" to={`/artisan-profile/${artisan.id}`}>
            View Public Profile
          </Button>
        </div>
      </section>

      {error && <p className="auth-error page-error">{error}</p>}

      <section className="artisan-dashboard-grid">
        <article className="artisan-profile-panel">
          <p className="section-kicker">My Profile</p>
          <div className="dashboard-profile-card">
            <div className="person-avatar large">{artisan.initials}</div>
            <div>
              <h2>{artisan.businessName || artisan.fullName}</h2>
              <p>{artisan.bio || 'Add a bio so customers understand your work style.'}</p>
            </div>
          </div>
          <div className="profile-detail-list">
            <span><strong>Primary service</strong>{artisan.skill}</span>
            <span><strong>Starting price</strong>{formatMoney(artisan.startingPrice)}</span>
            <span><strong>Experience</strong>{artisan.yearsExperience} years</span>
            <span><strong>Service area</strong>{artisan.serviceArea || artisan.fullLocation}</span>
          </div>
        </article>

        <section className="dashboard-metric-grid">
          <article><strong>{metrics.total}</strong><span>Total bookings</span></article>
          <article><strong>{metrics.pending}</strong><span>Pending jobs</span></article>
          <article><strong>{metrics.active}</strong><span>Active jobs</span></article>
          <article><strong>{acceptedJobs}</strong><span>Accepted jobs</span></article>
          <article><strong>{inProgressJobs}</strong><span>Jobs in progress</span></article>
          <article><strong>{awaitingCustomerConfirmation}</strong><span>Awaiting confirmation</span></article>
          <article><strong>{metrics.completed}</strong><span>Customer confirmed</span></article>
          <article><strong>{artisan.rating.toFixed(1)}</strong><span>Average rating</span></article>
          <article><strong>{artisan.reviewCount || 0}</strong><span>Reviews</span></article>
          <article><strong>{formatMoney(artisan.startingPrice)}</strong><span>Starting price</span></article>
          <article><strong>{artisan.skill}</strong><span>Primary service</span></article>
        </section>
      </section>

      {artisan.verificationStatus === 'pending' && (
        <section className="verification-warning">
          <strong>Verification pending</strong>
          <p>Your dashboard is active, but customers will only see your profile publicly after verification.</p>
        </section>
      )}

      <section className="artisan-insight-grid">
        <article className="artisan-profile-panel">
          <p className="section-kicker">Earnings / wallet</p>
          <h2>NGN 0</h2>
          <p>Wallet and payout summaries will appear here after completed paid jobs.</p>
        </article>
        <article className="artisan-profile-panel">
          <p className="section-kicker">Ratings / reviews</p>
          <h2>{artisan.rating.toFixed(1)} average</h2>
          <p>{artisan.reviewCount || 0} verified reviews and {artisan.completedJobs} confirmed jobs are contributing to your trust score.</p>
        </article>
        <article className="artisan-profile-panel">
          <p className="section-kicker">Reels / showcase</p>
          <h2>Work showcase</h2>
          <p>Post short work reels to help customers understand your quality before booking.</p>
          <Button className="secondary-cta" to="/reels">View Reels</Button>
        </article>
        <article className="artisan-profile-panel">
          <p className="section-kicker">Profile checklist</p>
          {!isSetupComplete && (
            <p>Complete these setup items so your profile is stronger for customers.</p>
          )}
          <div className="profile-checklist">
            {checklist.map((item) => (
              <span className={item.done ? 'done' : ''} key={item.label}>
                {item.done ? 'Done' : 'Open'} - {item.label}
              </span>
            ))}
          </div>
          {!isSetupComplete && (
            <Button className="secondary-cta" to="/artisan-onboarding">
              Continue Setup
            </Button>
          )}
        </article>
      </section>

      <section className="artisan-insight-grid">
        <article className="artisan-profile-panel">
          <p className="section-kicker">Pending jobs summary</p>
          <h2>{pendingJobs.length} pending request{pendingJobs.length === 1 ? '' : 's'}</h2>
          {pendingJobs.length === 0 ? (
            <p>No pending requests right now. New customer bookings will appear in Jobs.</p>
          ) : (
            <div className="dashboard-activity-list">
              {pendingJobs.slice(0, 3).map((booking) => (
                <span key={booking.id}>
                  <strong>{booking.service}</strong>
                  {booking.customer} - {booking.scheduledDate}
                </span>
              ))}
            </div>
          )}
          <Button className="secondary-cta" to="/artisan-jobs">
            Open Jobs
          </Button>
        </article>
        <article className="artisan-profile-panel">
          <p className="section-kicker">Recent activity</p>
          <h2>{recentActivity.length ? 'Latest bookings' : 'No activity yet'}</h2>
          {recentActivity.length === 0 ? (
            <p>Booking updates, customer requests, and completed jobs will appear here.</p>
          ) : (
            <div className="dashboard-activity-list">
              {recentActivity.map((booking) => (
                <span key={booking.id}>
                  <strong>{booking.status}</strong>
                  {booking.service} with {booking.customer}
                </span>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  )
}

export default ArtisanDashboard
