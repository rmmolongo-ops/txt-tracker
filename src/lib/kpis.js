import { KPI_CONFIG } from './constants'

// Indicateurs d'équipe (table team_kpis) : calculs purs partagés par les écrans.

// Grandeurs proposées au coach pour mesurer un indicateur.
export const KPI_KINDS = [
  { id: 'temps', label: 'Temps (secondes)', unit: 'sec', lower: true },
  { id: 'distance', label: 'Distance (mètres)', unit: 'm', lower: false },
  { id: 'nombre', label: 'Nombre (touches, répétitions…)', unit: '', lower: false },
  { id: 'note10', label: 'Note sur 10', unit: '/10', lower: false },
  { id: 'note20', label: 'Note sur 20', unit: '/20', lower: false },
]

export const KPI_CATEGORIES = ['physique', 'technique', 'mental']

// Ligne team_kpis -> format utilisé par les écrans (même forme que KPI_CONFIG).
export const toKpiConfig = (row) => ({
  id: row.key, label: row.label, unit: row.unit, lower: row.lower_is_better, category: row.category,
  kind: row.kind, decimals: row.decimals, max: row.max_value, teamId: row.team_id, rowId: row.id,
  archived: !!row.archived_at, position: row.position,
})

// Tous les indicateurs connus, par clé : sert à retrouver libellé/unité d'une mesure existante,
// même archivée ou issue d'une autre équipe. Les indicateurs par défaut restent le socle.
export const buildKpiCatalog = (rows) => {
  const byKey = new Map(KPI_CONFIG.map(k => [k.id, k]))
  ;(rows || []).forEach(r => { if (!byKey.has(r.key) || !r.archived_at) byKey.set(r.key, toKpiConfig(r)) })
  return [...byKey.values()]
}

// Indicateurs actifs d'une équipe (triés). Sans aucune ligne (équipe inconnue ou pas de
// droit de lecture) on retombe sur les indicateurs par défaut.
export const activeKpisForTeam = (rows, teamId) => {
  const teamRows = (rows || []).filter(r => r.team_id === teamId)
  if (teamRows.length === 0) return KPI_CONFIG
  return teamRows.filter(r => !r.archived_at).sort((a, b) => a.position - b.position).map(toKpiConfig)
}

export const archivedKpisForTeam = (rows, teamId) =>
  (rows || []).filter(r => r.team_id === teamId && r.archived_at).sort((a, b) => a.position - b.position).map(toKpiConfig)

// Union dédoublonnée (par clé) des indicateurs actifs de plusieurs équipes.
export const activeKpisForTeams = (rows, teamIds) => {
  const seen = new Set()
  const out = []
  ;(teamIds || []).forEach(id => activeKpisForTeam(rows, id).forEach(k => { if (!seen.has(k.id)) { seen.add(k.id); out.push(k) } }))
  return out.length > 0 ? out : KPI_CONFIG
}

// Pas de saisie HTML et borne selon la grandeur.
export const inputPropsFor = (kpi) => ({
  step: kpi.decimals ? 'any' : 1,
  min: 0,
  ...(kpi.max ? { max: kpi.max } : {}),
  inputMode: kpi.decimals ? 'decimal' : 'numeric',
})

// Valide une saisie : renvoie { value } ou { error }. Accepte la virgule décimale.
export const parseMesure = (kpi, raw) => {
  const n = Number(String(raw).trim().replace(',', '.'))
  if (String(raw).trim() === '' || !Number.isFinite(n)) return { error: 'Saisis un nombre' }
  if (n < 0) return { error: 'La valeur ne peut pas être négative' }
  if (kpi.max && n > kpi.max) return { error: 'La note ne peut pas dépasser ' + kpi.max }
  if (kpi.decimals === false && !Number.isInteger(n)) return { error: 'Saisis un nombre entier' }
  return { value: n }
}

// Clé stable d'un nouvel indicateur personnalisé (stockée dans mesures.kpi_id).
export const newKpiKey = () => 'c_' + (window.crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2, 8)).replace(/-/g, '').slice(0, 12)
