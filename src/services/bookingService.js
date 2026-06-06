import { getSupabaseClient } from '../lib/supabaseClient.js'
import { getArtisanByProfileId } from './artisanService.js'

const bookingServiceRelation = 'bookings_service_id_fkey'
const bookingArtisanRelation = 'bookings_artisan_id_fkey'
const bookingCustomerRelation = 'bookings_customer_id_fkey'
const artisanProfileRelation = 'artisans_profile_id_fkey'

const bookingSelect = `
  *,
  service:services!${bookingServiceRelation}(id, name, category, icon),
  artisan:artisans!${bookingArtisanRelation}(
    id,
    business_name,
    profile_id,
    city,
    state,
    verification_status,
    profile:profiles!${artisanProfileRelation}(id, full_name, email, avatar_url)
  ),
  customer:profiles!${bookingCustomerRelation}(id, full_name, email)
`

const allowedArtisanTransitions = {
  confirmed: ['in_progress'],
  in_progress: ['completed'],
  pending: ['confirmed', 'cancelled'],
}

function formatDateTime(date, time) {
  const dateLabel = date || 'Date pending'
  const timeLabel = time ? time.slice(0, 5) : 'Time pending'

  return `${dateLabel} • ${timeLabel}`
}

export function mapBookingRow(booking) {
  const artisanName =
    booking.artisan?.profile?.full_name ||
    booking.artisan?.business_name ||
    'Handiwave artisan'
  const customerName = booking.customer?.full_name || booking.customer?.email || 'Customer'
  const status = booking.status || 'pending'

  return {
    address: booking.location_address,
    artisan: artisanName,
    artisanId: booking.artisan_id,
    city: booking.city,
    customer: customerName,
    customerId: booking.customer_id,
    date: formatDateTime(booking.scheduled_date, booking.scheduled_time),
    estimatedPrice: booking.estimated_price,
    id: booking.id,
    notes: booking.notes || '',
    paymentStatus: booking.payment_status || 'unpaid',
    rawStatus: status,
    scheduledDate: booking.scheduled_date || 'Date pending',
    scheduledTime: booking.scheduled_time ? booking.scheduled_time.slice(0, 5) : 'Time pending',
    service: booking.service?.name || 'Handiwave service',
    serviceId: booking.service_id,
    state: booking.state,
    status: status.replaceAll('_', ' '),
  }
}

export async function updateBookingStatusForArtisan({
  artisanProfileId,
  bookingId,
  currentStatus,
  nextStatus,
}) {
  if (!allowedArtisanTransitions[currentStatus]?.includes(nextStatus)) {
    return {
      data: null,
      error: new Error(`Cannot change booking from ${currentStatus} to ${nextStatus}.`),
    }
  }

  const { data: artisanProfile, error: artisanError } =
    await getArtisanByProfileId(artisanProfileId)

  if (artisanError) {
    return {
      data: null,
      error: artisanError,
    }
  }

  if (!artisanProfile) {
    return {
      data: null,
      error: new Error('Create your artisan profile before managing bookings.'),
    }
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: nextStatus })
    .eq('id', bookingId)
    .eq('artisan_id', artisanProfile.id)
    .eq('status', currentStatus)
    .select('id, status')
    .single()

  return {
    data,
    error,
  }
}

export async function getBookingOptions() {
  const supabase = getSupabaseClient()
  const [servicesResult, artisansResult] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, category, base_price')
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabase
      .from('artisans')
      .select(`
        id,
        business_name,
        profile_id,
        city,
        state,
        primary_service_id,
        starting_price,
        verification_status,
        profile:profiles!${artisanProfileRelation}(id, full_name),
        primary_service:services!artisans_primary_service_id_fkey(id, name, category)
      `)
      .eq('verification_status', 'verified')
      .eq('is_available', true)
      .order('average_rating', { ascending: false }),
  ])

  return {
    data: {
      artisans: artisansResult.data || [],
      services: servicesResult.data || [],
    },
    error: servicesResult.error || artisansResult.error,
  }
}

export async function getBookingsForUser(user) {
  if (!user) {
    return {
      data: [],
      error: new Error('You must be logged in to view bookings.'),
    }
  }

  const supabase = getSupabaseClient()

  if (user.role === 'artisan') {
    const { data: artisanProfile, error: artisanError } = await getArtisanByProfileId(user.id)

    if (artisanError) {
      return {
        data: [],
        error: artisanError,
      }
    }

    if (!artisanProfile) {
      return {
        data: [],
        error: null,
      }
    }

    const { data, error } = await supabase
      .from('bookings')
      .select(bookingSelect)
      .eq('artisan_id', artisanProfile.id)
      .order('created_at', { ascending: false })

    return {
      data: (data || []).map(mapBookingRow),
      error,
    }
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(bookingSelect)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  return {
    data: (data || []).map(mapBookingRow),
    error,
  }
}

async function getBookingById(bookingId) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('bookings')
    .select(bookingSelect)
    .eq('id', bookingId)
    .single()

  return {
    data: data ? mapBookingRow(data) : null,
    error,
  }
}

export async function createBooking({
  address,
  artisanId,
  city,
  customerId,
  notes,
  scheduledDate,
  scheduledTime,
  serviceId,
  state,
  userRole,
}) {
  if (userRole !== 'customer') {
    return {
      data: null,
      error: new Error('Only customer accounts can create bookings.'),
    }
  }

  const supabase = getSupabaseClient()
  const { data: artisan, error: artisanError } = await supabase
    .from('artisans')
    .select('id, profile_id, primary_service_id, verification_status')
    .eq('id', artisanId)
    .maybeSingle()

  if (artisanError) {
    return {
      data: null,
      error: artisanError,
    }
  }

  if (!artisan) {
    return {
      data: null,
      error: new Error('Selected artisan was not found.'),
    }
  }

  if (artisan.profile_id === customerId) {
    return {
      data: null,
      error: new Error('You cannot book your own artisan profile.'),
    }
  }

  const resolvedServiceId = serviceId || artisan.primary_service_id
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('id, name')
    .eq('id', resolvedServiceId)
    .maybeSingle()

  if (serviceError) {
    console.error('[Handiwave booking debug] service lookup error:', serviceError)
    return {
      data: null,
      error: serviceError,
    }
  }

  if (!service) {
    return {
      data: null,
      error: new Error('Selected service was not found.'),
    }
  }

  const bookingPayload = {
    artisan_id: artisanId,
    city: city.trim(),
    customer_id: customerId,
    location_address: address.trim(),
    notes: notes.trim() || null,
    scheduled_date: scheduledDate,
    scheduled_time: scheduledTime,
    service_id: resolvedServiceId,
    state: state.trim(),
  }

  console.log('[Handiwave booking debug] booking payload before insert:', bookingPayload)

  const { data: insertedBooking, error: insertError } = await supabase
    .from('bookings')
    .insert(bookingPayload)
    .select('*')
    .single()

  console.log('[Handiwave booking debug] inserted booking returned from Supabase:', {
    booking: insertedBooking,
    error: insertError,
  })

  if (insertError) {
    console.error('[Handiwave booking debug] booking insert failed:', insertError)
    return {
      data: null,
      error: insertError,
    }
  }

  if (!insertedBooking) {
    return {
      data: null,
      error: new Error('Supabase did not return an inserted booking row.'),
    }
  }

  const { data: displayBooking, error: displayError } = await getBookingById(insertedBooking.id)

  if (displayError) {
    console.error('[Handiwave booking debug] booking display fetch failed:', displayError)
  }

  return {
    data: displayBooking || mapBookingRow({
      ...insertedBooking,
      artisan: null,
      customer: null,
      service,
    }),
    error: null,
  }
}
