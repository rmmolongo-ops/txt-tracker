// Cloudflare Turnstile : vérification anti-robot exigée par Supabase (Attack Protection) pour la
// connexion, l'inscription et le renvoi d'email de confirmation.
// La clé de site est publique par nature (elle est visible dans la page) ; la clé secrète, elle,
// n'est renseignée que dans Supabase. Pour un essai local hors des domaines déclarés dans
// Cloudflare, REACT_APP_TURNSTILE_SITE_KEY=1x00000000000000000000AA (clé de test qui valide toujours).
export const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || '0x4AAAAAAFfoQXzYGUSFQaQf'

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let loading = null

export const loadTurnstile = () => {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile indisponible')))
    script.onerror = () => { loading = null; reject(new Error('Turnstile indisponible')) }
    document.head.appendChild(script)
  })
  return loading
}
