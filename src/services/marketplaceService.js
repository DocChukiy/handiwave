import { getSupabaseClient } from '../lib/supabaseClient.js'
import { getArtisanByProfileId } from './artisanService.js'
import { createNotificationSafely } from './notificationService.js'

const requestSelect = `
  *,
  service:services!service_requests_service_id_fkey(id, name, slug, category, icon),
  bids:service_request_bids(
    *,
    artisan:artisans!service_request_bids_artisan_id_fkey(
      id,
      business_name,
      average_rating,
      completed_jobs,
      review_count,
      verification_status,
      profile_id,
      profile:profiles!artisans_profile_id_fkey(id, full_name, avatar_url)
    )
  )
`

function toNumber(value) {
  return value === null || value === undefined ? null : Number(value)
}

function mapBid(bid) {
  const artisan = bid.artisan || {}
  return {
    artisanId: bid.artisan_id,
    artisanName: artisan.profile?.full_name || artisan.business_name || 'Handiwave professional',
    availableDate: bid.available_date || '',
    availableTime: bid.available_time?.slice(0, 5) || '',
    completedJobs: artisan.completed_jobs || 0,
    createdAt: bid.created_at,
    durationEstimate: bid.duration_estimate || '',
    guaranteeText: bid.guarantee_text || '',
    id: bid.id,
    inspectionFee: toNumber(bid.inspection_fee),
    laborAmount: toNumber(bid.labor_amount),
    materialsEstimate: toNumber(bid.materials_estimate),
    maximumTotal: toNumber(bid.maximum_total),
    message: bid.message,
    minimumTotal: toNumber(bid.minimum_total),
    pricingType: bid.pricing_type,
    rating: Number(artisan.average_rating) || 0,
    reviewCount: artisan.review_count || 0,
    status: bid.status,
    verified: artisan.verification_status === 'verified',
  }
}

function mapRequest(request) {
  return {
    acceptedBidId: request.accepted_bid_id || '',
    bids: (request.bids || []).map(mapBid),
    bookingId: request.booking_id || '',
    city: request.city,
    createdAt: request.created_at,
    diagnosisAnswers: request.diagnosis_answers || {},
    expiresAt: request.expires_at,
    id: request.id,
    issueDetails: request.issue_details,
    issueTitle: request.issue_title,
    materialsPreference: request.materials_preference,
    preferredDate: request.preferred_date || '',
    preferredTime: request.preferred_time?.slice(0, 5) || '',
    service: request.service || {},
    state: request.state,
    status: request.status,
    urgency: request.urgency,
  }
}

export async function createServiceRequest(payload) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('create_service_request', {
    target_city: payload.city,
    target_diagnosis_answers: payload.diagnosisAnswers,
    target_issue_details: payload.issueDetails,
    target_issue_title: payload.issueTitle,
    target_location_address: payload.address,
    target_materials_preference: payload.materialsPreference,
    target_preferred_date: payload.preferredDate || null,
    target_preferred_time: payload.preferredTime || null,
    target_service_id: payload.serviceId,
    target_state: payload.state,
    target_urgency: payload.urgency,
  })

  return { data, error }
}

export async function getCustomerServiceRequests(customerId) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('service_requests')
    .select(requestSelect)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  return { data: (data || []).map(mapRequest), error }
}

export async function getProfessionalOpportunities(profileId) {
  const { data: artisan, error: artisanError } = await getArtisanByProfileId(profileId)
  if (artisanError || !artisan) {
    return { artisan, data: [], error: artisanError || new Error('Complete professional onboarding to view opportunities.') }
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('service_requests')
    .select(requestSelect)
    .eq('status', 'open')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return { artisan, data: (data || []).map(mapRequest), error }
}

export async function submitServiceRequestBid({ artisanId, bid, requestId }) {
  const supabase = getSupabaseClient()
  const payload = {
    artisan_id: artisanId,
    available_date: bid.availableDate || null,
    available_time: bid.availableTime || null,
    duration_estimate: bid.durationEstimate.trim() || null,
    guarantee_text: bid.guaranteeText.trim() || null,
    inspection_fee: bid.pricingType === 'inspection' ? Number(bid.inspectionFee || 0) : null,
    labor_amount: bid.pricingType === 'fixed' ? Number(bid.laborAmount || 0) : null,
    materials_estimate: bid.pricingType === 'fixed' ? Number(bid.materialsEstimate || 0) : null,
    maximum_total: bid.pricingType === 'range' ? Number(bid.maximumTotal || 0) : null,
    message: bid.message.trim(),
    minimum_total: bid.pricingType === 'range' ? Number(bid.minimumTotal || 0) : null,
    pricing_type: bid.pricingType,
    request_id: requestId,
    status: 'submitted',
  }

  const { data: existing } = await supabase
    .from('service_request_bids')
    .select('id, status')
    .eq('request_id', requestId)
    .eq('artisan_id', artisanId)
    .maybeSingle()

  const query = existing?.id
    ? supabase.from('service_request_bids').update(payload).eq('id', existing.id)
    : supabase.from('service_request_bids').insert(payload)
  const { data, error } = await query.select('*').single()

  return { data: data ? mapBid(data) : null, error }
}

export async function acceptServiceRequestBid({ bid, requestId }) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('accept_service_request_bid', {
    target_bid_id: bid.id,
    target_request_id: requestId,
  })

  if (!error && data?.id) {
    const { data: artisan } = await supabase
      .from('artisans')
      .select('profile_id')
      .eq('id', bid.artisanId)
      .maybeSingle()
    await createNotificationSafely({
      body: 'A customer selected your offer. Open Jobs or Messages to continue.',
      data: { booking_id: data.id, request_id: requestId },
      profileId: artisan?.profile_id,
      title: 'Offer accepted',
      type: 'booking',
    })
  }

  return { data, error }
}
