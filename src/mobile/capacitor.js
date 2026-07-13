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

function getConfiguredPaymentCallbackUrl() {
  const configuredUrl = import.meta.env?.VITE_PAYMENT_CALLBACK_URL?.trim()

  if (!configuredUrl) {
    return ''
  }

  try {
    const parsed = new URL(configuredUrl)
    const isHttpsCallback = parsed.protocol === 'https:' && parsed.pathname === '/payment/callback'
    const isNativeCallback =
      parsed.protocol === 'handiwave:' &&
      parsed.hostname === 'payment' &&
      parsed.pathname === '/callback'

    return isHttpsCallback || isNativeCallback ? configuredUrl : ''
  } catch {
    return ''
  }
}

export async function getMobilePaymentCallbackUrl() {
  const configuredUrl = getConfiguredPaymentCallbackUrl()

  if (configuredUrl) {
    return configuredUrl
  }

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

async function closeNativeBrowser() {
  try {
    const { Browser } = await import('@capacitor/browser')
    await Browser.close()
  } catch {
    // Browser may not be open, or we may be running on web.
  }
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
        closeNativeBrowser()
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
