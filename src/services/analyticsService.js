import { getSupabaseClient } from '../lib/supabaseClient.js'

function toNumber(value) {
  return Number(value || 0)
}

export function formatAnalyticsMoney(value) {
  return `NGN ${toNumber(value).toLocaleString()}`
}

export function getDefaultAnalyticsRange() {
  const end = new Date()
  const start = new Date()

  start.setDate(end.getDate() - 30)

  return {
    endDate: end.toISOString().slice(0, 10),
    startDate: start.toISOString().slice(0, 10),
  }
}

export function mapAnalyticsSummary(summary = {}) {
  return {
    averageRating: toNumber(summary.average_rating),
    bookingsInRange: toNumber(summary.bookings_in_range),
    cancelledBookings: toNumber(summary.cancelled_bookings),
    commissionTotal: toNumber(summary.commission_total),
    completedBookings: toNumber(summary.completed_bookings),
    completionRate: toNumber(summary.completion_rate),
    disputedBookings: toNumber(summary.disputed_bookings),
    escrowHeldValue: toNumber(summary.escrow_held_value),
    grossBookingValue: toNumber(summary.gross_booking_value),
    pendingBookings: toNumber(summary.pending_bookings),
    publishedReels: toNumber(summary.published_reels),
    recentReviewsCount: toNumber(summary.recent_reviews_count),
    releasedEarnings: toNumber(summary.released_earnings),
    reviewCount: toNumber(summary.review_count),
    totalBookings: toNumber(summary.total_bookings),
    totalReelComments: toNumber(summary.total_reel_comments),
    totalReelLikes: toNumber(summary.total_reel_likes),
    totalReelViews: toNumber(summary.total_reel_views),
    walletAvailableBalance: toNumber(summary.wallet_available_balance),
    walletEscrowBalance: toNumber(summary.wallet_escrow_balance),
  }
}

export async function getArtisanAnalytics(range) {
  const supabase = getSupabaseClient()
  const params = {
    range_end: range.endDate,
    range_start: range.startDate,
  }

  const [
    summaryResult,
    bookingResult,
    serviceResult,
    reelResult,
    reviewResult,
  ] = await Promise.all([
    supabase.rpc('get_artisan_analytics_summary', params),
    supabase.rpc('get_artisan_booking_analytics', params),
    supabase.rpc('get_artisan_service_breakdown', params),
    supabase.rpc('get_artisan_reel_analytics', params),
    supabase.rpc('get_artisan_review_breakdown', params),
  ])

  const error = summaryResult.error ||
    bookingResult.error ||
    serviceResult.error ||
    reelResult.error ||
    reviewResult.error

  if (error) {
    return {
      data: null,
      error,
    }
  }

  return {
    data: {
      bookingTrend: bookingResult.data || [],
      reels: reelResult.data || [],
      reviewBreakdown: reviewResult.data || [],
      serviceBreakdown: serviceResult.data || [],
      summary: mapAnalyticsSummary(summaryResult.data || {}),
    },
    error: null,
  }
}
