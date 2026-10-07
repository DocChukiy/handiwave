const attributionStorageKey = 'handiwave-recruitment-attribution'

const trackedParameters = [
  'ref',
  'utm_campaign',
  'utm_content',
  'utm_medium',
  'utm_source',
]

export const kadunaFlyerParameters = {
  ref: 'kaduna-flyer',
  utm_campaign: 'kaduna_founding_professionals',
  utm_content: 'general_flyer',
  utm_medium: 'qr',
  utm_source: 'field_flyer',
}

export function readTrackedParameters(search = '') {
  const searchParameters = new URLSearchParams(search)

  return trackedParameters.reduce((attribution, parameter) => {
    const value = searchParameters.get(parameter)?.trim()

    if (value) {
      attribution[parameter] = value
    }

    return attribution
  }, {})
}

export function rememberRecruitmentAttribution(search = '') {
  const attribution = readTrackedParameters(search)

  if (Object.keys(attribution).length > 0) {
    window.localStorage.setItem(attributionStorageKey, JSON.stringify(attribution))
    return attribution
  }

  return getRecruitmentAttribution()
}

export function getRecruitmentAttribution() {
  try {
    return JSON.parse(window.localStorage.getItem(attributionStorageKey)) || {}
  } catch {
    return {}
  }
}

export function buildTrackedPath(path, attribution = {}) {
  const [pathname, existingQuery = ''] = path.split('?')
  const searchParameters = new URLSearchParams(existingQuery)

  trackedParameters.forEach((parameter) => {
    if (attribution[parameter]) {
      searchParameters.set(parameter, attribution[parameter])
    }
  })

  const query = searchParameters.toString()
  return query ? `${pathname}?${query}` : pathname
}
