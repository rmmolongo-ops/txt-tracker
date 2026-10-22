import { useState, useEffect, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import App from './components/App'
import { C } from './lib/constants'
import { applyTheme, getStoredTheme, useTheme } from './lib/theme'
import ErrorBoundary from './components/ErrorBoundary'
import { installGlobalErrorHandlers } from './lib/errorReporting'
import ResetPassword from './components/ResetPassword'

// Arrivée par le lien de l'email « mot de passe oublié » : lu avant que Supabase ne nettoie l'adresse.
const recoveryFromUrl = /type=recovery/.test(window.location.hash + window.location.search)
// Lien d'email expiré ou déjà utilisé : Supabase renvoie une erreur dans l'adresse.
const linkErrorFromUrl = /error_code=|error=/.test(window.location.hash) ? (new URLSearchParams(window.location.hash.slice(1)).get('error_code') || 'erreur') : null

// Back-office chargé à part : seul le super admin qui ouvre /backoffice télécharge ce code.
const Backoffice = lazy(() => import('./components/backoffice/Backoffice'))
const isBackoffice = window.location.pathname.replace(/\/+$/, '') === '/backoffice'

// Palette appliquée avant le premier rendu : pas d'éclair de la mauvaise couleur.
applyTheme(getStoredTheme())
installGlobalErrorHandlers()

function Root() {
  const [theme, changeTheme] = useTheme()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recovery, setRecovery] = useState(recoveryFromUrl)
  // ?join=<code> : lien joueur révocable. Un ancien lien ?invite=<id d'équipe> est traité comme un
  // code : il n'en correspond à aucun, la page indique donc que le lien n'est plus valide.
  const [teamJoinCode] = useState(() => { const p = new URLSearchParams(window.location.search); return p.get('join') || p.get('invite') })
  const [clubInviteCode] = useState(() => new URLSearchParams(window.location.search).get('club_invite'))

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return (
    <div style={{ background: C.bg, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: C.accentGlow }}>TxT</div>
    </div>
  )

  return (
    <ErrorBoundary>
      {user && recovery
        ? <ResetPassword onDone={() => { setRecovery(false); window.history.replaceState(null, '', '/') }} />
        : user && isBackoffice
        ? <Suspense fallback={<div style={{ background: C.bg, minHeight: '100dvh' }} />}><Backoffice user={user} onSignOut={handleSignOut} /></Suspense>
        : user
        ? <App user={user} onSignOut={handleSignOut} teamJoinCode={teamJoinCode} clubInviteCode={clubInviteCode} theme={theme} onThemeChange={changeTheme} />
        : <Auth teamJoinCode={teamJoinCode} clubInviteCode={clubInviteCode} linkError={linkErrorFromUrl} />}
    </ErrorBoundary>
  )
}

const root = createRoot(document.getElementById('root'))
root.render(<Root />)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {})
  })
}
