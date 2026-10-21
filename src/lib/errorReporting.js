import { supabase } from './supabase'

// Signale une erreur de l'appli dans le journal (table client_errors), visible par le super admin.
// Au plus MAX_PER_SESSION erreurs par ouverture de l'appli, sans doublon, et seulement pour un
// utilisateur connecté. Un échec d'envoi est ignoré : signaler ne doit jamais faire planter.

const MAX_PER_SESSION = 10
const sent = new Set()

export const resetErrorReporting = () => sent.clear()

const cut = (value, max) => (value == null ? null : String(value).slice(0, max))

export const reportError = async (error, source = 'inconnu') => {
  try {
    const message = cut(error?.message || error || 'Erreur inconnue', 500)
    if (sent.has(message) || sent.size >= MAX_PER_SESSION) return false
    sent.add(message)
    const { data } = await supabase.auth.getSession()
    if (!data?.session) return false
    await supabase.from('client_errors').insert({
      message,
      stack: cut(error?.stack, 4000),
      source: cut(source, 40),
      url: cut(window.location.pathname + window.location.hash, 300),
      user_agent: cut(window.navigator.userAgent, 300),
    })
    return true
  } catch (e) {
    return false
  }
}

// Erreurs hors rendu React (gestionnaires d'évènements, promesses non gérées).
export const installGlobalErrorHandlers = () => {
  window.addEventListener('error', e => reportError(e.error || e.message, 'window.error'))
  window.addEventListener('unhandledrejection', e => reportError(e.reason, 'promesse'))
}
