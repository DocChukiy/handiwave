import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Login from '../pages/Login.jsx'

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
      signInWithPassword: vi.fn(),
    },
  },
  isSupabaseConfigured: () => true,
}))

// Mock the auth service
vi.mock('../services/authService.js', () => ({
  getArtisanByProfileId: vi.fn(),
}))

// Mock useAuth hook
vi.mock('../auth/useAuth.js', () => ({
  useAuth: () => ({
    user: null,
    authError: null,
    isLoading: false,
    login: vi.fn(),
  }),
}))

describe('Login Page', () => {
  it('renders login form', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )
    expect(screen.getByText(/log in to handiwave/i)).toBeInTheDocument()
  })

  it('displays role selection options', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )
    expect(screen.getByText('Customer')).toBeInTheDocument()
    expect(screen.getByText('Artisan')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })
})
