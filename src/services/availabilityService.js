import { getSupabaseClient } from '../lib/supabaseClient.js'
import { getArtisanByProfileId } from './artisanService.js'

export const dayOptions = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
]

export function getDayLabel(dayOfWeek) {
  return dayOptions.find((day) => day.value === Number(dayOfWeek))?.label || 'Day'
}

function mapAvailabilitySlot(slot) {
  return {
    artisanId: slot.artisan_id,
    dayLabel: getDayLabel(slot.day_of_week),
    dayOfWeek: slot.day_of_week,
    endTime: slot.end_time ? slot.end_time.slice(0, 5) : '',
    id: slot.id,
    isActive: slot.is_active,
    startTime: slot.start_time ? slot.start_time.slice(0, 5) : '',
  }
}

function mapUnavailableDate(date) {
  return {
    artisanId: date.artisan_id,
    id: date.id,
    reason: date.reason || '',
    unavailableDate: date.unavailable_date,
  }
}

export async function getAvailabilityForArtisanId(artisanId) {
  if (!artisanId) {
    return {
      data: {
        slots: [],
        unavailableDates: [],
      },
      error: null,
    }
  }

  const supabase = getSupabaseClient()
  const [slotsResult, datesResult] = await Promise.all([
    supabase
      .from('artisan_availability')
      .select('id, artisan_id, day_of_week, start_time, end_time, is_active')
      .eq('artisan_id', artisanId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true }),
    supabase
      .from('artisan_unavailable_dates')
      .select('id, artisan_id, unavailable_date, reason')
      .eq('artisan_id', artisanId)
      .order('unavailable_date', { ascending: true }),
  ])

  return {
    data: {
      slots: (slotsResult.data || []).map(mapAvailabilitySlot),
      unavailableDates: (datesResult.data || []).map(mapUnavailableDate),
    },
    error: slotsResult.error || datesResult.error,
  }
}

export async function getCustomerBookingAvailability(artisanId) {
  if (!artisanId) {
    return {
      data: {
        bookedSlots: [],
        slots: [],
        unavailableDates: [],
      },
      error: null,
    }
  }

  const supabase = getSupabaseClient()
  const [availabilityResult, datesResult, bookingsResult] = await Promise.all([
    supabase
      .from('artisan_availability')
      .select('id, artisan_id, day_of_week, start_time, end_time, is_active')
      .eq('artisan_id', artisanId)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true }),
    supabase
      .from('artisan_unavailable_dates')
      .select('id, artisan_id, unavailable_date, reason')
      .eq('artisan_id', artisanId)
      .order('unavailable_date', { ascending: true }),
    supabase
      .from('bookings')
      .select('id, scheduled_date, scheduled_time, status')
      .eq('artisan_id', artisanId)
      .in('status', ['pending', 'reschedule_requested', 'confirmed', 'in_progress', 'artisan_completed'])
      .not('scheduled_date', 'is', null)
      .not('scheduled_time', 'is', null),
  ])

  return {
    data: {
      bookedSlots: (bookingsResult.data || []).map((booking) => ({
        bookingId: booking.id,
        date: booking.scheduled_date,
        time: booking.scheduled_time ? booking.scheduled_time.slice(0, 5) : '',
      })),
      slots: (availabilityResult.data || []).map(mapAvailabilitySlot),
      unavailableDates: (datesResult.data || []).map(mapUnavailableDate),
    },
    error: availabilityResult.error || datesResult.error || bookingsResult.error,
  }
}

export async function getAvailabilityForArtisanProfile(profileId) {
  const { data: artisan, error: artisanError } = await getArtisanByProfileId(profileId)

  if (artisanError) {
    return {
      data: null,
      error: artisanError,
    }
  }

  if (!artisan) {
    return {
      data: null,
      error: new Error('Create your artisan profile before managing availability.'),
    }
  }

  const { data, error } = await getAvailabilityForArtisanId(artisan.id)

  return {
    data: {
      artisan,
      ...data,
    },
    error,
  }
}

export async function addAvailabilitySlot({
  artisanId,
  dayOfWeek,
  endTime,
  startTime,
}) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('artisan_availability')
    .insert({
      artisan_id: artisanId,
      day_of_week: Number(dayOfWeek),
      end_time: endTime,
      start_time: startTime,
    })
    .select('id, artisan_id, day_of_week, start_time, end_time, is_active')
    .single()

  return {
    data: data ? mapAvailabilitySlot(data) : null,
    error,
  }
}

export async function updateAvailabilitySlotStatus({
  isActive,
  slotId,
}) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('artisan_availability')
    .update({
      is_active: isActive,
    })
    .eq('id', slotId)
    .select('id, artisan_id, day_of_week, start_time, end_time, is_active')
    .maybeSingle()

  return {
    data: data ? mapAvailabilitySlot(data) : null,
    error,
  }
}

export async function deleteAvailabilitySlot(slotId) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('artisan_availability')
    .delete()
    .eq('id', slotId)

  return {
    error,
  }
}

export async function addUnavailableDate({
  artisanId,
  reason,
  unavailableDate,
}) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('artisan_unavailable_dates')
    .insert({
      artisan_id: artisanId,
      reason: reason.trim() || null,
      unavailable_date: unavailableDate,
    })
    .select('id, artisan_id, unavailable_date, reason')
    .single()

  return {
    data: data ? mapUnavailableDate(data) : null,
    error,
  }
}

export async function deleteUnavailableDate(dateId) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('artisan_unavailable_dates')
    .delete()
    .eq('id', dateId)

  return {
    error,
  }
}
