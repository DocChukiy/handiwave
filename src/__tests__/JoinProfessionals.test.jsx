import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import JoinProfessionals from '../pages/JoinProfessionals.jsx'
import {
  buildTrackedPath,
  readTrackedParameters,
} from '../utils/recruitmentTracking.js'

describe('Kaduna professional recruitment flow', () => {
  it('shows the selected pilot area and an artisan signup link', () => {
    render(
      <MemoryRouter initialEntries={['/join-professionals?ref=kaduna-flyer&utm_source=field_flyer']}>
        <JoinProfessionals />
      </MemoryRouter>,
    )

    expect(screen.getByText(/first pilot area: barnawa–narayi corridor/i)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /apply as a professional|start free application/i })[0])
      .toHaveAttribute('href', expect.stringContaining('role=artisan'))
  })

  it('keeps existing role selection while adding attribution', () => {
    expect(buildTrackedPath('/signup?role=artisan', {
      ref: 'kaduna-flyer',
      utm_source: 'field_flyer',
    })).toBe('/signup?role=artisan&ref=kaduna-flyer&utm_source=field_flyer')
  })

  it('ignores unapproved query parameters', () => {
    expect(readTrackedParameters('?ref=kaduna-flyer&email=private@example.com'))
      .toEqual({ ref: 'kaduna-flyer' })
  })
})
