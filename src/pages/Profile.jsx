import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import Button from '../components/Button.jsx'
import EmptyState from '../components/EmptyState.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import { getArtisanByProfileId } from '../services/artisanService.js'
import { getAvailabilityForArtisanId } from '../services/availabilityService.js'
import { getBookingsForUser } from '../services/bookingService.js'

function formatMoney(value) {
  return value ? `NGN ${Number(value).toLocaleString()}` : 'By quote'
}

function completionForArtisan(artisan) {
  if (!artisan) {
    return 0
  }

  const fields = [
    artisan.businessName,
    artisan.bio,
    artisan.primaryService,
    artisan.serviceArea,
    artisan.city,
    artisan.state,
    artisan.startingPrice,
  ]

  return Math.round((fields.filter(Boolean).length / fields.length) * 100)
}

function getNextAvailabilitySlot(slots) {
  return slots.find((slot) => slot.isActive) || null
}

function Profile() {
  const { user } = useAuth()
  const [artisan, setArtisan] = useState(null)
  const [availability, setAvailability] = useState({ slots: [], unavailableDates: [] })
  const [bookings, setBookings] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const isArtisan = user?.role === 'artisan'
  const summary = useMemo(() => ({
    completed: bookings.filter((booking) => (
      booking.rawStatus === 'customer_confirmed' || booking.rawStatus === 'completed'
    )).length,
    pending: bookings.filter((booking) => booking.rawStatus === 'pending').length,
    total: bookings.length,
  }), [bookings])

  useEffect(() => {
    let isMounted = true

    async function loadProfile() {
      setError('')
      setIsLoading(true)

      try {
        const [artisanResult, bookingsResult] = await Promise.all([
          isArtisan ? getArtisanByProfileId(user.id) : Promise.resolve({ data: null, error: null }),
          getBookingsForUser(user),
        ])
        const availabilityResult = artisanResult.data
          ? await getAvailabilityForArtisanId(artisanResult.data.id)
          : { data: { slots: [], unavailableDates: [] }, error: null }

        if (!isMounted) {
          return
        }

        if (artisanResult.error || bookingsResult.error || availabilityResult.error) {
          setError(
            artisanResult.error?.message ||
              bookingsResult.error?.message ||
              availabilityResult.error?.message ||
              'Unable to load profile.',
          )
        }

        setArtisan(artisanResult.data)
        setAvailability(availabilityResult.data)
        setBookings(bookingsResult.data)
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

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [isArtisan, user])

  if (isLoading) {
    return (
      <div className="starter-page profile-page">
        <SkeletonPreview count={3} label="Loading profile" type="artisan" />
      </div>
    )
  }

  if (isArtisan && !artisan) {
    return (
      <div className="starter-page profile-page">
        <EmptyState
          action={<Button className="primary-cta" to="/artisan-onboarding">Create Artisan Profile</Button>}
          title="No artisan profile yet"
        >
          Complete onboarding to unlock your private profile dashboard.
        </EmptyState>
        {error && <p className="auth-error">{error}</p>}
      </div>
    )
  }

  if (isArtisan) {
    const completion = completionForArtisan(artisan)
    const activeSlots = availability.slots.filter((slot) => slot.isActive)
    const nextSlot = getNextAvailabilitySlot(activeSlots)
    const hasAvailability = activeSlots.length > 0

    return (
      <div className="starter-page profile-page">
        <section className="page-hero compact">
          <p className="section-kicker">My Profile</p>
          <h1>{artisan.businessName || artisan.fullName}</h1>
          <p>Private artisan profile details, completion, verification, and performance.</p>
        </section>

        {error && <p className="auth-error">{error}</p>}

        <section className="profile-dashboard-grid">
          <article className="artisan-profile-panel">
            <p className="section-kicker">Business details</p>
            <div className="profile-detail-list">
              <span><strong>Business name</strong>{artisan.businessName || 'Not set'}</span>
              <span><strong>Bio</strong>{artisan.bio || 'Not set'}</span>
              <span><strong>Primary service</strong>{artisan.skill}</span>
              <span><strong>Service area</strong>{artisan.serviceArea || 'Not set'}</span>
              <span><strong>City / State</strong>{artisan.fullLocation}</span>
              <span><strong>Starting price</strong>{formatMoney(artisan.startingPrice)}</span>
              <span><strong>Verification</strong>{artisan.verificationStatus}</span>
            </div>
            <div className="profile-actions">
              <Button className="primary-cta" to="/artisan-onboarding">Edit Profile</Button>
              <Button className="secondary-cta" to={`/artisan-profile/${artisan.id}`}>View Public Profile</Button>
            </div>
          </article>

          <section className="dashboard-metric-grid">
            <article><strong>{completion}%</strong><span>Profile completion</span></article>
            <article><strong>{artisan.completedJobs}</strong><span>Completed jobs</span></article>
            <article><strong>{artisan.rating.toFixed(1)}</strong><span>Average rating</span></article>
            <article><strong>{summary.pending}</strong><span>Pending jobs</span></article>
          </section>
        </section>

        <section className="availability-profile-card">
          <div>
            <p className="section-kicker">Availability</p>
            <h2>{hasAvailability ? 'Customers can see your booking times' : 'Set your availability'}</h2>
            <p>
              {hasAvailability
                ? 'Your weekly slots help customers pick a valid date and avoid schedule clashes before they submit a booking.'
                : 'Set your availability so customers know when they can book you.'}
            </p>
          </div>

          <div className="availability-summary-grid">
            <article>
              <strong>{hasAvailability ? 'Complete' : 'Needs setup'}</strong>
              <span>Setup status</span>
            </article>
            <article>
              <strong>{activeSlots.length}</strong>
              <span>Active weekly slots</span>
            </article>
            <article>
              <strong>{availability.unavailableDates.length}</strong>
              <span>Unavailable dates</span>
            </article>
          </div>

          {hasAvailability ? (
            <div className="availability-mini-list">
              {activeSlots.slice(0, 4).map((slot) => (
                <span key={slot.id}>
                  <strong>{slot.dayLabel}</strong>
                  {slot.startTime} - {slot.endTime}
                </span>
              ))}
              {nextSlot && (
                <p>
                  Next available pattern: {nextSlot.dayLabel}, {nextSlot.startTime} - {nextSlot.endTime}
                </p>
              )}
            </div>
          ) : (
            <div className="availability-setup-callout">
              <strong>Set your availability so customers know when they can book you.</strong>
              <p>Add your weekly working hours and block dates when you are unavailable.</p>
            </div>
          )}

          <div className="profile-actions">
            <Button className="primary-cta" to="/artisan-availability">
              {hasAvailability ? 'Edit Availability' : 'Set Availability'}
            </Button>
            <Button className="secondary-cta" to="/artisan-availability">
              Add Unavailable Date
            </Button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="starter-page profile-page">
      <section className="page-hero compact">
        <p className="section-kicker">Customer profile</p>
        <h1>{user.name}</h1>
        <p>Manage your customer details, bookings, wallet, and saved artisans.</p>
      </section>

      {error && <p className="auth-error">{error}</p>}

      <section className="profile-dashboard-grid">
        <article className="artisan-profile-panel">
          <p className="section-kicker">Personal details</p>
          <div className="profile-detail-list">
            <span><strong>Full name</strong>{user.name}</span>
            <span><strong>Email</strong>{user.email}</span>
            <span><strong>Phone</strong>{user.phone || 'Not set'}</span>
            <span><strong>City / State</strong>{user.city || 'City not set'} / {user.state || 'State not set'}</span>
          </div>
          <Button className="primary-cta">Edit Profile</Button>
        </article>

        <section className="dashboard-metric-grid">
          <article><strong>{summary.total}</strong><span>Total bookings</span></article>
          <article><strong>{summary.completed}</strong><span>Completed bookings</span></article>
          <article><strong>0</strong><span>Saved artisans</span></article>
          <article><strong>NGN 0</strong><span>Wallet balance</span></article>
        </section>
      </section>
    </div>
  )
}

export default Profile
