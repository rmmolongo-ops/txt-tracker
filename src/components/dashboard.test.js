// Rendu React direct (sans Testing Library) : act() est nécessaire autour de root.render.
/* eslint-disable testing-library/no-unnecessary-act */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import DashboardCoach from './DashboardCoach'
import DashboardJoueur from './DashboardJoueur'

let container, root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const render = async (el) => { await act(async () => { root.render(el) }) }
const buttons = () => [...container.querySelectorAll('button')]
const buttonWithText = (txt) => buttons().find(b => b.textContent.includes(txt))
const typeIn = async (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  await act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })) })
}

describe('DashboardCoach : saisie d’un match', () => {
  const team = { id: 't1', name: 'U12 B', color: '#3b82f6' }
  const match = { id: 'd1', team_id: 't1', date: '2026-09-20', type: 'match', label: 'Match vs Meudon', icon: '🏆', color: '#eab308', blocs: [], buts: {}, presents: [] }
  const coachRosterData = [
    { user_id: 'u1', prenom: 'Ralph', role: 'coach' }, // pas dans la liste des joueurs du match
    { user_id: 'u2', prenom: 'Kenji', role: 'joueur' },
  ]
  const managedPlayers = [{ user_id: 'ghost:m1', prenom: 'Siriman', role: 'joueur' }]
  const props = {
    activeCoachTeam: team, leadershipTeams: [team], coachRosterData, managedPlayers,
    dailySessions: [match], getDailySession: () => match, seanceTemplates: [],
    viewDay: { dateStr: '2026-09-20', date: new Date(2026, 8, 20), s: match, teamId: 't1' },
    dailyPickerFor: null, setDailyPickerFor: jest.fn(), setViewDay: jest.fn(), setCoachTeamId: jest.fn(),
    changeTab: jest.fn(), setEquipeTab: jest.fn(),
    assignDailySession: jest.fn(), assignMatchSession: jest.fn(), removeDailySession: jest.fn(), updateDailySession: jest.fn(),
    saveAnnotation: jest.fn(),
  }

  test('score → résultat déduit, présents, buteur, puis enregistrement', async () => {
    const saveMatchResult = jest.fn(() => Promise.resolve(true))
    await render(<DashboardCoach {...props} saveMatchResult={saveMatchResult} />)
    await act(async () => { buttonWithText('Saisir le score').click() })

    // Seuls les joueurs (pas le coach) sont proposés
    expect(container.textContent).toContain('Kenji')
    expect(container.textContent).toContain('Siriman')
    expect(container.textContent).not.toContain('Ralph')

    const [pour, contre] = container.querySelectorAll('input[type="number"]')
    await typeIn(pour, '3')
    await typeIn(contre, '1')

    await act(async () => { buttonWithText('Tous présents').click() })
    // + sur la ligne de Kenji : 2 buts
    const kenjiRow = [...container.querySelectorAll('div')].find(d => d.children.length >= 4 && d.textContent.startsWith('✓Kenji'))
    const plus = [...kenjiRow.querySelectorAll('button')].find(b => b.textContent === '+')
    await act(async () => { plus.click() })
    await act(async () => { plus.click() })

    const saveBtns = buttons().filter(b => b.textContent.includes('Enregistrer'))
    await act(async () => { saveBtns[0].click() })

    expect(saveMatchResult).toHaveBeenCalledTimes(1)
    const [id, draft] = saveMatchResult.mock.calls[0]
    expect(id).toBe('d1')
    expect(draft.resultat).toBe('victoire') // déduit de 3-1
    expect(draft.score_pour).toBe('3')
    expect(draft.score_contre).toBe('1')
    expect(draft.presents.sort()).toEqual(['ghost:m1', 'u2'])
    expect(draft.buts).toEqual({ u2: 2 })
    // Après succès, l'éditeur se referme
    expect(buttonWithText('Tous présents')).toBeUndefined()
  })
})

describe('DashboardJoueur', () => {
  const props = {
    availableTeams: [], myTeamIds: new Set(), changeTab: jest.fn(), getDashboardKpiIds: () => ['sprint30'],
    getLatest: (id) => (id === 'sprint30' ? 4.8 : null), getProgress: () => '4.0', getProgramForDate: () => null,
    getProgramsForTeam: () => [], getWeekCompliance: () => 57, inputValues: {}, isMobile: false,
    isSeanceDone: () => false, saveMesure: jest.fn(), setInputValues: jest.fn(), toggleSeance: jest.fn(),
    saveDashboardKpis: jest.fn(() => Promise.resolve(true)),
  }

  test('affiche l’assiduité et les performances clés ; un clic sur un KPI ouvre ses stats', async () => {
    const setSelectedKpi = jest.fn(), changeTab = jest.fn()
    await render(<DashboardJoueur {...props} setSelectedKpi={setSelectedKpi} changeTab={changeTab} />)
    expect(container.textContent).toContain('57%')
    expect(container.textContent).toContain('Performances clés')
    expect(container.textContent).toContain('4.8')
    const kpiTile = [...container.querySelectorAll('div')].find(d => d.style.cursor === 'pointer' && d.textContent.includes('Sprint 30m'))
    await act(async () => { kpiTile.click() })
    expect(setSelectedKpi).toHaveBeenCalledWith('sprint30')
    expect(changeTab).toHaveBeenCalledWith('stats')
  })
})
