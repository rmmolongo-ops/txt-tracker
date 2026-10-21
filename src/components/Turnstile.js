import { useEffect, useRef, useState } from 'react'
import { C, PALETTES } from '../lib/constants'
import { TURNSTILE_SITE_KEY, loadTurnstile } from '../lib/turnstile'

// Widget anti-robot. Appelle onToken(jeton) quand la vérification réussit, onToken(null) quand le
// jeton expire ou échoue. Un jeton ne sert qu'une fois : le parent remonte le composant (changer
// sa prop key) après chaque tentative pour en obtenir un nouveau.
export default function Turnstile({ onToken, action }) {
  const container = useRef(null)
  const callback = useRef(onToken)
  callback.current = onToken
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let widgetId
    let cancelled = false
    loadTurnstile()
      .then(ts => {
        if (cancelled || !container.current) return
        widgetId = ts.render(container.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          language: 'fr',
          theme: C.bg === PALETTES.light.bg ? 'light' : 'dark',
          callback: token => callback.current(token),
          'expired-callback': () => callback.current(null),
          'error-callback': () => callback.current(null),
        })
      })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => {
      cancelled = true
      if (widgetId !== undefined && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [action])

  return (
    <div>
      <div ref={container} style={{ minHeight: 65, display: 'flex', justifyContent: 'center' }} />
      {failed && (
        <div role="alert" style={{ fontSize: 12, color: C.red, textAlign: 'center' }}>
          La vérification anti-robot n'a pas pu se charger. Vérifie ta connexion ou désactive un bloqueur de contenu, puis recharge la page.
        </div>
      )}
    </div>
  )
}
