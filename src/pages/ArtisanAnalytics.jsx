import { BarChart3, CalendarDays, Eye, Star, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Button from '../components/Button.jsx'
import EmptyState from '../components/EmptyState.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import {
  formatAnalyticsMoney,
  getArtisanAnalytics,
  getDefaultAnalyticsRange,
} from '../services/analyticsService.js'

function formatDate(value) {
  if (!value) {
    return 'Unknown'
  }

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value))
}

function formatDateTime(value) {
  if (!value) {
    return 'Not published'
  }

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

function KpiCard({ icon: Icon, label, value, note }) {
  return (
    <article className="analytics-kpi-card">
      <span className="analytics-kpi-icon">
        <Icon size={18} />
      </span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        {note && <small>{note}</small>}
      </div>
    </article>
  )
}

function TrendTable({ rows }) {
  const maxBookings = Math.max(...rows.map((row) => Number(row.total_bookings || 0)), 1)

  if (rows.length === 0) {
    return (
      <EmptyState compact title="No booking trend yet">
        Bookings for the selected date range will appear here.
      </EmptyState>
    )
  }

  return (
    <div className="analytics-table-wrap">
      <table className="analytics-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Bookings</th>
            <th>Completed</th>
            <th>Gross value</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const total = Number(row.total_bookings || 0)
            const width = `${Math.max((total / maxBookings) * 100, total ? 8 : 0)}%`

            return (
              <tr key={row.day}>
                <td>{formatDate(row.day)}</td>
                <td>{total}</td>
                <td>{Number(row.completed_bookings || 0)}</td>
                <td>{formatAnalyticsMoney(row.gross_value)}</td>
                <td>
                  <span className="analytics-bar">
                    <span style={{ width }}></span>
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ServiceBreakdown({ rows }) {
  if (rows.length === 0) {
    return (
      <EmptyState compact title="No service data yet">
        Your service mix will appear once customers book you.
      </EmptyState>
    )
  }

  return (
    <div className="analytics-list">
      {rows.map((service) => (
        <article className="analytics-list-row" key={service.service_id || service.service_name}>
          <div>
            <strong>{service.service_name}</strong>
            <span>{Number(service.bookings_count || 0)} bookings</span>
          </div>
          <div>
            <strong>{formatAnalyticsMoney(service.gross_value)}</strong>
            <span>{Number(service.completed_count || 0)} completed</span>
          </div>
        </article>
      ))}
    </div>
  )
}

function ReelPerformance({ rows }) {
  if (rows.length === 0) {
    return (
      <EmptyState compact title="No reel analytics yet">
        Published work videos will show views, likes, and comments here.
      </EmptyState>
    )
  }

  return (
    <div className="analytics-list">
      {rows.slice(0, 8).map((reel) => (
        <article className="analytics-list-row" key={reel.reel_id}>
          <div>
            <strong>{reel.caption || 'Untitled reel'}</strong>
            <span>{reel.status} • {formatDateTime(reel.published_at || reel.created_at)}</span>
          </div>
          <div>
            <strong>{Number(reel.views_count || 0).toLocaleString()} views</strong>
            <span>
              {Number(reel.likes_count || 0)} likes • {Number(reel.comments_count || 0)} comments
            </span>
          </div>
        </article>
      ))}
    </div>
  )
}

function ReviewBreakdown({ rows }) {
  const maxReviews = Math.max(...rows.map((row) => Number(row.review_count || 0)), 1)

  if (rows.length === 0) {
    return (
      <EmptyState compact title="No reviews yet">
        Rating distribution will appear after customers review confirmed jobs.
      </EmptyState>
    )
  }

  return (
    <div className="review-breakdown">
      {rows.map((row) => {
        const count = Number(row.review_count || 0)
        const width = `${Math.max((count / maxReviews) * 100, count ? 8 : 0)}%`

        return (
          <div className="review-breakdown-row" key={row.rating}>
            <span>{row.rating} star</span>
            <span className="analytics-bar">
              <span style={{ width }}></span>
            </span>
            <strong>{count}</strong>
          </div>
        )
      })}
    </div>
  )
}

function ArtisanAnalytics() {
  const defaultRange = useMemo(() => getDefaultAnalyticsRange(), [])
  const [range, setRange] = useState(defaultRange)
  const [analytics, setAnalytics] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadAnalytics() {
      setError('')
      setIsLoading(true)

      try {
        const { data, error: analyticsError } = await getArtisanAnalytics(range)

        if (!isMounted) {
          return
        }

        if (analyticsError) {
          setError(analyticsError.message)
          setAnalytics(null)
          return
        }

        setAnalytics(data)
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message)
          setAnalytics(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadAnalytics()

    return () => {
      isMounted = false
    }
  }, [range])

  function updateRange(field, value) {
    setRange((currentRange) => ({
      ...currentRange,
      [field]: value,
    }))
  }

  const summary = analytics?.summary

  return (
    <div className="starter-page artisan-dashboard-page analytics-page">
      <section className="artisan-dashboard-hero analytics-hero">
        <div>
          <p className="section-kicker">Artisan analytics</p>
          <h1>Understand your bookings, earnings, reviews, and reels.</h1>
          <p>
            Track the signals that matter most: completed jobs, customer trust,
            service demand, wallet movement, and showcase performance.
          </p>
        </div>
        <div className="analytics-filter-card">
          <label>
            Start date
            <input
              max={range.endDate}
              type="date"
              value={range.startDate}
              onChange={(event) => updateRange('startDate', event.target.value)}
            />
          </label>
          <label>
            End date
            <input
              min={range.startDate}
              type="date"
              value={range.endDate}
              onChange={(event) => updateRange('endDate', event.target.value)}
            />
          </label>
          <Button className="secondary-cta" onClick={() => setRange(defaultRange)}>
            Last 30 days
          </Button>
        </div>
      </section>

      {error && <p className="auth-error page-error">{error}</p>}

      {isLoading ? (
        <SkeletonPreview count={6} label="Loading analytics" type="artisan" />
      ) : analytics && summary ? (
        <>
          <section className="analytics-kpi-grid">
            <KpiCard icon={CalendarDays} label="Total bookings" value={summary.totalBookings} />
            <KpiCard icon={CalendarDays} label="Bookings this period" value={summary.bookingsInRange} />
            <KpiCard icon={BarChart3} label="Completion rate" value={`${summary.completionRate}%`} />
            <KpiCard icon={Star} label="Average rating" value={summary.averageRating.toFixed(1)} note={`${summary.reviewCount} reviews`} />
            <KpiCard icon={Star} label="Review count" value={summary.reviewCount} note={`${summary.recentReviewsCount} this period`} />
            <KpiCard icon={Eye} label="Total reel views" value={summary.totalReelViews.toLocaleString()} note={`${summary.publishedReels} published reels`} />
            <KpiCard icon={WalletCards} label="Gross booking value" value={formatAnalyticsMoney(summary.grossBookingValue)} />
            <KpiCard icon={WalletCards} label="Released earnings" value={formatAnalyticsMoney(summary.releasedEarnings)} />
            <KpiCard icon={WalletCards} label="Wallet balance" value={formatAnalyticsMoney(summary.walletAvailableBalance)} note={`${formatAnalyticsMoney(summary.walletEscrowBalance)} in escrow`} />
          </section>

          <section className="analytics-layout">
            <article className="artisan-profile-panel analytics-panel wide">
              <div className="section-heading-row">
                <div>
                  <p className="section-kicker">Booking trend</p>
                  <h2>Daily booking activity</h2>
                </div>
                <span className="availability-status-note">
                  {formatDate(range.startDate)} - {formatDate(range.endDate)}
                </span>
              </div>
              <TrendTable rows={analytics.bookingTrend} />
            </article>

            <article className="artisan-profile-panel analytics-panel">
              <p className="section-kicker">Service breakdown</p>
              <h2>What customers book most</h2>
              <ServiceBreakdown rows={analytics.serviceBreakdown} />
            </article>

            <article className="artisan-profile-panel analytics-panel">
              <p className="section-kicker">Reel performance</p>
              <h2>Work showcase signals</h2>
              <ReelPerformance rows={analytics.reels} />
            </article>

            <article className="artisan-profile-panel analytics-panel">
              <p className="section-kicker">Review breakdown</p>
              <h2>Rating distribution</h2>
              <ReviewBreakdown rows={analytics.reviewBreakdown} />
            </article>
          </section>
        </>
      ) : (
        <EmptyState title="Analytics unavailable">
          We could not load your artisan analytics yet. Check your artisan profile and try again.
        </EmptyState>
      )}
    </div>
  )
}

export default ArtisanAnalytics
