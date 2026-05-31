import { bookings } from '../data/bookings.js'

export async function getBookings() {
  return {
    data: bookings,
    error: null,
  }
}

export async function createBooking(booking) {
  return {
    data: {
      id: crypto.randomUUID(),
      status: 'Pending',
      ...booking,
    },
    error: null,
  }
}

export async function updateBookingStatus(id, status) {
  return {
    data: { id, status },
    error: null,
  }
}
