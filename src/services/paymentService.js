import { getSupabaseClient, supabaseConfig } from '../lib/supabaseClient.js'
import logger from '../utils/logger.js'

async function getFunctionError(error, data) {
  if (!error) {
    return null
  }

  let errorBody = data

  if (!errorBody && error.context && typeof error.context.json === 'function') {
    try {
      errorBody = await error.context.clone().json()
    } catch {
      try {
        const text = await error.context.clone().text()
        errorBody = text ? { error: text } : null
      } catch {
        errorBody = null
      }
    }
  }

  logger.error('[Handiwave payment function error]', {
    contextStatus: error.context?.status,
    data,
    errorBody,
    message: error.message,
    name: error.name,
  })

  const errorMessage = errorBody?.error || error.message || 'Payment request failed.'
  const debugCode = errorBody?.debugCode || error.context?.debugCode || ''
  const functionError = new Error(
    debugCode
      ? `${errorMessage} (${debugCode})`
      : errorMessage === 'Edge Function returned a non-2xx status code' && error.context?.status
      ? `${errorMessage} (${error.context.status})`
      : errorMessage,
  )

  functionError.code = debugCode
  functionError.debugCode = debugCode
  functionError.payload = errorBody

  return functionError
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
    error: await getFunctionError(error, data),
  }
}

export async function verifyBookingPayment(reference) {
  const supabase = getSupabaseClient()

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError) {
    return {
      data: null,
      error: sessionError,
    }
  }

  const accessToken = sessionData.session?.access_token

  if (!accessToken) {
    return {
      data: null,
      error: new Error('You must be logged in to verify this payment.'),
    }
  }

  const response = await fetch(`${supabaseConfig.url}/functions/v1/verify-payment`, {
    body: JSON.stringify({
      reference,
      trxref: reference,
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      apikey: supabaseConfig.anonKey,
    },
    method: 'POST',
  })

  const responseText = await response.text()
  let data

  try {
    data = responseText ? JSON.parse(responseText) : null
  } catch {
    data = responseText ? { error: responseText } : null
  }

  if (!response.ok) {
    const debugCode = data?.debugCode || ''
    const errorMessage = data?.error || data?.message || `Payment verification failed with status ${response.status}.`
    const error = new Error(debugCode ? `${errorMessage} (${debugCode})` : errorMessage)

    error.code = debugCode
    error.debugCode = debugCode
    error.payload = data

    logger.error('[Handiwave verify-payment direct error]', {
      data,
      debugCode,
      status: response.status,
      statusText: response.statusText,
    })

    return {
      data,
      error,
    }
  }

  return {
    data,
    error: null,
  }
}
