const normalizedStateNames = new Map([
  ['abuja', 'FCT'],
  ['fct', 'FCT'],
  ['federal capital territory', 'FCT'],
  ['federal capital territory abuja', 'FCT'],
  ['kaduna', 'Kaduna'],
  ['kaduna state', 'Kaduna'],
])

export function normalizeNigerianState(value) {
  const state = value?.trim() || ''
  return normalizedStateNames.get(state.toLowerCase()) || state.replace(/\s+state$/i, '').trim()
}
