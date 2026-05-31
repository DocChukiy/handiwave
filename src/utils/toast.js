export function showToast(message) {
  window.dispatchEvent(new CustomEvent('handiwave-toast', { detail: message }))
}
