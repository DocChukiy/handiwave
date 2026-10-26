import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useAuth = vi.fn()

vi.mock('../auth/useAuth.js', () => ({
  useAuth: () => useAuth(),
}))

import MobileBottomNav from '../components/layout/MobileBottomNav.jsx'
import Navbar from '../components/layout/Navbar.jsx'

const navbarProps = {
  artisanNeedsSetup: false,
  isMobileMenuOpen: false,
  notifications: [],
  onCloseMobileMenu: vi.fn(),
  onLogout: vi.fn(),
  onNotificationClick: vi.fn(),
  onToggleMobileMenu: vi.fn(),
  onToggleTheme: vi.fn(),
  theme: 'light',
  unreadMessagesCount: 0,
  unreadNotificationsCount: 0,
}

describe('artisan navigation', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { email: 'pro@example.com', name: 'Musa Pro', role: 'artisan' },
    })
  })

  it('shows an artisan-focused desktop navigation without duplicate customer links', () => {
    render(
      <MemoryRouter>
        <Navbar {...navbarProps} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/artisan-dashboard')
    expect(screen.getByRole('link', { name: 'My Services' })).toHaveAttribute('href', '/artisan-services')
    expect(screen.getByRole('link', { name: 'Availability' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Showcase' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Earnings' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Messages' })).toHaveAttribute('aria-label', 'Messages')
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Professionals' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Services' })).not.toBeInTheDocument()
  })

  it('uses service and profile tools in the artisan mobile navigation', () => {
    render(
      <MemoryRouter>
        <MobileBottomNav />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /Services/ })).toHaveAttribute('href', '/artisan-services')
    expect(screen.getByRole('link', { name: /Profile/ })).toHaveAttribute('href', '/artisan-onboarding')
    expect(screen.queryByRole('link', { name: /Messages/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Wallet/ })).not.toBeInTheDocument()
  })
})
