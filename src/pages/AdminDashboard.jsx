import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import EmptyState from '../components/EmptyState.jsx'
import RoleNotice from '../components/RoleNotice.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import {
  approveWalletWithdrawal,
  getAdminDashboardData,
  rejectWalletWithdrawal,
  updateArtisanVerification,
} from '../services/adminService.js'
import { showToast } from '../utils/toast.js'

const tabs = [
  { key: 'users', label: 'Users' },
  { key: 'artisans', label: 'Artisans' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'disputes', label: 'Disputes' },
  { key: 'moderation', label: 'Moderation' },
  { key: 'finance', label: 'Wallet/Finance' },
  { key: 'reels', label: 'Reels' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'audit', label: 'Audit Logs' },
]

const metricLabels = [
  { key: 'totalUsers', label: 'Total Users' },
  { key: 'customers', label: 'Customers' },
  { key: 'artisans', label: 'Artisans' },
  { key: 'verifiedArtisans', label: 'Verified Artisans' },
  { key: 'pendingVerifications', label: 'Pending Verifications' },
  { key: 'totalBookings', label: 'Total Bookings' },
  { key: 'activeBookings', label: 'Active Bookings' },
  { key: 'disputes', label: 'Disputes' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'reels', label: 'Reels' },
  { key: 'walletEscrowBalance', label: 'Wallet Escrow Balance', money: true },
  { key: 'commissionTotal', label: 'Commission Total', money: true },
]

function getErrorMessage(error) {
  return [
    error?.message,
    error?.details,
    error?.hint,
    error?.code,
  ].filter(Boolean).join(' ')
}

function formatDate(value) {
  if (!value) {
    return 'No date'
  }

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatMoney(value) {
  return `NGN ${Number(value || 0).toLocaleString()}`
}

function StatusPill({ children, tone = 'neutral' }) {
  return <span className={`admin-status-pill ${tone}`}>{children}</span>
}

function getWithdrawalStatusLabel(status) {
  if (['successful', 'approved', 'processed'].includes(status)) {
    return 'Approved / Paid manually'
  }

  if (['failed', 'rejected', 'cancelled'].includes(status)) {
    return 'Rejected / Failed'
  }

  return 'Pending'
}

function getWithdrawalStatusTone(status) {
  if (['successful', 'approved', 'processed'].includes(status)) {
    return 'successful'
  }

  if (['failed', 'rejected', 'cancelled'].includes(status)) {
    return 'failed'
  }

  return 'pending'
}

function AdminSection({ children, emptyText, items, title }) {
  return (
    <section className="list-panel admin-data-panel">
      <div className="booking-history-header">
        <div>
          <p className="section-kicker">Admin data</p>
          <h2>{title}</h2>
        </div>
        <span>{items.length} records</span>
      </div>
      {items.length > 0 ? children : (
        <EmptyState compact title="Nothing here yet">
          {emptyText}
        </EmptyState>
      )}
    </section>
  )
}

function AdminDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('users')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [rejectionReasons, setRejectionReasons] = useState({})
  const [updatingArtisanId, setUpdatingArtisanId] = useState('')
  const [updatingWithdrawalId, setUpdatingWithdrawalId] = useState('')

  const pendingArtisans = useMemo(() => (
    data?.artisans.filter((artisan) => artisan.verificationStatus === 'pending') || []
  ), [data])

  async function loadAdminDashboard() {
    setError('')
    setIsLoading(true)

    try {
      const { data: dashboardData, error: dashboardError } = await getAdminDashboardData()

      if (dashboardError) {
        setError(getErrorMessage(dashboardError))
        return
      }

      setData(dashboardData)
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(loadAdminDashboard)
  }, [])

  async function handleVerificationUpdate(artisan, status) {
    setError('')
    setUpdatingArtisanId(artisan.id)

    try {
      const { error: updateError } = await updateArtisanVerification({
        adminId: user.id,
        artisanId: artisan.id,
        notes: `Admin changed verification status to ${status}.`,
        status,
      })

      if (updateError) {
        setError(getErrorMessage(updateError))
        return
      }

      await loadAdminDashboard()
      showToast(`Artisan ${status.replaceAll('_', ' ')}.`)
    } catch (updateError) {
      setError(getErrorMessage(updateError))
    } finally {
      setUpdatingArtisanId('')
    }
  }

  function updateRejectionReason(withdrawalId, value) {
    setRejectionReasons((currentReasons) => ({
      ...currentReasons,
      [withdrawalId]: value,
    }))
  }

  async function handleApproveWithdrawal(withdrawal) {
    setError('')
    setUpdatingWithdrawalId(withdrawal.id)

    try {
      const { error: approvalError } = await approveWalletWithdrawal({
        adminNote: 'Manual payout recorded from admin dashboard.',
        payoutMethod: 'manual',
        withdrawalId: withdrawal.id,
      })

      if (approvalError) {
        setError(getErrorMessage(approvalError))
        return
      }

      await loadAdminDashboard()
      showToast('Manual payout recorded.')
    } catch (approvalError) {
      setError(getErrorMessage(approvalError))
    } finally {
      setUpdatingWithdrawalId('')
    }
  }

  async function handleRejectWithdrawal(withdrawal) {
    const rejectionReason = rejectionReasons[withdrawal.id]?.trim()
    setError('')

    if (!rejectionReason) {
      setError('Enter a rejection reason before rejecting this withdrawal.')
      return
    }

    setUpdatingWithdrawalId(withdrawal.id)

    try {
      const { error: rejectionError } = await rejectWalletWithdrawal({
        rejectionReason,
        withdrawalId: withdrawal.id,
      })

      if (rejectionError) {
        setError(getErrorMessage(rejectionError))
        return
      }

      setRejectionReasons((currentReasons) => ({
        ...currentReasons,
        [withdrawal.id]: '',
      }))
      await loadAdminDashboard()
      showToast('Withdrawal rejected.')
    } catch (rejectionError) {
      setError(getErrorMessage(rejectionError))
    } finally {
      setUpdatingWithdrawalId('')
    }
  }

  if (isLoading) {
    return (
      <div className="starter-page admin-dashboard-page">
        <SkeletonPreview count={6} label="Loading admin dashboard" type="service" />
      </div>
    )
  }

  const metrics = data?.metrics || {}

  return (
    <div className="starter-page admin-dashboard-page">
      <section className="page-hero compact admin-hero">
        <p className="section-kicker">Admin Dashboard V2</p>
        <h1>Monitor Handiwave operations</h1>
        <p>
          Track users, verification, bookings, disputes, moderation, wallet activity, reels, reviews, and audit logs from real Supabase data.
        </p>
      </section>

      <RoleNotice />

      {error && <p className="auth-error page-error">{error}</p>}

      <section className="summary-grid admin-summary-grid">
        {metricLabels.map((metric) => (
          <div key={metric.key}>
            <strong>{metric.money ? formatMoney(metrics[metric.key]) : metrics[metric.key] || 0}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </section>

      <section className="admin-layout">
        <div className="admin-card">
          <p className="section-kicker">Verification queue</p>
          <h3>{pendingArtisans.length} pending artisans</h3>
          <p>Review new artisan profiles and move trusted professionals into the public marketplace.</p>
          <button type="button" onClick={() => setActiveTab('artisans')}>
            Review Artisans
          </button>
        </div>
        <div className="admin-card">
          <p className="section-kicker">Platform health</p>
          <h3>{metrics.activeBookings || 0} active bookings</h3>
          <p>{metrics.disputes || 0} open disputes and {metrics.commissionTotal ? formatMoney(metrics.commissionTotal) : 'NGN 0'} in tracked commission.</p>
          <button type="button" onClick={() => setActiveTab('disputes')}>
            Review Disputes
          </button>
        </div>
      </section>

      <div className="admin-tabs" role="tablist" aria-label="Admin dashboard sections">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.key ? 'active' : ''}
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <AdminSection emptyText="Users will appear after signup." items={data.users} title="Users">
          {data.users.map((profile) => (
            <article className="list-row admin-list-row" key={profile.id}>
              <div>
                <h3>{profile.fullName}</h3>
                <p>{profile.email || 'No email'} • {profile.city || 'City pending'}, {profile.state || 'State pending'}</p>
              </div>
              <StatusPill tone={profile.role}>{profile.role}</StatusPill>
            </article>
          ))}
        </AdminSection>
      )}

      {activeTab === 'artisans' && (
        <AdminSection emptyText="Artisan onboarding profiles will appear here." items={data.artisans} title="Artisans and verification">
          {data.artisans.map((artisan) => {
            const isUpdating = updatingArtisanId === artisan.id

            return (
              <article className="list-row admin-list-row artisan-admin-row" key={artisan.id}>
                <div>
                  <h3>{artisan.businessName || artisan.fullName}</h3>
                  <p>{artisan.primaryService} • {artisan.city}, {artisan.state} • {artisan.rating.toFixed(1)} rating</p>
                  <small>{artisan.completedJobs} completed jobs • {artisan.reviewCount} reviews</small>
                </div>
                <div className="admin-row-actions">
                  <StatusPill tone={artisan.verificationStatus}>{artisan.verificationStatus}</StatusPill>
                  <button disabled={isUpdating} type="button" onClick={() => handleVerificationUpdate(artisan, 'verified')}>
                    Verify
                  </button>
                  <button disabled={isUpdating} type="button" onClick={() => handleVerificationUpdate(artisan, 'rejected')}>
                    Reject
                  </button>
                  <button disabled={isUpdating} type="button" onClick={() => handleVerificationUpdate(artisan, 'suspended')}>
                    Suspend
                  </button>
                </div>
              </article>
            )
          })}
        </AdminSection>
      )}

      {activeTab === 'bookings' && (
        <AdminSection emptyText="Bookings will appear after customers create requests." items={data.bookings} title="Bookings">
          {data.bookings.map((booking) => (
            <article className="list-row admin-list-row" key={booking.id}>
              <div>
                <h3>{booking.service}</h3>
                <p>{booking.customer} with {booking.artisan} • {booking.city}, {booking.state}</p>
                <small>{formatMoney(booking.estimatedPrice)} • {formatDate(booking.createdAt)}</small>
              </div>
              <div className="admin-row-actions">
                <StatusPill tone={booking.status}>{booking.status}</StatusPill>
                <StatusPill tone={booking.paymentStatus}>{booking.paymentStatus}</StatusPill>
              </div>
            </article>
          ))}
        </AdminSection>
      )}

      {activeTab === 'disputes' && (
        <AdminSection emptyText="Disputes opened by customers or artisans will appear here." items={data.disputes} title="Disputes">
          {data.disputes.map((dispute) => (
            <article className="list-row admin-list-row" key={dispute.id}>
              <div>
                <h3>{dispute.reason}</h3>
                <p>{dispute.customer} and {dispute.artisan}</p>
                <small>{dispute.requestedResolution || 'No requested resolution'} • {formatDate(dispute.createdAt)}</small>
              </div>
              <div className="admin-row-actions">
                <StatusPill tone={dispute.status}>{dispute.status}</StatusPill>
                <Link className="secondary-mini-link" to={`/disputes?id=${dispute.id}`}>
                  Open Workspace
                </Link>
              </div>
            </article>
          ))}
        </AdminSection>
      )}

      {activeTab === 'moderation' && (
        <AdminSection emptyText="User reports and moderation cases will appear here." items={data.moderationCases} title="Moderation cases">
          {data.moderationCases.map((item) => (
            <article className="list-row admin-list-row" key={item.id}>
              <div>
                <h3>{item.title}</h3>
                <p>{item.caseType} • reported by {item.reporter}</p>
                <small>{item.priority} priority • {formatDate(item.createdAt)}</small>
              </div>
              <StatusPill tone={item.status}>{item.status}</StatusPill>
            </article>
          ))}
        </AdminSection>
      )}

      {activeTab === 'finance' && (
        <section className="admin-finance-grid">
          <AdminSection emptyText="Withdrawal requests will appear here." items={data.withdrawals} title="Wallet withdrawals">
            {data.withdrawals.map((withdrawal) => {
              const isPending = withdrawal.status === 'pending'
              const isUpdating = updatingWithdrawalId === withdrawal.id

              return (
                <article className="list-row admin-list-row admin-withdrawal-row" key={withdrawal.id}>
                  <div>
                    <h3>{withdrawal.amountLabel}</h3>
                    <p>
                      {withdrawal.bankName} • {withdrawal.accountName || 'Account name pending'} • {withdrawal.accountNumber || 'Account pending'}
                    </p>
                    <small>
                      Requested {formatDate(withdrawal.requestedAt || withdrawal.createdAt)} • Manual payout / Paystack transfer coming soon
                    </small>
                    {withdrawal.rejectionReason && (
                      <small>Reason: {withdrawal.rejectionReason}</small>
                    )}
                    {['successful', 'approved', 'processed'].includes(withdrawal.status) && (
                      <small>Manual payout recorded.</small>
                    )}
                  </div>
                  <div className="admin-row-actions admin-withdrawal-actions">
                    <StatusPill tone={getWithdrawalStatusTone(withdrawal.status)}>
                      {getWithdrawalStatusLabel(withdrawal.status)}
                    </StatusPill>
                    {isPending && (
                      <>
                        <button
                          disabled={isUpdating}
                          type="button"
                          onClick={() => handleApproveWithdrawal(withdrawal)}
                        >
                          {isUpdating ? 'Approving...' : 'Approve'}
                        </button>
                        <label className="admin-rejection-field">
                          <span>Rejection reason</span>
                          <input
                            disabled={isUpdating}
                            placeholder="Reason if rejecting"
                            value={rejectionReasons[withdrawal.id] || ''}
                            onChange={(event) => updateRejectionReason(withdrawal.id, event.target.value)}
                          />
                        </label>
                        <button
                          className="danger-action"
                          disabled={isUpdating}
                          type="button"
                          onClick={() => handleRejectWithdrawal(withdrawal)}
                        >
                          {isUpdating ? 'Rejecting...' : 'Reject'}
                        </button>
                      </>
                    )}
                  </div>
                </article>
              )
            })}
          </AdminSection>
          <AdminSection emptyText="Commission entries will appear after escrow releases." items={data.commissions} title="Commission entries">
            {data.commissions.map((entry) => (
              <article className="list-row admin-list-row" key={entry.id}>
                <div>
                  <h3>{formatMoney(entry.commission)}</h3>
                  <p>Gross {formatMoney(entry.gross)} • Payout {formatMoney(entry.artisanPayout)}</p>
                  <small>{formatDate(entry.createdAt)}</small>
                </div>
                <StatusPill tone={entry.status}>{entry.status}</StatusPill>
              </article>
            ))}
          </AdminSection>
        </section>
      )}

      {activeTab === 'reels' && (
        <AdminSection emptyText="Uploaded reels will appear here." items={data.reels} title="Reels">
          {data.reels.map((reel) => (
            <article className="list-row admin-list-row" key={reel.id}>
              <div>
                <h3>{reel.caption}</h3>
                <p>{reel.artisan} • {reel.service}</p>
                <small>{formatDate(reel.createdAt)}</small>
              </div>
              <div className="admin-row-actions">
                <StatusPill tone={reel.status}>{reel.status}</StatusPill>
                <StatusPill tone={reel.moderationStatus}>{reel.moderationStatus}</StatusPill>
              </div>
            </article>
          ))}
        </AdminSection>
      )}

      {activeTab === 'reviews' && (
        <AdminSection emptyText="Customer reviews will appear here." items={data.reviews} title="Reviews">
          {data.reviews.map((review) => (
            <article className="list-row admin-list-row" key={review.id}>
              <div>
                <h3>{review.rating} stars for {review.artisan}</h3>
                <p>{review.text}</p>
                <small>By {review.customer} • {formatDate(review.createdAt)}</small>
              </div>
              <StatusPill tone={review.moderationStatus}>{review.moderationStatus}</StatusPill>
            </article>
          ))}
        </AdminSection>
      )}

      {activeTab === 'audit' && (
        <AdminSection emptyText="Admin actions will appear here after changes are logged." items={data.auditLogs} title="Audit logs">
          {data.auditLogs.map((log) => (
            <article className="list-row admin-list-row" key={log.id}>
              <div>
                <h3>{log.action.replaceAll('_', ' ')}</h3>
                <p>{log.actor} • {log.target}</p>
                <small>{formatDate(log.createdAt)}</small>
              </div>
              <StatusPill>logged</StatusPill>
            </article>
          ))}
        </AdminSection>
      )}
    </div>
  )
}

export default AdminDashboard
