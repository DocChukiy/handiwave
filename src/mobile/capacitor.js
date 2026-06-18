export async function openUrl(url) {
  try {
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url })
    return true
  } catch (err) {
    return false
  }
}

export async function initDeepLinkListener() {
  try {
    const { App } = await import('@capacitor/app')

    App.addListener('appUrlOpen', (event) => {
      try {
        const parsed = new URL(event.url)
        // Convert scheme path to SPA path (e.g. handiwave://payment/callback?reference=... -> /payment/callback?reference=...)
        const spaPath = parsed.pathname + parsed.search
        // Use window.location to let the SPA router handle the path
        window.location.href = spaPath
      } catch (e) {
        // ignore parse errors
      }
    })

    return true
  } catch (err) {
    return false
  }
}
