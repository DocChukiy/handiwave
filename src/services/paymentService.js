import { getSupabaseClient } from '../lib/supabaseClient.js'

function getFunctionError(error) {
  if (!error) {
    return null
  }

  return new Error(error.message || 'Payment request failed.')
}

export async function initializeBookingPayment(bookingId) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke('initialize-payment', {
    body: {
      booking_id: bookingId,
    },
  })

  return {
    data,
    error: getFunctionError(error),
  }
}

export async function verifyBookingPayment(reference) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke('verify-payment', {
    body: {
      reference,
    },
  })

  return {
    data,
    error: getFunctionError(error),
  }
}
