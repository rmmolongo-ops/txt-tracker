let deferredPrompt = null
const listeners = new Set()

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  listeners.forEach(fn => fn())
})

window.addEventListener('appinstalled', () => {
  deferredPrompt = null
})

export function getDeferredPrompt() { return deferredPrompt }
export function clearDeferredPrompt() { deferredPrompt = null }
export function onPromptAvailable(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
