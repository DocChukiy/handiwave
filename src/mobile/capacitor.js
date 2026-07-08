export async function openUrl(url) {
  try {
    const { Capacitor } = await import('@capacitor/core')
    const platform = Capacitor?.getPlatform?.()?.toLowerCase()
    const isNative = platform === 'android' || platform === 'ios' || platform === 'electron'

    if (!isNative) {
      return false
    }

    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url })
    return true
  } catch {
    return false
  }
}

export async function getMobilePaymentCallbackUrl() {
  try {
    const { Capacitor } = await import('@capacitor/core')
    const platform = Capacitor?.getPlatform?.()?.toLowerCase()
    if (platform === 'android' || platform === 'ios' || platform === 'electron') {
      return 'handiwave://payment/callback'
    }
  } catch {
    // ignore - not running in native
  }

  return undefined
}

export function getSpaPathFromAppUrl(url) {
  if (!url) {
    return ''
  }

  const parsed = new URL(url)

  if (parsed.protocol === 'handiwave:') {
    const hostPath = parsed.hostname ? `/${parsed.hostname}` : ''
    return `${hostPath}${parsed.pathname}${parsed.search}`
  }

  return `${parsed.pathname}${parsed.search}`
}

function routeToSpaPath(path) {
  if (!path) {
    return
  }

  if (window.location.pathname + window.location.search === path) {
    return
  }

  try {
    window.history.replaceState(null, '', path)
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
  } catch {
    window.location.href = path
  }
}

export async function initDeepLinkListener() {
  try {
    const { App } = await import('@capacitor/app')

    App.addListener('appUrlOpen', (event) => {
      try {
        const spaPath = getSpaPathFromAppUrl(event.url)
        routeToSpaPath(spaPath)
      } catch {
        // ignore parse errors
      }
    })

    return true
  } catch {
    return false
  }
}