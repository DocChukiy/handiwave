import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import Button from '../components/Button.jsx'
import EmptyState from '../components/EmptyState.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import { getArtisanByProfileId } from '../services/artisanService.js'
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

function Profile() {
  const { user } = useAuth()
  const [artisan, setArtisan] = useState(null)
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

        if (!isMounted) {
          return
        }

        if (artisanResult.error || bookingsResult.error) {
          setError(
            artisanResult.error?.message ||
              bookingsResult.error?.message ||
              'Unable to load profile.',
          )
        }

        setArtisan(artisanResult.data)
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
