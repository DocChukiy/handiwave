import { getSupabaseClient } from '../lib/supabaseClient.js'

const artisanProfileRelation = 'artisans_profile_id_fkey'
const artisanPrimaryServiceRelation = 'artisans_primary_service_id_fkey'
const bookingCustomerRelation = 'bookings_customer_id_fkey'
const bookingArtisanRelation = 'bookings_artisan_id_fkey'
const bookingServiceRelation = 'bookings_service_id_fkey'

function formatMoney(value, currency = 'NGN') {
  return `${currency} ${Number(value || 0).toLocaleString()}`
}

function getPersonName(profile, fallback = 'Handiwave user') {
  return profile?.full_name || profile?.email || fallback
}

function mapMetrics(metrics = {}) {
  return {
    activeBookings: metrics.active_bookings_total || 0,
    artisans: metrics.artisans_total || 0,
    commissionTotal: Number(metrics.commission_total) || 0,
    customers: metrics.customers_total || 0,
    disputes: metrics.open_disputes_total || metrics.disputed_bookings_total || 0,
    pendingVerifications: metrics.pending_artisan_verifications || 0,
    reels: metrics.published_reels_total || 0,
    reviews: metrics.reviews_total || 0,
    totalBookings: metrics.bookings_total || 0,
    totalUsers: metrics.users_total || 0,
    verifiedArtisans: metrics.verified_artisans_total || 0,
    walletEscrowBalance: Number(metrics.wallet_escrow_balance_total) || 0,
  }
}

function mapProfile(profile) {
  return {
    city: profile.city || '',
    createdAt: profile.created_at || '',
    email: profile.email || '',
    fullName: profile.full_name || 'Handiwave user',
    id: profile.id,
    isActive: profile.is_active,
    role: profile.role || 'customer',
    state: profile.state || '',
  }
}

function mapArtisan(artisan) {
  return {
    businessName: artisan.business_name || '',
    city: artisan.city || '',
    completedJobs: artisan.completed_jobs || 0,
    createdAt: artisan.created_at || '',
    fullName: getPersonName(artisan.profile, artisan.business_name || 'Handiwave artisan'),
    id: artisan.id,
    isAvailable: artisan.is_available,
    primaryService: artisan.primary_service?.name || 'No primary service',
    rating: Number(artisan.average_rating) || 0,
    reviewCount: artisan.review_count || 0,
    state: artisan.state || '',
    verificationStatus: artisan.verification_status || 'pending',
  }
}

function mapBooking(booking) {
  const artisanName = booking.artisan?.profile?.full_name || booking.artisan?.business_name || 'Artisan'

  return {
    artisan: artisanName,
    city: booking.city || '',
    createdAt: booking.created_at || '',
    customer: getPersonName(booking.customer, 'Customer'),
    estimatedPrice: Number(booking.estimated_price || booking.final_price || 0),
    id: booking.id,
    paymentStatus: booking.payment_status || 'unpaid',
    service: booking.service?.name || 'Service',
    state: booking.state || '',
    status: booking.status || 'pending',
  }
}

function mapDispute(dispute) {
  return {
    artisan: dispute.artisan?.profile?.full_name || dispute.artisan?.business_name || 'Artisan',
    createdAt: dispute.created_at || '',
    customer: getPersonName(dispute.customer, 'Customer'),
    id: dispute.id,
    reason: dispute.reason || 'No reason provided',
    requestedResolution: dispute.requested_resolution || '',
    status: dispute.status || 'open',
  }
}

function mapModerationCase(item) {
  return {
    caseType: item.case_type || 'other',
    createdAt: item.created_at || '',
    id: item.id,
    priority: item.priority || 'normal',
    reporter: getPersonName(item.reporter, 'Reporter'),
    status: item.status || 'open',
    title: item.title || 'Moderation case',
  }
}

function mapWithdrawal(withdrawal) {
  return {
    amount: Number(withdrawal.amount) || 0,
    amountLabel: formatMoney(withdrawal.amount, withdrawal.currency || 'NGN'),
    bankName: withdrawal.bank_name || 'Bank pending',
    createdAt: withdrawal.created_at || withdrawal.requested_at || '',
    id: withdrawal.id,
    status: withdrawal.status || 'pending',
  }
}

function mapCommission(entry) {
  return {
    artisanPayout: Number(entry.artisan_payout_amount) || 0,
    commission: Number(entry.commission_amount) || 0,
    createdAt: entry.created_at || '',
    gross: Number(entry.gross_amount) || 0,
    id: entry.id,
    status: entry.status || 'pending',
  }
}

function mapReel(reel) {
  return {
    artisan: reel.artisan?.profile?.full_name || reel.artisan?.business_name || 'Artisan',
    caption: reel.caption || 'No caption',
    createdAt: reel.created_at || '',
    id: reel.id,
    moderationStatus: reel.moderation_status || 'visible',
    service: reel.service?.name || 'Service',
    status: reel.status || 'draft',
  }
}

function mapReview(review) {
  return {
    artisan: review.artisan?.profile?.full_name || review.artisan?.business_name || 'Artisan',
    createdAt: review.created_at || '',
    customer: getPersonName(review.customer, 'Customer'),
    id: review.id,
    moderationStatus: review.moderation_status || 'visible',
    rating: review.rating || 0,
    text: review.review_text || 'No written review',
  }
}

function mapAuditLog(log) {
  return {
    action: log.action || 'admin_action',
    actor: getPersonName(log.actor, 'Admin'),
    createdAt: log.created_at || '',
    id: log.id,
    target: [log.target_table, log.target_id].filter(Boolean).join(' • ') || 'Platform',
  }
}

export async function getAdminDashboardData() {
  const supabase = getSupabaseClient()

  const [
    metricsResult,
    usersResult,
    artisansResult,
    bookingsResult,
    disputesResult,
    moderationResult,
    withdrawalsResult,
    commissionsResult,
    reelsResult,
    reviewsResult,
    auditResult,
  ] = await Promise.all([
    supabase.rpc('get_admin_dashboard_metrics'),
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(30),
    supabase
      .from('artisans')
      .select(`
        *,
        profile:profiles!${artisanProfileRelation}(id, full_name, email),
        primary_service:services!${artisanPrimaryServiceRelation}(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('bookings')
      .select(`
        *,
        customer:profiles!${bookingCustomerRelation}(id, full_name, email),
        artisan:artisans!${bookingArtisanRelation}(
          id,
          business_name,
          profile:profiles!${artisanProfileRelation}(id, full_name, email)
        ),
        service:services!${bookingServiceRelation}(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('booking_disputes')
      .select(`
        *,
        customer:profiles!booking_disputes_customer_id_fkey(id, full_name, email),
        artisan:artisans!booking_disputes_artisan_id_fkey(
          id,
          business_name,
          profile:profiles!${artisanProfileRelation}(id, full_name, email)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('moderation_cases')
      .select('*, reporter:profiles!moderation_cases_reporter_id_fkey(id, full_name, email)')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('wallet_withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('platform_commission_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('reels')
      .select(`
        *,
        artisan:artisans!reels_artisan_id_fkey(
          id,
          business_name,
          profile:profiles!${artisanProfileRelation}(id, full_name, email)
        ),
        service:services!reels_service_id_fkey(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('reviews')
      .select(`
        *,
        customer:profiles!reviews_customer_id_fkey(id, full_name, email),
        artisan:artisans!reviews_artisan_id_fkey(
          id,
          business_name,
          profile:profiles!${artisanProfileRelation}(id, full_name, email)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('admin_audit_logs')
      .select('*, actor:profiles!admin_audit_logs_actor_id_fkey(id, full_name, email)')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const error = [
    metricsResult.error,
    usersResult.error,
    artisansResult.error,
    bookingsResult.error,
    disputesResult.error,
    moderationResult.error,
    withdrawalsResult.error,
    commissionsResult.error,
    reelsResult.error,
    reviewsResult.error,
    auditResult.error,
  ].find(Boolean)

  return {
    data: {
      artisans: (artisansResult.data || []).map(mapArtisan),
      auditLogs: (auditResult.data || []).map(mapAuditLog),
      bookings: (bookingsResult.data || []).map(mapBooking),
      commissions: (commissionsResult.data || []).map(mapCommission),
      disputes: (disputesResult.data || []).map(mapDispute),
      metrics: mapMetrics(metricsResult.data),
      moderationCases: (moderationResult.data || []).map(mapModerationCase),
      reels: (reelsResult.data || []).map(mapReel),
      reviews: (reviewsResult.data || []).map(mapReview),
      users: (usersResult.data || []).map(mapProfile),
      withdrawals: (withdrawalsResult.data || []).map(mapWithdrawal),
    },
    error,
  }
}

export async function updateArtisanVerification({
  adminId,
  artisanId,
  notes = '',
  status,
}) {
  const supabase = getSupabaseClient()
  const timestamp = new Date().toISOString()
  const payload = {
    verification_notes: notes || null,
    verification_status: status,
  }

  if (status === 'verified') {
    payload.verified_at = timestamp
    payload.verified_by = adminId
    payload.rejected_at = null
    payload.suspended_at = null
  }

  if (status === 'rejected') {
    payload.rejected_at = timestamp
    payload.verified_at = null
  }

  if (status === 'suspended') {
    payload.suspended_at = timestamp
  }

  if (status === 'pending') {
    payload.rejected_at = null
    payload.suspended_at = null
    payload.verified_at = null
  }

  const { data, error } = await supabase
    .from('artisans')
    .update(payload)
    .eq('id', artisanId)
    .select('id, verification_status')
    .maybeSingle()

  if (!error) {
    await supabase.rpc('log_admin_action', {
      action_text: `artisan_${status}`,
      extra_metadata: { notes },
      new_record: data || payload,
      old_record: null,
      target_record_id: artisanId,
      target_table_name: 'artisans',
    })
  }

  return { data, error }
}
