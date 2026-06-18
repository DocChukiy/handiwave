import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

import { MemoryRouter } from 'react-router-dom'
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
const mockLogin = vi.fn()
vi.mock('../auth/useAuth.js', () => ({
  useAuth: () => ({
    user: null,
    authError: null,
    isLoading: false,
    login: mockLogin,
  }),
}))

describe('Login Page', () => {
  beforeEach(() => {
    mockLogin.mockReset()
  })

  it('renders login form', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    expect(screen.getByText(/log in to handiwave/i)).toBeInTheDocument()
  })

  it('displays role selection options', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    expect(screen.getByText('Customer')).toBeInTheDocument()
    expect(screen.getByText('Artisan')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('preserves the full callback URL when redirecting after login', async () => {
    mockLogin.mockResolvedValue({ role: 'customer' })

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login',
            state: {
              from: {
                pathname: '/payment/callback',
                search: '?reference=abc123',
              },
            },
          },
        ]}
      >
        <Login />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: 'user@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: 'password123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({
        pathname: '/payment/callback',
        search: '?reference=abc123',
      })
    })
  })
})
