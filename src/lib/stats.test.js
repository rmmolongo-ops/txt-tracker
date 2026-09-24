import { toDateStr, getMonday, latestKpis, kpiProgression, buildRadarData, hasScore, resultFromScore, playerMatchStats } from './stats'

const KPIS = [
  { id: 'sprint30', lower: true },
  { id: 'jonglerie_g', lower: false },
]

describe('dates', () => {
  test('toDateStr formate en AAAA-MM-JJ avec zéros', () => {
    expect(toDateStr(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  test('getMonday renvoie le lundi de la semaine, dimanche compris', () => {
    expect(toDateStr(getMonday(new Date(2026, 8, 24)))).toBe('2026-09-21') // mercredi
    expect(toDateStr(getMonday(new Date(2026, 8, 27)))).toBe('2026-09-21') // dimanche
    expect(toDateStr(getMonday(new Date(2026, 8, 21)))).toBe('2026-09-21') // lundi
  })
})

describe('latestKpis', () => {
  test('prend la mesure la plus récente par KPI, quel que soit l’ordre reçu', () => {
    const mesures = [
      { kpi_id: 'sprint30', valeur: 5.2, date: '2026-09-10' },
      { kpi_id: 'sprint30', valeur: 4.9, date: '2026-09-20' },
      { kpi_id: 'sprint30', valeur: 5.0, date: '2026-09-15' },
    ]
    expect(latestKpis(mesures, KPIS)).toEqual({ sprint30: 4.9, jonglerie_g: null })
  })

  test('accepte une liste vide ou absente', () => {
    expect(latestKpis(undefined, KPIS)).toEqual({ sprint30: null, jonglerie_g: null })
  })
})

describe('kpiProgression', () => {
  test('KPI « plus haut = mieux » : hausse positive', () => {
    expect(kpiProgression([10, 12, 15], false)).toBe('50.0')
  })

  test('KPI « plus bas = mieux » (sprint) : une baisse du temps est une progression', () => {
    expect(kpiProgression([5, 4.5], true)).toBe('10.0')
    expect(kpiProgression([5, 5.5], true)).toBe('-10.0')
  })

  test('null avec moins de 2 mesures ou une première valeur à 0', () => {
    expect(kpiProgression([7], false)).toBeNull()
    expect(kpiProgression([0, 12], false)).toBeNull()
  })
})

describe('buildRadarData', () => {
  const axes = [{ id: 'sprint30', label: 'Vitesse' }, { id: 'jonglerie_g', label: 'Jonglerie' }]

  test('100 = meilleur de l’équipe, 0 = moins bon, en tenant compte du sens du KPI', () => {
    const player = { user_id: 'a', kpis: { sprint30: 4.5, jonglerie_g: 10 } }
    const pool = [player, { user_id: 'b', kpis: { sprint30: 5.5, jonglerie_g: 30 } }]
    expect(buildRadarData(player, pool, axes, KPIS)).toEqual([
      { axis: 'Vitesse', value: 100 },
      { axis: 'Jonglerie', value: 0 },
    ])
  })

  test('50 quand le joueur est seul, 0 quand le KPI n’est pas mesuré', () => {
    const player = { user_id: 'a', kpis: { sprint30: 4.5 } }
    expect(buildRadarData(player, [], axes, KPIS)).toEqual([
      { axis: 'Vitesse', value: 50 },
      { axis: 'Jonglerie', value: 0 },
    ])
  })
})

describe('score et résultat de match', () => {
  test('resultFromScore déduit V / N / D', () => {
    expect(resultFromScore('3', '1')).toBe('victoire')
    expect(resultFromScore(2, 2)).toBe('nul')
    expect(resultFromScore('0', '4')).toBe('defaite')
  })

  test('resultFromScore renvoie null si le score est incomplet ou invalide', () => {
    expect(resultFromScore('', '1')).toBeNull()
    expect(resultFromScore(null, 1)).toBeNull()
    expect(resultFromScore('abc', '1')).toBeNull()
  })

  test('hasScore exige les deux scores, 0 compris', () => {
    expect(hasScore({ score_pour: 0, score_contre: 0 })).toBe(true)
    expect(hasScore({ score_pour: 1, score_contre: null })).toBe(false)
  })
})

describe('playerMatchStats', () => {
  const matches = [
    { id: 1, resultat: 'victoire', score_pour: 3, score_contre: 1, presents: ['p1', 'p2'], buts: { p1: 2 } },
    { id: 2, resultat: 'defaite', score_pour: 0, score_contre: 2, presents: ['p2'], buts: {} },
    { id: 3, resultat: 'nul', presents: [], buts: { p1: 1 } }, // présence non saisie mais a marqué
    { id: 4, resultat: null, presents: ['p1'], buts: {} }, // match sans résultat : ignoré
  ]

  test('compte les matchs joués, les buts et le bilan du joueur', () => {
    const s = playerMatchStats(matches, 'p1')
    expect(s.teamMatches.map(m => m.id)).toEqual([1, 2, 3])
    expect(s.played.map(m => m.id)).toEqual([1, 3])
    expect(s.totalButs).toBe(3)
    expect(s.bilan).toEqual({ victoire: 1, nul: 1, defaite: 0 })
  })

  test('absent seulement si la présence a été saisie sans lui', () => {
    const s = playerMatchStats(matches, 'p1')
    expect(s.isAbsent(matches[1])).toBe(true)
    expect(s.isAbsent(matches[2])).toBe(false)
  })

  test('un joueur sans aucun match joué a un bilan vide', () => {
    const s = playerMatchStats(matches, 'p9')
    expect(s.played).toEqual([])
    expect(s.totalButs).toBe(0)
    expect(s.bilan).toEqual({ victoire: 0, nul: 0, defaite: 0 })
  })
})
