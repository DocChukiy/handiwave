import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../EmptyState.jsx'
import BookingCard from '../bookings/BookingCard.jsx'
import ProfileHero from './ProfileHero.jsx'
import AccountInfoCard from './AccountInfoCard.jsx'
import DashboardMetric from './DashboardMetric.jsx'
import QuickActions from './QuickActions.jsx'

const quickActions = [
  {
    label: 'Post a Job',
    to: '/requests',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    label: 'My Bookings',
    to: '/bookings',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    label: 'Messages',
    to: '/messages',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: 'Find Professionals',
    to: '/artisans',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
]

function CustomerProfile({ user, bookings = [], error = '', summary, onSaveProfile }) {
  const [editError, setEditError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [profileForm, setProfileForm] = useState({
    city: user?.city || '',
    name: user?.name || '',
    phone: user?.phone || '',
    state: user?.state || '',
  })
  const recentBookings = useMemo(() => bookings.slice(0, 5), [bookings])
  const profileCompletion = useMemo(() => {
    const fields = [user?.name, user?.email, user?.phone, user?.city, user?.state]
    return Math.round((fields.filter(Boolean).length / fields.length) * 100)
  }, [user])

  function updateProfileForm(field, value) {
    setProfileForm((current) => ({ ...current, [field]: value }))
  }

  function handleEditToggle() {
    if (!isEditing) {
      setProfileForm({
        city: user?.city || '',
        name: user?.name || '',
        phone: user?.phone || '',
        state: user?.state || '',
      })
      setEditError('')
    }
    setIsEditing((current) => !current)
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()
    setEditError('')
    setIsSaving(true)

    try {
      await onSaveProfile(profileForm)
      setIsEditing(false)
    } catch (saveError) {
      setEditError(saveError.message || 'Your profile could not be updated. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="hw-profile-page">
      <ProfileHero user={user} isArtisan={false} className="customer-profile-hero" />

      {error && <p className="auth-error">Some profile activity could not load. Please refresh and try again.</p>}

      <div className="hw-profile-grid">
        <AccountInfoCard
          title="Personal details"
          details={[
            { label: 'Full name', value: user?.name },
            { label: 'Email', value: user?.email },
            { label: 'Phone', value: user?.phone },
            { label: 'City / State', value: `${user?.city || 'City not set'} / ${user?.state || 'State not set'}` },
          ]}
          actions={[{
            className: 'primary-cta',
            label: isEditing ? 'Close Editor' : 'Edit Details',
            onClick: handleEditToggle,
          }]}
        />

        <div className="hw-dashboard-metric-grid">
          <DashboardMetric value={`${profileCompletion}%`} label="Profile complete" />
          <DashboardMetric value={summary.active} label="Active bookings" />
          <DashboardMetric value={summary.completed} label="Completed bookings" />
          <DashboardMetric value={summary.total} label="All bookings" />
        </div>
      </div>

      {isEditing && (
        <form className="hw-customer-profile-form" onSubmit={handleProfileSubmit}>
          <div className="hw-profile-section-header">
            <p className="hw-section-kicker">Account details</p>
            <h2>Edit your profile</h2>
            <p>Accurate contact and location details make booking coordination easier.</p>
          </div>
          <div className="hw-customer-profile-form-grid">
            <label>
              Full name
              <input required value={profileForm.name} onChange={(event) => updateProfileForm('name', event.target.value)} />
            </label>
            <label>
              Phone number
              <input inputMode="tel" placeholder="+234 800 000 0000" value={profileForm.phone} onChange={(event) => updateProfileForm('phone', event.target.value)} />
            </label>
            <label>
              City / Area
              <input placeholder="Abuja" value={profileForm.city} onChange={(event) => updateProfileForm('city', event.target.value)} />
            </label>
            <label>
              State
              <input placeholder="FCT" value={profileForm.state} onChange={(event) => updateProfileForm('state', event.target.value)} />
            </label>
          </div>
          {editError && <p className="auth-error">{editError}</p>}
          <div className="hw-customer-profile-form-actions">
            <button className="primary-cta" disabled={isSaving} type="submit">{isSaving ? 'Saving...' : 'Save Changes'}</button>
            <button className="secondary-cta" disabled={isSaving} type="button" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </form>
      )}

      <QuickActions actions={quickActions} />

      <section className="hw-profile-section">
          <div className="hw-profile-section-header">
            <h2>Recent Bookings</h2>
            <p>Your latest service requests and their current status.</p>
          </div>
          {recentBookings.length > 0 ? (
            <>
              <div className="hw-booking-list">
                {recentBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    participantLabel={(bookingItem) => bookingItem.artisan}
                    showActions={false}
                    isCustomer
                    user={user}
                  />
                ))}
              </div>
              <div className="hw-profile-section-action">
                <Link to="/bookings" className="hw-link">View all bookings</Link>
              </div>
            </>
          ) : (
            <EmptyState action={<Link className="hw-btn hw-btn-primary" to="/requests">Post your first job</Link>} compact title="No bookings yet">
              Describe what you need and compare offers from verified professionals.
            </EmptyState>
          )}
        </section>

      <section className="hw-profile-trust-card">
        <div>
          <span>Account safety</span>
          <h2>Keep bookings and payments inside Handiwave.</h2>
          <p>This preserves your booking record, message history, payment protection, and access to support.</p>
        </div>
        <Link className="hw-btn hw-btn-secondary" to="/bookings">Review my bookings</Link>
      </section>
    </div>
  )
}

export default CustomerProfile
