import { describe, expect, it } from 'vitest'
import { getSpaPathFromAppUrl } from '../mobile/capacitor.js'

describe('Capacitor mobile URL helpers', () => {
  it('converts the Paystack custom scheme callback to the SPA payment route', () => {
    expect(getSpaPathFromAppUrl('handiwave://payment/callback?reference=abc123')).toBe(
      '/payment/callback?reference=abc123',
    )
  })

  it('keeps universal link paths intact for production HTTPS callbacks', () => {
    expect(getSpaPathFromAppUrl('https://handiwave.example/payment/callback?trxref=abc123')).toBe(
      '/payment/callback?trxref=abc123',
    )
  })
})
