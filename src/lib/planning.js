import { DAY_MAP } from './constants'
import { toDateStr } from './stats'

// Ce qui est prévu pour le joueur : séances des programmes d'équipe et événements du calendrier du coach.

export const dayCodeOf = (dateStr) => {
  const dow = new Date(dateStr + 'T00:00:00').getDay()
  return Object.keys(DAY_MAP).find(k => DAY_MAP[k] === dow)
}

// Entrées prévues un jour donné, équipe par équipe. Un entraînement du calendrier remplace ce jour-là la
// séance du programme de la même équipe (le coach a planifié autre chose) ; un match s'y ajoute.
// Une validation vaut pour une équipe et une date (clé jour + date + équipe de la table seances).
export function plannedForDate({ teams, dateStr, getProgramForDate, events }) {
  const day = dayCodeOf(dateStr)
  const entries = []
  for (const team of teams) {
    const dayEvents = events.filter(e => e.team_id === team.id && e.date === dateStr)
      .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
    const hasTraining = dayEvents.some(e => e.type !== 'match')
    if (!hasTraining) {
      const program = getProgramForDate(team.id, dateStr)
      const s = program?.sessions.find(x => x.day === day)
      if (s) entries.push({ key: dateStr + '_' + team.id + '_prog', kind: 'programme', team, day, dateStr, s, source: program.name })
    }
    for (const e of dayEvents) {
      entries.push({ key: e.id, kind: e.type === 'match' ? 'match' : 'entrainement', team, day, dateStr, s: { ...e, blocs: e.blocs || [] }, source: 'Calendrier' })
    }
  }
  return entries
}

// Assiduité sur les 7 derniers jours (aujourd'hui compris) : jours d'entraînement prévus par équipe
// et validés par le joueur. null quand rien n'était prévu, pour ne pas afficher un 0 % trompeur.
export function weekCompliance({ teams, seances, getProgramForDate, events, today = new Date() }) {
  let planned = 0, done = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const dateStr = toDateStr(d)
    const trainingTeams = new Set(plannedForDate({ teams, dateStr, getProgramForDate, events }).filter(x => x.kind !== 'match').map(x => x.team.id))
    for (const teamId of trainingTeams) {
      planned++
      if (seances.some(s => s.date === dateStr && s.team_id === teamId && s.jour === dayCodeOf(dateStr))) done++
    }
  }
  return planned === 0 ? null : Math.round((done / planned) * 100)
}

// Prochaine entrée prévue après aujourd'hui (dans les 30 jours), pour l'accueil quand rien n'est prévu aujourd'hui.
export function nextPlanned({ teams, getProgramForDate, events, today = new Date() }) {
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today); d.setDate(d.getDate() + i)
    const entries = plannedForDate({ teams, dateStr: toDateStr(d), getProgramForDate, events })
    if (entries.length > 0) return entries[0]
  }
  return null
}
