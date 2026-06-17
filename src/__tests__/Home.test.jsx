import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import AuthProvider from '../auth/AuthProvider.jsx'

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

describe('Home Page', () => {
  it('renders without crashing when not authenticated', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <div>Home Page Test</div>
        </AuthProvider>
      </BrowserRouter>
    )
    expect(screen.getByText('Home Page Test')).toBeInTheDocument()
  })
})
