import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../lib/constants'

// Profil : demande de suppression du compte (droit à l'effacement). La demande est traitée par
// l'administration depuis le back-office ; tant qu'elle ne l'est pas, elle peut être annulée.
export default function AccountDeletionRequest({ user, showToast }) {
  const [request, setRequest] = useState(undefined)
  const [asking, setAsking] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.from('account_deletion_requests').select('requested_at, reason').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setRequest(data || null))
  }, [user.id])

  const submit = async () => {
    setBusy(true)
    const { data, error } = await supabase.from('account_deletion_requests')
      .insert({ user_id: user.id, reason: reason.trim().slice(0, 500) }).select('requested_at, reason').single()
    setBusy(false)
    if (error) { showToast('❌ ' + error.message); return }
    setRequest(data); setAsking(false); setReason('')
    showToast('Demande de suppression envoyée')
  }

  const cancel = async () => {
    setBusy(true)
    const { error } = await supabase.from('account_deletion_requests').delete().eq('user_id', user.id)
    setBusy(false)
    if (error) { showToast('❌ ' + error.message); return }
    setRequest(null)
    showToast('Demande de suppression annulée')
  }

  if (request === undefined) return null

  return (
    <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid ' + C.border }}>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>Mes données personnelles</div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>
        Comment tes données sont utilisées : <a href="/legal/confidentialite.html" target="_blank" rel="noopener noreferrer" style={{ color: C.accentGlow }}>politique de confidentialité</a>.
      </div>
      {request ? (
        <div role="status" style={{ background: C.gold + '15', border: '1px solid ' + C.gold + '50', borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 1.5 }}>
          Suppression demandée le {new Date(request.requested_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}. Ton compte et tes données seront effacés prochainement par l'administration.
          <button onClick={cancel} disabled={busy}
            style={{ display: 'block', marginTop: 8, background: 'none', border: 'none', padding: 0, color: C.accentGlow, fontSize: 13, cursor: 'pointer' }}>Annuler ma demande</button>
        </div>
      ) : asking ? (
        <div role="dialog" aria-label="Demander la suppression du compte" style={{ background: C.red + '10', border: '1px solid ' + C.red + '40', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
            Ton profil, tes mesures, tes séances validées et tes messages seront définitivement effacés, et tu quitteras tes équipes. La suppression est faite par l'administration de TxT Tracker, en général sous quelques jours.
          </div>
          <textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={500} rows={2} placeholder="Une raison ? (facultatif)" aria-label="Raison de la suppression"
            style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setAsking(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
            <button onClick={submit} disabled={busy} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: C.red, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Confirmer la demande</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAsking(true)}
          style={{ width: '100%', padding: 11, borderRadius: 10, border: '1px solid ' + C.red + '50', background: 'transparent', color: C.red, fontSize: 13, cursor: 'pointer' }}>
          Demander la suppression de mon compte
        </button>
      )}
    </div>
  )
}
