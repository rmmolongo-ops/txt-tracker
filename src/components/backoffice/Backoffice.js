import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/constants'
import BackofficeOverview from './BackofficeOverview'
import BackofficeUsers from './BackofficeUsers'
import BackofficeStats from './BackofficeStats'
import BackofficeErrors from './BackofficeErrors'

// Back-office (/backoffice) : pilotage de toute l'appli, réservé au super admin.
// L'adresse ne protège rien : chaque donnée vient d'une fonction de la base qui vérifie le rôle.
const TABS = [
  { id: 'vue', label: "Vue d'ensemble" },
  { id: 'comptes', label: 'Comptes' },
  { id: 'stats', label: 'Statistiques' },
  { id: 'erreurs', label: 'Erreurs' },
]

export default function Backoffice({ user, onSignOut }) {
  const [allowed, setAllowed] = useState(undefined)
  const [tab, setTab] = useState(() => {
    const fromHash = window.location.hash.replace('#', '')
    return TABS.some(t => t.id === fromHash) ? fromHash : 'vue'
  })

  useEffect(() => {
    supabase.rpc('is_super_admin').then(({ data }) => setAllowed(data === true))
  }, [user.id])

  const changeTab = (id) => { setTab(id); window.history.replaceState(null, '', '#' + id) }

  if (allowed === undefined) {
    return <div style={{ background: C.bg, minHeight: '100dvh', display: 'grid', placeItems: 'center', color: C.muted }}>Vérification de l'accès…</div>
  }

  if (!allowed) {
    return (
      <div style={{ background: C.bg, minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 20 }}>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 28, maxWidth: 380, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 10 }}>Accès refusé</div>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 20 }}>Cette page est réservée à l'administration de TxT Tracker.</div>
          <a href="/" style={{ color: C.accentGlow, fontSize: 14 }}>Retour à l'appli</a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: C.bg, minHeight: '100dvh', color: C.text }}>
      <header style={{ borderBottom: '1px solid ' + C.border, background: C.card }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: C.accent, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>TxT</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Back-office</div>
              <div style={{ fontSize: 12, color: C.muted }}>{user.email}</div>
            </div>
          </div>
          <a href="/" style={{ color: C.accentGlow, fontSize: 13, textDecoration: 'none' }}>Retour à l'appli</a>
          <button onClick={onSignOut} style={{ background: 'transparent', border: '1px solid ' + C.border, color: C.muted, borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}>Déconnexion</button>
        </div>
        <nav aria-label="Sections du back-office" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', gap: 4, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => changeTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
              style={{ padding: '10px 14px', background: 'none', border: 'none', borderBottom: '2px solid ' + (tab === t.id ? C.accent : 'transparent'), color: tab === t.id ? C.text : C.muted, fontWeight: 500, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
        {tab === 'vue' && <BackofficeOverview />}
        {tab === 'comptes' && <BackofficeUsers currentUserId={user.id} />}
        {tab === 'stats' && <BackofficeStats />}
        {tab === 'erreurs' && <BackofficeErrors />}
      </main>
    </div>
  )
}
