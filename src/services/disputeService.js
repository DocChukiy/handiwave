import { getSupabaseClient } from '../lib/supabaseClient.js'

const evidenceBucket = 'handiwave-dispute-evidence'
const disputeCustomerRelation = 'booking_disputes_customer_id_fkey'
const disputeArtisanRelation = 'booking_disputes_artisan_id_fkey'
const disputeBookingRelation = 'booking_disputes_booking_id_fkey'
const artisanProfileRelation = 'artisans_profile_id_fkey'
const bookingServiceRelation = 'bookings_service_id_fkey'

function getPersonName(profile, fallback = 'Handiwave user') {
  return profile?.full_name || profile?.email || fallback
}

function getFileName(file) {
  return `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
}

function mapDispute(dispute) {
  return {
    adminId: dispute.assigned_admin_id || '',
    artisan: dispute.artisan?.profile?.full_name || dispute.artisan?.business_name || 'Artisan',
    artisanId: dispute.artisan_id,
    bookingId: dispute.booking_id,
    bookingStatus: dispute.booking?.status || '',
    createdAt: dispute.created_at || '',
    customer: getPersonName(dispute.customer, 'Customer'),
    customerId: dispute.customer_id,
    description: dispute.description || '',
    finalResolution: dispute.final_resolution || '',
    id: dispute.id,
    reason: dispute.reason || 'No reason provided',
    refundAmount: Number(dispute.refund_amount) || 0,
    requestedResolution: dispute.requested_resolution || '',
    resolvedAt: dispute.resolved_at || '',
    service: dispute.booking?.service?.name || 'Booking',
    status: dispute.status || 'open',
  }
}

function mapMessage(message) {
  return {
    body: message.body || '',
    createdAt: message.created_at || '',
    id: message.id,
    internalOnly: message.internal_only,
    sender: getPersonName(message.sender, 'User'),
    senderId: message.sender_id,
  }
}

async function mapEvidenceWithSignedUrls(evidenceRows) {
  const supabase = getSupabaseClient()

  return Promise.all((evidenceRows || []).map(async (item) => {
    let signedUrl = item.file_url || ''

    if (item.file_path) {
      const { data } = await supabase.storage
        .from(evidenceBucket)
        .createSignedUrl(item.file_path, 60 * 15)

      signedUrl = data?.signedUrl || signedUrl
    }

    return {
      createdAt: item.created_at || '',
      description: item.description || '',
      fileName: item.file_name || item.file_path?.split('/').pop() || 'Evidence file',
      filePath: item.file_path || '',
      fileType: item.file_type || '',
      id: item.id,
      internalOnly: item.internal_only,
      signedUrl,
      uploadedBy: item.uploader?.full_name || item.uploader?.email || 'Uploader',
      uploadedById: item.uploaded_by,
    }
  }))
}

export async function getDisputesForUser(user) {
  if (!user?.id) {
    return {
      data: [],
      error: new Error('You must be logged in to view disputes.'),
    }
  }

  const supabase = getSupabaseClient()
  let query = supabase
    .from('booking_disputes')
    .select(`
      *,
      customer:profiles!${disputeCustomerRelation}(id, full_name, email),
      artisan:artisans!${disputeArtisanRelation}(
        id,
        business_name,
        profile:profiles!${artisanProfileRelation}(id, full_name, email)
      ),
      booking:bookings!${disputeBookingRelation}(
        id,
        status,
        payment_status,
        service:services!${bookingServiceRelation}(id, name)
      )
    `)
    .order('created_at', { ascending: false })

  if (user.role === 'customer') {
    query = query.eq('customer_id', user.id)
  }

  if (user.role === 'artisan') {
    const { data: artisan, error: artisanError } = await supabase
      .from('artisans')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (artisanError) {
      return { data: [], error: artisanError }
    }

    if (!artisan?.id) {
      return { data: [], error: null }
    }

    query = query.eq('artisan_id', artisan.id)
  }

  const { data, error } = await query

  return {
    data: (data || []).map(mapDispute),
    error,
  }
}

export async function getDisputeDetails(disputeId) {
  const supabase = getSupabaseClient()
  const [messageResult, evidenceResult] = await Promise.all([
    supabase
      .from('booking_dispute_messages')
      .select('*, sender:profiles!booking_dispute_messages_sender_id_fkey(id, full_name, email)')
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: true }),
    supabase
      .from('booking_dispute_evidence')
      .select('*, uploader:profiles!booking_dispute_evidence_uploaded_by_fkey(id, full_name, email)')
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: false }),
  ])

  return {
    data: {
      evidence: await mapEvidenceWithSignedUrls(evidenceResult.data || []),
      messages: (messageResult.data || []).map(mapMessage),
    },
    error: messageResult.error || evidenceResult.error,
  }
}

export async function createDisputeFromBooking({
  bookingId,
  description,
  evidenceFile,
  reason,
  refundAmount,
  requestedResolution,
  userId,
}) {
  const supabase = getSupabaseClient()
  const { data: disputeId, error } = await supabase.rpc('create_booking_dispute', {
    description_text: description,
    reason_text: reason,
    requested_refund_amount: refundAmount ? Number(refundAmount) : null,
    requested_resolution_text: requestedResolution,
    target_booking_id: bookingId,
  })

  if (error || !disputeId) {
    return { data: disputeId, error: error || new Error('Supabase did not return a dispute id.') }
  }

  if (evidenceFile) {
    const evidenceResult = await uploadDisputeEvidence({
      description: 'Customer evidence',
      disputeId,
      file: evidenceFile,
      userId,
    })

    if (evidenceResult.error) {
      return { data: disputeId, error: evidenceResult.error }
    }
  }

  return { data: disputeId, error: null }
}

export async function sendDisputeMessage({
  body,
  disputeId,
  internalOnly = false,
  senderId,
}) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('booking_dispute_messages')
    .insert({
      body,
      dispute_id: disputeId,
      internal_only: internalOnly,
      sender_id: senderId,
    })
    .select('id')
    .maybeSingle()

  return { data, error }
}

export async function uploadDisputeEvidence({
  description = '',
  disputeId,
  file,
  internalOnly = false,
  userId,
}) {
  if (!file) {
    return { data: null, error: null }
  }

  const supabase = getSupabaseClient()
  const filePath = `${internalOnly ? 'internal' : 'disputes'}/${disputeId}/${userId}/${getFileName(file)}`
  const { error: uploadError } = await supabase.storage
    .from(evidenceBucket)
    .upload(filePath, file, { upsert: false })

  if (uploadError) {
    return { data: null, error: uploadError }
  }

  const { data, error } = await supabase
    .from('booking_dispute_evidence')
    .insert({
      description,
      dispute_id: disputeId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
      internal_only: internalOnly,
      uploaded_by: userId,
    })
    .select('id')
    .maybeSingle()

  return { data, error }
}

export async function assignDispute(disputeId) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('assign_booking_dispute', {
    target_dispute_id: disputeId,
  })

  return { data, error }
}

export async function refundDisputeCustomer({ disputeId, refundAmount, resolution }) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('refund_dispute_customer', {
    refund_amount: refundAmount ? Number(refundAmount) : null,
    resolution_text: resolution,
    target_dispute_id: disputeId,
  })

  return { data, error }
}

export async function releaseDisputeEscrow({ disputeId, resolution }) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('release_dispute_escrow', {
    resolution_text: resolution,
    target_dispute_id: disputeId,
  })

  return { data, error }
}

export async function rejectDispute({ disputeId, resolution }) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('reject_booking_dispute', {
    resolution_text: resolution,
    target_dispute_id: disputeId,
  })

  return { data, error }
}
