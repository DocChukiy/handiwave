import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import AuthProvider from '../auth/AuthProvider.jsx'
import Bookings from '../pages/Bookings.jsx'

// Mock the logger
vi.mock('../utils/logger.js', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock the Supabase client
vi.mock('../lib/supabaseClient.js', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ 
        data: { subscription: { unsubscribe: vi.fn() } } 
      })),
    },
  },
  isSupabaseConfigured: () => true,
}))

// Mock the booking service
vi.mock('../services/bookingService.js', () => ({
  getCustomerBookings: vi.fn(() => Promise.resolve([])),
  getArtisanBookings: vi.fn(() => Promise.resolve([])),
  updateBookingStatus: vi.fn(),
}))

describe('Bookings Page', () => {
  it('renders without crashing', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Bookings />
        </AuthProvider>
      </BrowserRouter>
    )
    // The component should render
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})
