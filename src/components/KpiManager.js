import { useState } from 'react'
import { C } from '../lib/constants'
import { KPI_KINDS, KPI_CATEGORIES } from '../lib/kpis'
import Icon from './Icons'

// Gestion des indicateurs d'une équipe (coach / dirigeant) : ajout, modification, archivage.

const inputStyle = { width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }
const labelStyle = { fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }

const EMPTY_DRAFT = { label: '', grandeur: 'temps', unitCustom: 'touches', decimals: true, lower_is_better: true, category: 'physique' }

const grandeurOf = (kpi) => kpi.kind === 'note' ? (kpi.max === 20 ? 'note20' : 'note10') : kpi.kind

const draftFromKpi = (kpi) => ({
  label: kpi.label, grandeur: grandeurOf(kpi), unitCustom: kpi.kind === 'nombre' ? kpi.unit : 'touches',
  decimals: kpi.decimals !== false, lower_is_better: !!kpi.lower, category: kpi.category,
})

const toPayload = (d) => {
  const kind = d.grandeur.startsWith('note') ? 'note' : d.grandeur
  const unit = d.grandeur === 'temps' ? 'sec' : d.grandeur === 'distance' ? 'm' : d.grandeur === 'note10' ? '/10' : d.grandeur === 'note20' ? '/20' : d.unitCustom
  return { label: d.label, kind, unit, max_value: d.grandeur === 'note10' ? 10 : d.grandeur === 'note20' ? 20 : null, decimals: d.decimals, lower_is_better: d.lower_is_better, category: d.category }
}

const describe = (d) => {
  const g = KPI_KINDS.find(k => k.id === d.grandeur)
  const unit = d.grandeur === 'nombre' ? (d.unitCustom.trim() || 'unités') : g.unit
  const saisie = d.decimals ? 'un nombre à virgule' : 'un nombre entier'
  const example = d.grandeur === 'temps' ? (d.decimals ? '4,9 sec' : '5 sec')
    : d.grandeur === 'distance' ? (d.decimals ? '2,35 m' : '2 m')
    : d.grandeur === 'nombre' ? (d.decimals ? '12,5 ' : '12 ') + unit
    : (d.decimals ? '7,5' : '7') + unit
  const sens = d.lower_is_better ? 'Plus la valeur est basse, meilleure est la performance.' : 'Plus la valeur est haute, meilleure est la performance.'
  return `Le joueur saisira ${saisie}${d.grandeur.startsWith('note') ? ' entre 0 et ' + (d.grandeur === 'note10' ? 10 : 20) : ''} (ex : ${example}). ${sens}`
}

export default function KpiManager({ teams, kpisForTeam, archivedKpisForTeam, saveTeamKpi, setTeamKpiArchived }) {
  const [teamId, setTeamId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [editing, setEditing] = useState(null)
  const [confirmArchive, setConfirmArchive] = useState(null)
  const [showArchived, setShowArchived] = useState(false)

  if (!teams || teams.length === 0) return null
  const activeTeamId = teams.some(t => t.id === teamId) ? teamId : teams[0].id
  const kpis = kpisForTeam(activeTeamId)
  const archived = archivedKpisForTeam(activeTeamId)

  const closeForm = () => { setDraft(null); setEditing(null) }
  const submit = async () => {
    if (await saveTeamKpi(activeTeamId, toPayload(draft), editing)) closeForm()
  }
  const pickGrandeur = (g) => setDraft(d => ({ ...d, grandeur: g, lower_is_better: g === 'temps', decimals: g === 'temps' || g === 'distance' ? true : g === 'nombre' ? false : d.decimals }))

  return (
    <div style={{ background: C.card, borderRadius: 14, padding: 16, marginTop: 24, border: '1px solid ' + C.border }}>
      <div style={{ fontSize: 13, color: C.muted, fontWeight: 500, marginBottom: 12 }}>Indicateurs de l'équipe</div>

      {teams.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {teams.map(t => {
            const sel = t.id === activeTeamId
            return (
              <button key={t.id} onClick={() => { setTeamId(t.id); closeForm(); setConfirmArchive(null) }}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (sel ? C.accent : C.border), background: sel ? C.accent + '22' : 'transparent', color: sel ? C.accentGlow : C.muted, fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                {t.name}
              </button>
            )
          })}
        </div>
      )}

      {kpis.map(k => (
        <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderTop: '1px solid ' + C.border }}>
          {confirmArchive === k.id ? (
            <>
              <div style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>Archiver « {k.label} » ? Il disparaît des écrans, les mesures déjà saisies sont conservées et tu peux le restaurer.</div>
              <button onClick={() => { setTeamKpiArchived(k, true); setConfirmArchive(null) }} style={{ padding: '6px 10px', background: C.red, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Archiver</button>
              <button onClick={() => setConfirmArchive(null)} style={{ padding: '6px 10px', background: 'transparent', color: C.muted, border: '1px solid ' + C.border, borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
            </>
          ) : (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{k.label}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{k.unit || 'nombre'} · {k.decimals === false ? 'entier' : 'décimal'} · {k.category}</div>
              </div>
              <button onClick={() => { setEditing(k); setDraft(draftFromKpi(k)) }} aria-label={`Modifier l'indicateur ${k.label}`}
                style={{ padding: '6px 8px', background: C.surface, color: C.text, border: '1px solid ' + C.border, borderRadius: 8, display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="edit" size={15} /></button>
              <button onClick={() => setConfirmArchive(k.id)} aria-label={`Archiver l'indicateur ${k.label}`}
                style={{ padding: '6px 8px', background: 'transparent', color: C.red, border: '1px solid ' + C.red + '40', borderRadius: 8, display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="trash" size={15} /></button>
            </>
          )}
        </div>
      ))}

      {draft ? (
        <div style={{ borderTop: '1px solid ' + C.border, paddingTop: 14, marginTop: 4 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{editing ? 'Modifier l\'indicateur' : 'Nouvel indicateur'}</div>
          <div style={labelStyle}>Nom</div>
          <input value={draft.label} maxLength={40} placeholder="Ex : Saut en longueur" onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} style={{ ...inputStyle, marginBottom: 12 }} />

          <div style={labelStyle}>Comment le mesurer ?</div>
          <select value={draft.grandeur} onChange={e => pickGrandeur(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}>
            {KPI_KINDS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>

          {draft.grandeur === 'nombre' && (
            <>
              <div style={labelStyle}>Unité affichée</div>
              <input value={draft.unitCustom} maxLength={20} placeholder="touches, répétitions, buts…" onChange={e => setDraft(d => ({ ...d, unitCustom: e.target.value }))} style={{ ...inputStyle, marginBottom: 12 }} />
            </>
          )}

          <div style={labelStyle}>Type de saisie</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[{ v: false, l: 'Nombre entier' }, { v: true, l: 'Nombre à virgule' }].map(o => (
              <button key={String(o.v)} onClick={() => setDraft(d => ({ ...d, decimals: o.v }))}
                style={{ flex: 1, padding: '9px 10px', borderRadius: 8, border: '1px solid ' + (draft.decimals === o.v ? C.accent : C.border), background: draft.decimals === o.v ? C.accent + '22' : 'transparent', color: draft.decimals === o.v ? C.accentGlow : C.muted, fontSize: 13, cursor: 'pointer' }}>{o.l}</button>
            ))}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={draft.lower_is_better} onChange={e => setDraft(d => ({ ...d, lower_is_better: e.target.checked }))} />
            Plus petit = meilleur (ex : un temps de sprint)
          </label>

          <div style={labelStyle}>Catégorie</div>
          <select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} style={{ ...inputStyle, marginBottom: 12 }}>
            {KPI_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>

          <div style={{ fontSize: 12, color: C.muted, background: C.surface, borderRadius: 8, padding: '8px 10px', lineHeight: 1.5, marginBottom: 12 }}>{describe(draft)}</div>
          {editing && <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Les mesures déjà saisies ne sont pas converties si tu changes la grandeur.</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={closeForm} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: 14, cursor: 'pointer' }}>Annuler</button>
            <button onClick={submit} disabled={!draft.label.trim()}
              style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: C.accent, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', opacity: draft.label.trim() ? 1 : 0.5 }}>{editing ? 'Enregistrer' : 'Ajouter'}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setEditing(null); setDraft({ ...EMPTY_DRAFT }) }}
          style={{ width: '100%', marginTop: 8, padding: 10, borderRadius: 10, border: '1px dashed ' + C.border, background: 'transparent', color: C.accent, fontWeight: 500, fontSize: 14, cursor: 'pointer' }}>
          + Nouvel indicateur
        </button>
      )}

      {archived.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <button onClick={() => setShowArchived(v => !v)} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', padding: 0 }}>
            {showArchived ? 'Masquer' : 'Voir'} les indicateurs archivés ({archived.length})
          </button>
          {showArchived && archived.map(k => (
            <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid ' + C.border }}>
              <div style={{ flex: 1, fontSize: 13, color: C.muted }}>{k.label} <span style={{ fontSize: 12 }}>· {k.unit || 'nombre'}</span></div>
              <button onClick={() => setTeamKpiArchived(k, false)} style={{ padding: '6px 10px', background: C.surface, color: C.text, border: '1px solid ' + C.border, borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Restaurer</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
