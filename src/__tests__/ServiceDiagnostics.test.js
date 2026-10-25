import { describe, expect, it } from 'vitest'
import { getDiagnosticQuestions } from '../data/serviceDiagnostics.js'

describe('service diagnostics', () => {
  it('uses repair-specific questions for known services', () => {
    const questions = getDiagnosticQuestions({ slug: 'generator-repair' })

    expect(questions.map((question) => question.key)).toEqual([
      'fuel_type',
      'starts',
      'symptom',
    ])
  })

  it('keeps beauty appointments separate from repair diagnosis', () => {
    const questions = getDiagnosticQuestions({ slug: 'barber-hair-stylist' })

    expect(questions.some((question) => question.key === 'service_style')).toBe(true)
    expect(questions.some((question) => question.key === 'visit_type')).toBe(true)
  })

  it('provides safe fallback questions for new services', () => {
    expect(getDiagnosticQuestions({ slug: 'printer-repair' })).toHaveLength(3)
  })
})
