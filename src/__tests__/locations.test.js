import { describe, expect, it } from 'vitest'
import { normalizeNigerianState } from '../utils/locations.js'

describe('normalizeNigerianState', () => {
  it.each([
    ['Abuja', 'FCT'],
    ['fct', 'FCT'],
    ['Federal Capital Territory', 'FCT'],
    ['Kaduna State', 'Kaduna'],
    [' kaduna ', 'Kaduna'],
    ['Lagos State', 'Lagos'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeNigerianState(input)).toBe(expected)
  })

  it('keeps an unknown state name usable', () => {
    expect(normalizeNigerianState('Nasarawa')).toBe('Nasarawa')
  })
})
