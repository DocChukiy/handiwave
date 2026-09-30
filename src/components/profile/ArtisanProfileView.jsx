import { useMemo } from 'react'
import ProfileHero from './ProfileHero.jsx'
import AccountInfoCard from './AccountInfoCard.jsx'
import DashboardMetric from './DashboardMetric.jsx'
import { Link } from 'react-router-dom'

function ArtisanProfileView({
  artisan,
  availability = { slots: [], unavailableDates: [] },
  bookings = [],
  summary,
}) {
  const completion = useMemo(() => {
    if (!artisan) return 0
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
  }, [artisan])

  const activeSlots = availability.slots?.filter((slot) => slot.isActive) || []
  const nextSlot = activeSlots.find((slot) => slot.isActive) || null
  const hasAvailability = activeSlots.length > 0

  const publicProfileTo = artisan?.id ? `/artisan-profile/${artisan.id}` : '#'
  return (
    <div className="hw-profile-page">
      <ProfileHero user={{ name: artisan?.businessName || artisan?.fullName }} isArtisan={true} artisan={artisan} />

      <div className="hw-profile-grid">
        <AccountInfoCard
          title="Business details"
          details={[
            { label: 'Business name', value: artisan?.businessName },
            { label: 'Bio', value: artisan?.bio },
            { label: 'Primary service', value: artisan?.primaryService?.name || artisan?.skill },
            { label: 'Service area', value: artisan?.serviceArea },
            { label: 'City / State', value: artisan?.fullLocation },
            { label: 'Starting price', value: artisan?.startingPrice ? `NGN ${Number(artisan.startingPrice).toLocaleString()}` : '' },
            { label: 'Verification', value: artisan?.verificationStatus },
          ]}
          actions={[
            { label: 'Edit Profile', to: '/artisan-onboarding', className: 'primary-cta' },
            { label: 'View Public Profile', to: publicProfileTo, className: 'secondary-cta' },
          ]}
        />

        <div className="hw-dashboard-metric-grid">
          <DashboardMetric value={`${completion}%`} label="Profile completion" />
          <DashboardMetric value={artisan?.completedJobs || 0} label="Completed jobs" />
          <DashboardMetric value={artisan?.rating ? artisan.rating.toFixed(1) : '0.0'} label="Average rating" />
          <DashboardMetric value={summary?.pending || 0} label="Pending jobs" />
        </div>
      </div>

      <section className="hw-profile-section">
        <div className="hw-profile-section-header">
          <h2>Availability</h2>
          <p>
            {hasAvailability
              ? 'Your weekly slots help customers pick a valid date and avoid schedule clashes before they submit a booking.'
              : 'Set your availability so customers know when they can book you.'}
          </p>
        </div>

        <div className="hw-availability-summary-grid">
          <div className="hw-availability-summary-item">
            <strong>{hasAvailability ? 'Complete' : 'Needs setup'}</strong>
            <span>Setup status</span>
          </div>
          <div className="hw-availability-summary-item">
            <strong>{activeSlots.length}</strong>
            <span>Active weekly slots</span>
          </div>
          <div className="hw-availability-summary-item">
            <strong>{availability.unavailableDates?.length || 0}</strong>
            <span>Unavailable dates</span>
          </div>
        </div>

        {hasAvailability ? (
          <div className="hw-availability-mini-list">
            {activeSlots.slice(0, 4).map((slot) => (
              <span key={slot.id}>
                <strong>{slot.dayLabel}</strong>
                {slot.startTime} - {slot.endTime}
              </span>
            ))}
            {nextSlot && (
              <span>
                Next available pattern: {nextSlot.dayLabel}, {nextSlot.startTime} - {nextSlot.endTime}
              </span>
            )}
          </div>
        ) : (
          <div className="hw-availability-setup-callout">
            <strong>Set your availability so customers know when they can book you.</strong>
            <p>Add your weekly working hours and block dates when you are unavailable.</p>
          </div>
        )}

        <div className="hw-account-info-actions">
          <Link to="/artisan-availability" className="primary-cta">
            {hasAvailability ? 'Edit Availability' : 'Set Availability'}
          </Link>
          <Link to="/artisan-availability" className="secondary-cta">Add Unavailable Date</Link>
        </div>
      </section>
    </div>
  )
}

export default ArtisanProfileView
