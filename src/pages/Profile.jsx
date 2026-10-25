import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import Button from '../components/Button.jsx'
import EmptyState from '../components/EmptyState.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import { getArtisanByProfileId } from '../services/artisanService.js'
import { getAvailabilityForArtisanId } from '../services/availabilityService.js'
import { getBookingsForUser } from '../services/bookingService.js'
import { updateProfile } from '../services/profileService.js'
import CustomerProfile from '../components/profile/CustomerProfile.jsx'
import ArtisanProfileView from '../components/profile/ArtisanProfileView.jsx'
import { showToast } from '../utils/toast.js'

function Profile() {
  const { refreshProfile, user } = useAuth()
  const [artisan, setArtisan] = useState(null)
  const [availability, setAvailability] = useState({ slots: [], unavailableDates: [] })
  const [bookings, setBookings] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const isArtisan = user?.role === 'artisan'
  const summary = useMemo(() => ({
    active: bookings.filter((booking) => (
      ['pending', 'reschedule_requested', 'confirmed', 'in_progress', 'artisan_completed'].includes(booking.rawStatus)
    )).length,
    completed: bookings.filter((booking) => (
      booking.rawStatus === 'customer_confirmed' || booking.rawStatus === 'completed'
    )).length,
    pending: bookings.filter((booking) => booking.rawStatus === 'pending').length,
    total: bookings.length,
  }), [bookings])

  async function handleCustomerProfileSave(updates) {
    const { data, error: updateError } = await updateProfile(user.id, updates)

    if (updateError) throw updateError

    if (refreshProfile) await refreshProfile()
    showToast('Profile details updated.')
    return data
  }

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
    return (
      <ArtisanProfileView
        artisan={artisan}
        availability={availability}
        bookings={bookings}
        summary={summary}
      />
    )
  }

  return (
    <CustomerProfile
      user={user}
      bookings={bookings}
      error={error}
      onSaveProfile={handleCustomerProfileSave}
      summary={summary}
    />
  )
}

export default Profile
