import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Services from '../pages/Services.jsx'

describe('Services Page', () => {
  it('reads the search query from the URL and populates the search input', () => {
    render(
      <MemoryRouter initialEntries={['/services?search=ac+repair']}>
        <Routes>
          <Route path="/services" element={<Services />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByRole('searchbox')).toHaveValue('ac repair')
  })
})
