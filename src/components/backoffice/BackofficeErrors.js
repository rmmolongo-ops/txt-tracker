import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/constants'
import { Section, Chip, formatDate, Loading, ErrorBox } from './ui'

const SOURCES = { ecran: 'Écran', 'window.error': 'Action', promesse: 'Requête', inconnu: 'Inconnue' }

// Journal des erreurs de l'appli (table client_errors) : filtres, détail, suppression.
export default function BackofficeErrors() {
  const [errors, setErrors] = useState(null)
  const [names, setNames] = useState({})
  const [loadError, setLoadError] = useState(null)
  const [source, setSource] = useState('toutes')
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('client_errors').select('*').order('created_at', { ascending: false }).limit(300),
      supabase.rpc('backoffice_users'),
    ]).then(([e, u]) => {
      if (e.error) { setLoadError(e.error.message); return }
      setErrors(e.data || [])
      const map = {}
      ;(u.data || []).forEach(x => { map[x.user_id] = `${x.prenom || ''} ${x.nom || ''}`.trim() || x.email })
      setNames(map)
    })
  }, [])

  const visible = useMemo(() => (errors || []).filter(e => source === 'toutes' || e.source === source), [errors, source])

  const removeOne = async (id) => {
    const { error } = await supabase.from('client_errors').delete().eq('id', id)
    if (!error) setErrors(prev => prev.filter(e => e.id !== id))
  }

  const clearAll = async () => {
    const { error } = await supabase.from('client_errors').delete().not('id', 'is', null)
    setConfirmClear(false)
    if (!error) setErrors([])
  }

  if (loadError) return <ErrorBox message={loadError} />
  if (!errors) return <Loading />

  const sources = [...new Set(errors.map(e => e.source || 'inconnu'))]

  return (
    <Section title={`Erreurs de l'appli (${errors.length})`}
      actions={errors.length > 0 && (confirmClear ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
          Tout effacer ?
          <button onClick={clearAll} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: C.red, color: '#fff', fontSize: 13, cursor: 'pointer' }}>Effacer</button>
          <button onClick={() => setConfirmClear(false)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
        </div>
      ) : (
        <button onClick={() => setConfirmClear(true)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer' }}>Tout effacer</button>
      ))}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Les erreurs de plus de 90 jours sont effacées automatiquement chaque nuit.</div>
      {errors.length === 0 ? (
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 12, padding: 20, color: C.muted, fontSize: 14 }}>
          Aucune erreur enregistrée. Les plantages des utilisateurs connectés apparaîtront ici.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <Chip active={source === 'toutes'} onClick={() => setSource('toutes')}>Toutes ({errors.length})</Chip>
            {sources.map(s => <Chip key={s} active={source === s} onClick={() => setSource(s)}>{SOURCES[s] || s} ({errors.filter(e => (e.source || 'inconnu') === s).length})</Chip>)}
          </div>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 12 }}>
            {visible.map((e, i) => (
              <details key={e.id} style={{ borderTop: i ? '1px solid ' + C.border : 'none', padding: '10px 14px' }}>
                <summary style={{ cursor: 'pointer', fontSize: 13, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 500 }}>{e.message}</span>
                  <span style={{ color: C.muted }}> · {formatDate(e.created_at, true)} · {names[e.user_id] || '—'} · {SOURCES[e.source] || e.source} · {e.url}</span>
                </summary>
                {e.stack && <pre style={{ fontSize: 11, color: C.muted, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '8px 0', maxHeight: 260, overflow: 'auto' }}>{e.stack}</pre>}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, color: C.muted, flexWrap: 'wrap' }}>
                  <span>{e.user_agent}</span>
                  <button onClick={() => removeOne(e.id)} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12, cursor: 'pointer', padding: 0 }}>Supprimer</button>
                </div>
              </details>
            ))}
          </div>
        </>
      )}
    </Section>
  )
}
