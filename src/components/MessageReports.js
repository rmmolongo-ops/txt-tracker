import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../lib/constants'

const formatDateTime = (value) => value
  ? new Date(value).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '—'

// Signalements de messages du chat, pour le staff (coachs/dirigeants de l'équipe, admins du club)
// et le super admin : la base ne renvoie que ceux des équipes que la personne encadre.
// - compact : bandeau replié dans le chat, rien n'est affiché quand il n'y a rien à traiter.
export default function MessageReports({ teams = [], compact = false, showResolved = false, onResolved }) {
  const [reports, setReports] = useState(null)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [open, setOpen] = useState(!compact)
  const teamName = (id) => teams.find(t => t.id === id)?.name

  const load = useCallback(async () => {
    let q = supabase.from('message_reports').select('*')
    if (!showResolved) q = q.eq('status', 'ouvert')
    const { data, error: e } = await q.order('created_at', { ascending: false }).limit(200)
    if (e) { setError(e.message); return }
    setReports(data || [])
  }, [showResolved])

  useEffect(() => { load() }, [load])

  const resolve = async (report, deleteMessage) => {
    setBusy(report.id)
    const { error: e } = await supabase.rpc('resolve_message_report', { p_report_id: report.id, p_delete_message: deleteMessage })
    setBusy(null)
    if (e) { setActionError(e.message); return }
    setActionError(null)
    await load()
    if (onResolved) onResolved(report, deleteMessage)
  }

  const errorBox = (message) => <div role="alert" style={{ background: C.red + '15', border: '1px solid ' + C.red + '50', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 12 }}>{message}</div>
  // Dans le chat, une erreur de chargement ne doit pas encombrer l'écran de tous les membres.
  if (error) return compact ? null : errorBox(error)
  if (!reports) return compact ? null : <div style={{ color: C.muted, fontSize: 14 }}>Chargement…</div>
  const pending = reports.filter(r => r.status === 'ouvert')
  if (compact && pending.length === 0) return null

  return (
    <div style={{ marginBottom: 14 }}>
      {compact && (
        <button onClick={() => setOpen(o => !o)} aria-expanded={open}
          style={{ width: '100%', textAlign: 'left', background: C.gold + '18', border: '1px solid ' + C.gold + '60', borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          ⚠️ {pending.length} message{pending.length > 1 ? 's' : ''} signalé{pending.length > 1 ? 's' : ''} à examiner {open ? '▲' : '▼'}
        </button>
      )}
      {open && (
        <div style={{ display: 'grid', gap: 10, marginTop: compact ? 10 : 0 }}>
          {actionError && errorBox(actionError)}
          {reports.length === 0 && <div style={{ color: C.muted, fontSize: 14 }}>Aucun signalement.</div>}
          {reports.map(r => (
            <div key={r.id} style={{ background: C.card, border: '1px solid ' + (r.status === 'ouvert' ? C.gold + '60' : C.border), borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
                {teamName(r.team_id) ? teamName(r.team_id) + ' · ' : ''}message de <strong style={{ color: C.text }}>{r.author_name || 'membre'}</strong> du {formatDateTime(r.message_created_at)}
                {' · '}signalé le {formatDateTime(r.created_at)}
              </div>
              <div style={{ background: C.surface, borderRadius: 8, padding: '8px 12px', fontSize: 14, lineHeight: 1.45, wordBreak: 'break-word', marginBottom: 8 }}>{r.message_content}</div>
              {r.reason && <div style={{ fontSize: 13, marginBottom: 8 }}><span style={{ color: C.muted }}>Motif : </span>{r.reason}</div>}
              {r.status === 'ouvert' ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => resolve(r, true)} disabled={busy === r.id}
                    style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: C.red, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    {r.message_id ? 'Supprimer le message' : 'Clore (message déjà supprimé)'}
                  </button>
                  <button onClick={() => resolve(r, false)} disabled={busy === r.id}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid ' + C.border, background: 'transparent', color: C.text, fontSize: 13, cursor: 'pointer' }}>
                    Conserver le message
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: C.muted }}>
                  Traité le {formatDateTime(r.resolved_at)} : {r.resolution === 'message_supprime' ? 'message supprimé' : 'message conservé'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
