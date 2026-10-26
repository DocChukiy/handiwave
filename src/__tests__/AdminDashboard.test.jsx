import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAdminDashboardData = vi.fn()

vi.mock('../auth/useAuth.js', () => ({
  useAuth: () => ({
    user: {
      email: 'admin@handiwave.com',
      id: 'admin-profile-id',
      name: 'Handiwave Admin',
      role: 'admin',
    },
  }),
}))

vi.mock('../services/adminService.js', () => ({
  approveWalletWithdrawal: vi.fn(),
  getAdminDashboardData: (...args) => getAdminDashboardData(...args),
  rejectWalletWithdrawal: vi.fn(),
  updateArtisanVerification: vi.fn(),
}))

import AdminDashboard from '../pages/AdminDashboard.jsx'

const dashboardData = {
  artisans: [
    {
      bio: 'Experienced electrical installer.',
      businessName: 'Musa Electrical Services',
      city: 'Kaduna',
      completedJobs: 0,
      createdAt: '2026-10-24T10:00:00.000Z',
      email: 'musa@example.com',
      fullName: 'Musa Ibrahim',
      governmentIdSubmitted: false,
      id: 'artisan-id',
      phone: '+2348012345678',
      portfolioCount: 1,
      profileCompletion: 71,
      primaryService: 'Electrician',
      referenceCount: 0,
      reviewCount: 0,
      serviceArea: 'Barnawa and Narayi',
      startingPrice: 10000,
      state: 'Kaduna',
      verificationNotes: '',
      verificationReady: false,
      verificationStatus: 'pending',
      verificationTier: 'building',
      workEvidenceCount: 0,
      yearsExperience: 5,
    },
  ],
  auditLogs: [],
  bookings: [],
  commissions: [],
  disputes: [],
  metrics: {
    artisans: 1,
    pendingVerifications: 1,
    totalUsers: 1,
  },
  moderationCases: [],
  reels: [],
  reviews: [],
  users: [],
  withdrawals: [],
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    getAdminDashboardData.mockResolvedValue({ data: dashboardData, error: null })
  })

  it('shows professional applications and their verification requirements', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/professionals']}>
        <Routes>
          <Route path="/admin/:section" element={<AdminDashboard />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Musa Electrical Services')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Musa Electrical Services'))

    expect(screen.getByText('Experience and detailed bio')).toBeInTheDocument()
    expect(screen.getByText('Work evidence video')).toBeInTheDocument()
    expect(screen.getByText(/approval unlocks automatically/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled()
  })

  it('shows professional signups before onboarding is complete', async () => {
    getAdminDashboardData.mockResolvedValue({
      data: {
        ...dashboardData,
        artisans: [{
          ...dashboardData.artisans[0],
          businessName: '',
          id: 'signup-profile-id',
          isSignupOnly: true,
          primaryService: 'Onboarding not completed',
          verificationStatus: 'incomplete',
        }],
      },
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/admin/professionals']}>
        <Routes>
          <Route path="/admin/:section" element={<AdminDashboard />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByText('Musa Ibrahim')[0]).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByText('Musa Ibrahim')[0])

    expect(screen.getByText(/created an account but has not completed/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
  })
})
