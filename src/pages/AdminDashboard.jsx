import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
  { key: 'overview', label: 'Overview' },
  { key: 'professionals', label: 'Professionals' },
  { key: 'users', label: 'Users' },
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
  const navigate = useNavigate()
  const { section } = useParams()
  const activeTab = tabs.some((tab) => tab.key === section) ? section : 'overview'
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [professionalFilter, setProfessionalFilter] = useState('all')
  const [professionalNotes, setProfessionalNotes] = useState({})
  const [professionalSearch, setProfessionalSearch] = useState('')
  const [rejectionReasons, setRejectionReasons] = useState({})
  const [updatingArtisanId, setUpdatingArtisanId] = useState('')
  const [updatingWithdrawalId, setUpdatingWithdrawalId] = useState('')

  const pendingArtisans = useMemo(() => (
    data?.artisans.filter((artisan) => ['incomplete', 'pending'].includes(artisan.verificationStatus)) || []
  ), [data])

  const filteredProfessionals = useMemo(() => {
    const search = professionalSearch.trim().toLowerCase()

    return (data?.artisans || []).filter((artisan) => {
      const matchesStatus = professionalFilter === 'all' || artisan.verificationStatus === professionalFilter
      const matchesSearch = !search || [
        artisan.businessName,
        artisan.city,
        artisan.email,
        artisan.fullName,
        artisan.primaryService,
        artisan.state,
      ].some((value) => value?.toLowerCase().includes(search))

      return matchesStatus && matchesSearch
    })
  }, [data, professionalFilter, professionalSearch])

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
        notes: professionalNotes[artisan.id]?.trim() || `Admin changed verification status to ${status}.`,
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

  function openSection(tab) {
    navigate(tab === 'overview' ? '/admin' : `/admin/${tab}`)
  }

  function updateProfessionalNote(artisanId, value) {
    setProfessionalNotes((currentNotes) => ({
      ...currentNotes,
      [artisanId]: value,
    }))
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
  const visibleMetrics = activeTab === 'finance'
    ? metricLabels.filter((metric) => [
        'walletEscrowBalance',
        'commissionTotal',
        'totalBookings',
        'activeBookings',
      ].includes(metric.key))
    : metricLabels.slice(0, 8)

  return (
    <div className="starter-page admin-dashboard-page">
      <section className="page-hero compact admin-hero">
        <p className="section-kicker">Handiwave control centre</p>
        <h1>Run the platform from one place</h1>
        <p>
          Review professional applications, monitor service activity, resolve issues, manage platform funds, and keep an audit trail.
        </p>
      </section>

      <RoleNotice />

      {error && <p className="auth-error page-error">{error}</p>}

      <section className="summary-grid admin-summary-grid">
        {visibleMetrics.map((metric) => (
          <div key={metric.key}>
            <strong>{metric.money ? formatMoney(metrics[metric.key]) : metrics[metric.key] || 0}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </section>

      {activeTab === 'overview' && <section className="admin-layout">
        <div className="admin-card">
          <p className="section-kicker">Professional applications</p>
          <h3>{pendingArtisans.length} awaiting a decision</h3>
          <p>Open each application, check submitted details, add an internal note, and approve only completed profiles.</p>
          <button type="button" onClick={() => openSection('professionals')}>
            Review Professionals
          </button>
        </div>
        <div className="admin-card">
          <p className="section-kicker">Platform health</p>
          <h3>{metrics.activeBookings || 0} active bookings</h3>
          <p>{metrics.disputes || 0} open disputes and {metrics.commissionTotal ? formatMoney(metrics.commissionTotal) : 'NGN 0'} in tracked commission.</p>
          <button type="button" onClick={() => openSection('disputes')}>
            Review Disputes
          </button>
        </div>
        <div className="admin-card">
          <p className="section-kicker">Platform finance</p>
          <h3>{formatMoney(metrics.walletEscrowBalance)}</h3>
          <p>{data.withdrawals.filter((item) => item.status === 'pending').length} withdrawal requests need attention.</p>
          <button type="button" onClick={() => openSection('finance')}>
            Open Finance
          </button>
        </div>
      </section>}

      <div className="admin-tabs" role="tablist" aria-label="Admin dashboard sections">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.key ? 'active' : ''}
            key={tab.key}
            type="button"
            onClick={() => openSection(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <section className="admin-overview-grid">
          <AdminSection emptyText="No professional applications are waiting." items={pendingArtisans.slice(0, 5)} title="Priority verification queue">
            {pendingArtisans.slice(0, 5).map((artisan) => (
              <article className="list-row admin-list-row" key={artisan.id}>
                <div>
                  <h3>{artisan.businessName || artisan.fullName}</h3>
                  <p>{artisan.primaryService} • {artisan.city || 'City pending'}, {artisan.state || 'State pending'}</p>
                  <small>Applied {formatDate(artisan.createdAt)}</small>
                </div>
                <button className="secondary-mini-link" type="button" onClick={() => openSection('professionals')}>Review</button>
              </article>
            ))}
          </AdminSection>
          <AdminSection emptyText="No withdrawal requests are waiting." items={data.withdrawals.filter((item) => item.status === 'pending').slice(0, 5)} title="Pending finance actions">
            {data.withdrawals.filter((item) => item.status === 'pending').slice(0, 5).map((withdrawal) => (
              <article className="list-row admin-list-row" key={withdrawal.id}>
                <div>
                  <h3>{withdrawal.amountLabel}</h3>
                  <p>{withdrawal.bankName} • {withdrawal.accountName || 'Account name pending'}</p>
                  <small>Requested {formatDate(withdrawal.requestedAt || withdrawal.createdAt)}</small>
                </div>
                <button className="secondary-mini-link" type="button" onClick={() => openSection('finance')}>Review</button>
              </article>
            ))}
          </AdminSection>
        </section>
      )}

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

      {activeTab === 'professionals' && (
        <AdminSection emptyText="Professional applications will appear here after signup and onboarding." items={filteredProfessionals} title="Professional applications and verification">
          <div className="admin-professional-toolbar">
            <label>
              <span>Search applications</span>
              <input placeholder="Name, trade, city, or email" value={professionalSearch} onChange={(event) => setProfessionalSearch(event.target.value)} />
            </label>
            <label>
              <span>Status</span>
              <select value={professionalFilter} onChange={(event) => setProfessionalFilter(event.target.value)}>
                <option value="all">All applications</option>
                <option value="pending">Pending</option>
                <option value="incomplete">Onboarding incomplete</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
          </div>
          {filteredProfessionals.map((artisan) => {
            const isUpdating = updatingArtisanId === artisan.id
            const requirements = [
              ['Contact information', Boolean(artisan.email && artisan.phone)],
              ['Business name and trade', Boolean(artisan.businessName && artisan.primaryService !== 'No primary service')],
              ['Service location and coverage', Boolean(artisan.city && artisan.state && artisan.serviceArea)],
              ['Experience and professional bio', Boolean(artisan.yearsExperience && artisan.bio)],
              ['Starting price', artisan.startingPrice > 0],
              ['Government ID', artisan.governmentIdSubmitted],
              ['At least 3 work samples', artisan.portfolioCount >= 3],
              ['At least 2 customer references', artisan.referenceCount >= 2],
            ]
            const completedRequirements = requirements.filter(([, complete]) => complete).length

            return (
              <details className="admin-professional-card" key={artisan.id}>
                <summary>
                  <div>
                    <h3>{artisan.businessName || artisan.fullName}</h3>
                    <p>{artisan.primaryService} • {artisan.city || 'City pending'}, {artisan.state || 'State pending'}</p>
                    <small>{artisan.email || 'Email pending'} • Applied {formatDate(artisan.createdAt)}</small>
                  </div>
                  <div className="admin-professional-summary-status">
                    <StatusPill tone={artisan.verificationStatus}>
                      {artisan.verificationStatus === 'incomplete' ? 'onboarding incomplete' : artisan.verificationStatus}
                    </StatusPill>
                    <strong>{completedRequirements}/{requirements.length} requirements</strong>
                  </div>
                </summary>
                <div className="admin-professional-detail-grid">
                  <section>
                    <p className="section-kicker">Application details</p>
                    <dl className="admin-application-details">
                      <div><dt>Applicant</dt><dd>{artisan.fullName}</dd></div>
                      <div><dt>Phone</dt><dd>{artisan.phone || 'Not provided'}</dd></div>
                      <div><dt>Service area</dt><dd>{artisan.serviceArea || 'Not provided'}</dd></div>
                      <div><dt>Experience</dt><dd>{artisan.yearsExperience ? `${artisan.yearsExperience} years` : 'Not provided'}</dd></div>
                      <div><dt>Starting price</dt><dd>{artisan.startingPrice ? formatMoney(artisan.startingPrice) : 'Not provided'}</dd></div>
                      <div><dt>Previous admin note</dt><dd>{artisan.verificationNotes || 'No note yet'}</dd></div>
                    </dl>
                    <p className="admin-professional-bio">{artisan.bio || 'No professional bio provided yet.'}</p>
                  </section>
                  <section>
                    <p className="section-kicker">Verification requirements</p>
                    <div className="admin-requirement-list">
                      {requirements.map(([label, complete]) => (
                        <span className={complete ? 'complete' : 'missing'} key={label}>
                          <b>{complete ? '✓' : '!'}</b>{label}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>
                <div className="admin-decision-panel">
                  <label>
                    <span>Internal review note</span>
                    <textarea placeholder="Record what was checked or explain what is still required." value={professionalNotes[artisan.id] || ''} onChange={(event) => updateProfessionalNote(artisan.id, event.target.value)} />
                  </label>
                  {artisan.isSignupOnly ? (
                    <small>This professional has created an account but has not completed the professional onboarding form yet.</small>
                  ) : (
                    <>
                      <div className="admin-row-actions">
                        <button disabled={isUpdating} type="button" onClick={() => handleVerificationUpdate(artisan, 'verified')}>
                          {isUpdating ? 'Saving...' : 'Approve'}
                        </button>
                        <button disabled={isUpdating} type="button" onClick={() => handleVerificationUpdate(artisan, 'pending')}>Request updates</button>
                        <button disabled={isUpdating} type="button" onClick={() => handleVerificationUpdate(artisan, 'rejected')}>Reject</button>
                        <button className="danger-action" disabled={isUpdating} type="button" onClick={() => handleVerificationUpdate(artisan, 'suspended')}>Suspend</button>
                      </div>
                      {completedRequirements < requirements.length && <small>Some requirements are still missing. Confirm any checks completed outside the app in the internal note before approving.</small>}
                    </>
                  )}
                </div>
              </details>
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
