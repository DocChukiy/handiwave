import { getSupabaseClient } from '../lib/supabaseClient.js'

const reviewCustomerRelation = 'reviews_customer_id_fkey'

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatDate(value) {
  if (!value) {
    return 'Recently'
  }

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function mapReviewRow(review) {
  const customerName = review.customer?.full_name || review.customer?.email || 'Customer'
  const rating = Number(review.rating) || 0

  return {
    bookingId: review.booking_id,
    comment: review.review_text || 'No written comment added.',
    customerId: review.customer_id,
    date: formatDate(review.created_at),
    id: review.id,
    initials: getInitials(customerName),
    name: customerName,
    rating,
    stars: '★'.repeat(rating).padEnd(5, '☆'),
  }
}

export async function getReviewsForArtisan(artisanId, limit = 6) {
  if (!artisanId) {
    return {
      data: [],
      error: null,
    }
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id,
      booking_id,
      customer_id,
      rating,
      review_text,
      created_at,
      customer:profiles!${reviewCustomerRelation}(id, full_name, email, avatar_url)
    `)
    .eq('artisan_id', artisanId)
    .eq('is_verified', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  return {
    data: (data || []).map(mapReviewRow),
    error,
  }
}

export async function submitBookingReview({
  artisanId,
  bookingId,
  customerId,
  rating,
  reviewText,
}) {
  const supabase = getSupabaseClient()
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, artisan_id, customer_id, status')
    .eq('id', bookingId)
    .maybeSingle()

  if (bookingError) {
    return {
      data: null,
      error: bookingError,
    }
  }

  if (!booking) {
    return {
      data: null,
      error: new Error('Booking not found.'),
    }
  }

  if (
    booking.customer_id !== customerId ||
    booking.artisan_id !== artisanId ||
    booking.status !== 'customer_confirmed'
  ) {
    return {
      data: null,
      error: new Error('You can review this job only after confirming completion.'),
    }
  }

  const { data: existingReview, error: existingReviewError } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle()

  if (existingReviewError) {
    return {
      data: null,
      error: existingReviewError,
    }
  }

  if (existingReview) {
    return {
      data: null,
      error: new Error('You have already reviewed this booking.'),
    }
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      artisan_id: artisanId,
      booking_id: bookingId,
      customer_id: customerId,
      rating: Number(rating),
      review_text: reviewText.trim() || null,
    })
    .select(`
      id,
      booking_id,
      customer_id,
      rating,
      review_text,
      created_at,
      customer:profiles!${reviewCustomerRelation}(id, full_name, email, avatar_url)
    `)
    .single()

  return {
    data: data ? mapReviewRow(data) : null,
    error,
  }
}
