import { dayCodeOf, plannedForDate, weekCompliance, nextPlanned } from './planning'

const teamA = { id: 'a', name: 'U15 A' }
const teamB = { id: 'b', name: 'U17' }
// Programme de l'équipe A : séances le lundi et le mercredi, tout le mois d'octobre 2026.
const programA = { team_id: 'a', name: 'Automne', start_date: '2026-10-01', end_date: '2026-10-31', sessions: [
  { day: 'LUN', label: 'Vitesse', blocs: [] }, { day: 'MER', label: 'Technique', blocs: [] },
] }
const getProgramForDate = (teamId, dateStr) => (teamId === 'a' && dateStr >= programA.start_date && dateStr <= programA.end_date ? programA : undefined)

test('dayCodeOf : code jour d’une date', () => {
  expect(dayCodeOf('2026-10-19')).toBe('LUN')
  expect(dayCodeOf('2026-10-25')).toBe('DIM')
})

test('plannedForDate : séance de programme, et un entraînement du calendrier la remplace pour la même équipe', () => {
  const lundi = '2026-10-19'
  expect(plannedForDate({ teams: [teamA], dateStr: lundi, getProgramForDate, events: [] }).map(e => e.s.label)).toEqual(['Vitesse'])
  const events = [{ id: 'e1', team_id: 'a', date: lundi, type: 'entrainement', label: 'Spécial coach' }]
  const entries = plannedForDate({ teams: [teamA], dateStr: lundi, getProgramForDate, events })
  expect(entries.map(e => [e.kind, e.s.label])).toEqual([['entrainement', 'Spécial coach']])
})

test('plannedForDate : un match s’ajoute à la séance du programme ; une équipe sans rien ne donne rien', () => {
  const lundi = '2026-10-19'
  const events = [{ id: 'm1', team_id: 'a', date: lundi, type: 'match', label: 'Match' }]
  expect(plannedForDate({ teams: [teamA, teamB], dateStr: lundi, getProgramForDate, events }).map(e => e.kind)).toEqual(['programme', 'match'])
})

test('weekCompliance : jours d’entraînement prévus et validés sur 7 jours, matchs exclus', () => {
  const today = new Date(2026, 9, 21) // mercredi 21 octobre : fenêtre du jeudi 15 au mercredi 21
  const events = [
    { id: 'e1', team_id: 'b', date: '2026-10-17', type: 'entrainement', label: 'Samedi U17' },
    { id: 'm1', team_id: 'b', date: '2026-10-18', type: 'match', label: 'Match' },
  ]
  // Prévu : lundi 19 (A), mercredi 21 (A), samedi 17 (B) = 3 ; validés : lundi 19 (A) et samedi 17 (B).
  const seances = [
    { jour: 'LUN', date: '2026-10-19', team_id: 'a' },
    { jour: 'SAM', date: '2026-10-17', team_id: 'b' },
    { jour: 'MAR', date: '2026-10-20', team_id: null },
  ]
  expect(weekCompliance({ teams: [teamA, teamB], seances, getProgramForDate, events, today })).toBe(67)
})

test('weekCompliance : null quand rien n’était prévu', () => {
  expect(weekCompliance({ teams: [teamB], seances: [], getProgramForDate, events: [], today: new Date(2026, 9, 21) })).toBeNull()
})

test('nextPlanned : premier rendez-vous après aujourd’hui', () => {
  const next = nextPlanned({ teams: [teamA], getProgramForDate, events: [], today: new Date(2026, 9, 21) })
  expect(next.dateStr).toBe('2026-10-26')
  expect(next.s.label).toBe('Vitesse')
})
