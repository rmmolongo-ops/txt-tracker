// Calculs purs (sans React ni Supabase) partagés par l'application : dates, KPIs, radar, matchs.

export const toDateStr = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const getMonday = (d) => {
  const date = new Date(d)
  const dow = date.getDay()
  date.setDate(date.getDate() - dow + (dow === 0 ? -6 : 1))
  date.setHours(0, 0, 0, 0)
  return date
}

// Dernière valeur saisie pour chaque KPI (null si aucune mesure).
export const latestKpis = (mesures, kpiConfig) => {
  const kpis = {}
  kpiConfig.forEach(k => {
    const arr = (mesures || []).filter(m => m.kpi_id === k.id).sort((a, b) => a.date.localeCompare(b.date))
    kpis[k.id] = arr.length > 0 ? arr[arr.length - 1].valeur : null
  })
  return kpis
}

// Progression en % entre la première et la dernière mesure (positive = amélioration).
// Pour un KPI « lower » (ex. sprint en secondes), une baisse est une amélioration.
export const kpiProgression = (sortedValues, lower) => {
  if (sortedValues.length < 2) return null
  const first = sortedValues[0], last = sortedValues[sortedValues.length - 1]
  if (!first) return null
  return ((lower ? first - last : last - first) / first * 100).toFixed(1)
}

// Position du joueur (0 à 100) sur chaque axe du radar, relativement aux autres joueurs du pool.
export const buildRadarData = (player, pool, axes, kpiConfig) => {
  const others = (pool || []).filter(p => p.user_id !== player.user_id)
  return axes.map(axis => {
    const kpi = kpiConfig.find(k => k.id === axis.id)
    const val = player.kpis?.[axis.id]
    if (val == null) return { axis: axis.label, value: 0 }
    const all = [val, ...others.map(p => p.kpis?.[axis.id]).filter(v => v != null)]
    const min = Math.min(...all), max = Math.max(...all)
    let pct = 50
    if (max > min) pct = kpi.lower ? ((max - val) / (max - min)) * 100 : ((val - min) / (max - min)) * 100
    return { axis: axis.label, value: Math.round(pct) }
  })
}

export const MATCH_RESULTS = [
  { id: 'victoire', label: 'Victoire', short: 'V', color: '#10b981' },
  { id: 'nul', label: 'Nul', short: 'N', color: '#64748b' },
  { id: 'defaite', label: 'Défaite', short: 'D', color: '#ef4444' },
]

export const hasScore = (m) => m.score_pour != null && m.score_contre != null

// Résultat déduit du score saisi (valeurs de formulaire : chaînes ou nombres), null si incomplet.
export const resultFromScore = (pour, contre) => {
  if (pour === '' || contre === '' || pour == null || contre == null) return null
  const a = parseInt(pour, 10), b = parseInt(contre, 10)
  if (isNaN(a) || isNaN(b)) return null
  return a > b ? 'victoire' : a < b ? 'defaite' : 'nul'
}

// Statistiques de matchs d'un joueur pour sa fiche. Un joueur compte comme présent s'il est
// coché présent ou s'il a marqué ; absent seulement si la présence a été saisie sans lui.
export const playerMatchStats = (matches, playerKey) => {
  const teamMatches = (matches || []).filter(m => m.resultat || hasScore(m))
  const butsOf = (m) => (m.buts || {})[playerKey] || 0
  const isPresent = (m) => (m.presents || []).includes(playerKey) || butsOf(m) > 0
  const isAbsent = (m) => (m.presents || []).length > 0 && !isPresent(m)
  const played = teamMatches.filter(isPresent)
  const bilan = {}
  MATCH_RESULTS.forEach(r => { bilan[r.id] = played.filter(m => m.resultat === r.id).length })
  return {
    teamMatches,
    played,
    totalButs: played.reduce((a, m) => a + butsOf(m), 0),
    bilan,
    butsOf,
    isAbsent,
  }
}
