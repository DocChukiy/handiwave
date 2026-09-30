import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import BookingCard from '../bookings/BookingCard.jsx'
import ProfileHero from './ProfileHero.jsx'
import AccountInfoCard from './AccountInfoCard.jsx'
import DashboardMetric from './DashboardMetric.jsx'
import QuickActions from './QuickActions.jsx'

const quickActions = [
  {
    label: 'Browse Services',
    to: '/services',
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
    label: 'Wallet',
    to: '/wallet',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="16" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    ),
  },
]

function CustomerProfile({ user, bookings = [], summary, onEditProfile }) {
  const recentBookings = useMemo(() => bookings.slice(0, 5), [bookings])
  const cancelledCount = useMemo(
    () => bookings.filter((booking) => booking.rawStatus === 'cancelled').length,
    [bookings],
  )

  return (
    <div className="hw-profile-page">
      <ProfileHero user={user} isArtisan={false} />

      <div className="hw-profile-grid">
        <AccountInfoCard
          title="Personal details"
          details={[
            { label: 'Full name', value: user?.name },
            { label: 'Email', value: user?.email },
            { label: 'Phone', value: user?.phone },
            { label: 'City / State', value: `${user?.city || 'City not set'} / ${user?.state || 'State not set'}` },
          ]}
          actions={
            onEditProfile
              ? [{ label: 'Edit Profile', to: '#', className: 'primary-cta' }]
              : []
          }
        />

        <div className="hw-dashboard-metric-grid">
          <DashboardMetric value={summary.total} label="Total bookings" />
          <DashboardMetric value={summary.completed} label="Completed bookings" />
          <DashboardMetric value={cancelledCount} label="Cancelled bookings" />
        </div>
      </div>

      <QuickActions actions={quickActions} />

      {recentBookings.length > 0 && (
        <section className="hw-profile-section">
          <div className="hw-profile-section-header">
            <h2>Recent Bookings</h2>
            <p>Your latest service requests and their current status.</p>
          </div>
          <div className="hw-booking-list">
            {recentBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                participantLabel={(b) => b.artisan}
                showActions={false}
                isCustomer={true}
                user={user}
              />
            ))}
          </div>
          <div style={{ marginTop: 'var(--hw-space-4)' }}>
            <Link to="/bookings" className="hw-link">View all bookings</Link>
          </div>
        </section>
      )}

      <section className="hw-profile-section">
        <div className="hw-profile-section-header">
          <h2>Wallet</h2>
          <p>Payments, escrow, and refunds for your bookings.</p>
        </div>
        <div className="hw-wallet-summary-grid">
          <div className="hw-wallet-summary-item">
            <strong>NGN 0</strong>
            <span>Available balance</span>
          </div>
          <div className="hw-wallet-summary-item">
            <strong>NGN 0</strong>
            <span>Escrow balance</span>
          </div>
          <div className="hw-wallet-summary-item">
            <strong>Coming Soon</strong>
            <span>Top up wallet</span>
          </div>
        </div>
        <div style={{ marginTop: 'var(--hw-space-4)' }}>
          <Link to="/wallet" className="primary-cta">Open Wallet</Link>
        </div>
      </section>
    </div>
  )
}

export default CustomerProfile
