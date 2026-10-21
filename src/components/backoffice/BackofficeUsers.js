import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { C, ROLE_CONFIG } from '../../lib/constants'
import { Section, Chip, Badge, formatDate, searchInputStyle, Loading, ErrorBox } from './ui'
import Turnstile from '../Turnstile'

const FILTERS = [
  { id: 'tous', label: 'Tous', test: () => true },
  { id: 'non_confirmes', label: 'Email non confirmé', test: u => !u.email_confirmed_at },
  { id: 'sans_equipe', label: 'Sans équipe', test: u => u.equipes.length === 0 },
  { id: 'multi_clubs', label: 'Plusieurs clubs', test: u => new Set(u.equipes.map(e => e.club)).size > 1 },
  { id: 'staff', label: 'Staff', test: u => u.equipes.some(e => ['coach', 'dirigeant'].includes(e.role)) || u.clubs.length > 0 },
]

const CLUB_ROLES = { admin: 'Administrateur', dirigeant: 'Dirigeant', coach: 'Coach' }

const displayName = u => `${u.prenom || ''} ${u.nom || ''}`.trim() || '(sans nom)'

// Comptes : recherche, filtres, détail des équipes et rôles, relance d'email, suppression.
export default function BackofficeUsers({ currentUserId }) {
  const [users, setUsers] = useState(null)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('tous')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState(null)
  // Le renvoi d'email exige un jeton anti-robot (Supabase Attack Protection), à usage unique.
  const [captchaToken, setCaptchaToken] = useState(null)
  const [captchaKey, setCaptchaKey] = useState(0)

  useEffect(() => {
    supabase.rpc('backoffice_users').then(({ data, error: e }) => { if (e) setError(e.message); else setUsers(data || []) })
  }, [])

  const visible = useMemo(() => {
    if (!users) return []
    const f = FILTERS.find(x => x.id === filter)
    const q = query.trim().toLowerCase()
    return users.filter(f.test).filter(u => !q || [u.email, u.prenom, u.nom, ...u.equipes.map(e => e.team), ...u.equipes.map(e => e.club)].some(v => (v || '').toLowerCase().includes(q)))
  }, [users, filter, query])

  const resend = async (u) => {
    setBusy(u.user_id)
    const { error: e } = await supabase.auth.resend({ type: 'signup', email: u.email, options: { emailRedirectTo: window.location.origin, captchaToken } })
    setBusy(null)
    setCaptchaToken(null)
    setCaptchaKey(k => k + 1)
    setNotice(e ? { error: true, text: 'Relance impossible : ' + e.message } : { text: 'Email de confirmation renvoyé à ' + u.email })
  }

  const remove = async (u) => {
    setBusy(u.user_id)
    const { error: e } = await supabase.rpc('delete_user_as_admin', { target_user_id: u.user_id })
    setBusy(null)
    setConfirmDelete(null)
    if (e) { setNotice({ error: true, text: 'Suppression impossible : ' + e.message }); return }
    setUsers(prev => prev.filter(x => x.user_id !== u.user_id))
    setNotice({ text: 'Compte supprimé : ' + u.email })
  }

  if (error) return <ErrorBox message={error} />
  if (!users) return <Loading />

  return (
    <Section title={`Comptes (${visible.length}/${users.length})`}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un nom, un email, une équipe…" aria-label="Rechercher un compte" style={searchInputStyle} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {FILTERS.map(f => <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>{f.label} ({users.filter(f.test).length})</Chip>)}
      </div>
      {users.some(u => !u.email_confirmed_at) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12, fontSize: 12, color: C.muted }}>
          <span>Vérification requise pour relancer un email :</span>
          <Turnstile key={captchaKey} action="relance" onToken={setCaptchaToken} />
        </div>
      )}
      {notice && (
        <div role="status" style={{ background: (notice.error ? C.red : C.green) + '15', border: '1px solid ' + (notice.error ? C.red : C.green) + '50', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 12 }}>{notice.text}</div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {visible.map(u => {
          const self = u.user_id === currentUserId
          const multiClub = new Set(u.equipes.map(e => e.club)).size > 1
          return (
            <div key={u.user_id} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 12, padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {displayName(u)} {u.is_super_admin && <Badge color={C.accent}>Super admin</Badge>}
                  </div>
                  <div style={{ fontSize: 13, color: C.muted, wordBreak: 'break-all' }}>{u.email}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                    Inscrit le {formatDate(u.created_at)} · {u.provider === 'google' ? 'Google' : 'Email'}
                    {' · '}{u.email_confirmed_at ? 'email confirmé' : <span style={{ color: C.gold }}>email non confirmé</span>}
                    {' · '}dernière connexion {formatDate(u.last_sign_in_at)}
                    {' · '}{u.nb_mesures} mesure{u.nb_mesures !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {!u.email_confirmed_at && (
                    <button onClick={() => resend(u)} disabled={busy === u.user_id || !captchaToken} title={captchaToken ? undefined : 'Valide d’abord la vérification anti-robot'}
                      style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid ' + C.border, background: 'transparent', color: C.text, fontSize: 13, cursor: 'pointer' }}>Relancer l'email</button>
                  )}
                  {!self && !u.is_super_admin && (
                    <button onClick={() => setConfirmDelete(u.user_id)} disabled={busy === u.user_id}
                      style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid ' + C.red + '60', background: 'transparent', color: C.red, fontSize: 13, cursor: 'pointer' }}>Supprimer</button>
                  )}
                </div>
              </div>

              {(u.equipes.length > 0 || u.clubs.length > 0) && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  {u.clubs.map((c, i) => <Badge key={'c' + i} color={C.accent}>{c.club} · {CLUB_ROLES[c.role] || c.role} du club</Badge>)}
                  {u.equipes.map((e, i) => <Badge key={'e' + i}>{e.team} ({e.club || 'sans club'}) · {ROLE_CONFIG[e.role]?.label || e.role}</Badge>)}
                  {multiClub && <Badge color={C.gold}>Présent dans plusieurs clubs</Badge>}
                </div>
              )}

              {confirmDelete === u.user_id && (
                <div role="alertdialog" aria-label="Confirmer la suppression" style={{ marginTop: 12, background: C.red + '12', border: '1px solid ' + C.red + '50', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
                    Supprimer définitivement le compte <strong>{u.email}</strong> ? Son profil, ses mesures et ses séances seront effacés. Cette action est irréversible.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: 9, borderRadius: 8, border: '1px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
                    <button onClick={() => remove(u)} disabled={busy === u.user_id} style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', background: C.red, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Supprimer définitivement</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {visible.length === 0 && <div style={{ color: C.muted, fontSize: 14 }}>Aucun compte ne correspond.</div>}
      </div>
    </Section>
  )
}
