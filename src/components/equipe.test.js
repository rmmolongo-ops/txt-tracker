// Rendu React direct (sans Testing Library) : act() est nécessaire autour de root.render.
/* eslint-disable testing-library/no-unnecessary-act */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import EquipeJoueurScreen from './EquipeJoueurScreen'
import EquipeCoachScreen from './EquipeCoachScreen'

// team_members → deux membres ; profils → leurs fiches.
jest.mock('../lib/supabase', () => {
  const tables = {
    team_members: [{ user_id: 'u1', role: 'coach' }, { user_id: 'u2', role: 'joueur' }],
    profils: [
      { user_id: 'u1', prenom: 'Ralph', nom: 'Molongo', surnom: 'RM' },
      { user_id: 'u2', prenom: 'Kenji', nom: 'Lahib', surnom: 'KL' },
    ],
  }
  const query = (table) => {
    const result = { data: tables[table] || [] }
    const q = { select: () => q, eq: () => q, in: () => q, order: () => q, then: (res) => Promise.resolve(result).then(res) }
    return q
  }
  return { supabase: { from: query } }
})

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
const buttonWithText = (txt) => [...container.querySelectorAll('button')].find(b => b.textContent.includes(txt))
const teams = [{ id: 't1', name: 'U12 B', color: '#3b82f6' }, { id: 't2', name: 'Mobambi', color: '#10b981' }]

describe('EquipeJoueurScreen (vue joueur)', () => {
  test('sans équipe : invite à rejoindre une équipe', async () => {
    await render(<EquipeJoueurScreen myTeams={[]} getProgramsForTeam={() => []} isMobile={false} />)
    expect(container.textContent).toContain('Rejoins une équipe')
  })

  test('affiche l’effectif de l’équipe avec les rôles', async () => {
    await render(<EquipeJoueurScreen myTeams={teams} getProgramsForTeam={() => []} isMobile={false} />)
    expect(container.textContent).toContain('Kenji')
    expect(container.textContent).toContain('Ralph')
    expect(container.textContent).toContain('Coach')
  })
})

describe('EquipeCoachScreen (vue coach / admin)', () => {
  const baseProps = {
    addManagedPlayer: jest.fn(), addingManagedPlayer: false, adminData: [], coachRosterData: [], coachTeamId: 't1',
    deleteManagedPlayer: jest.fn(), entryValue: '', equipeTab: 'perf', equipeTeamId: null, getProgramForDate: () => null,
    getProgramsForTeam: () => [], isAdmin: false, isMobile: false, leadershipTeams: teams, managedPlayerDraft: { prenom: '', nom: '', poste1: '' },
    managedPlayers: [], myTeamRoles: { t1: 'coach', t2: 'coach' }, openFiche: jest.fn(), renderProgrammeCatalog: () => null,
    saveMesureForPlayer: jest.fn(), setAddingManagedPlayer: jest.fn(), setCoachTeamId: jest.fn(), setEditingProg: jest.fn(),
    setEditingProgramId: jest.fn(), setEntryValue: jest.fn(), setEquipeTab: jest.fn(), setEquipeTeamId: jest.fn(),
    setManagedPlayerDraft: jest.fn(), setProgDraft: jest.fn(), setSuiviSelected: jest.fn(), suiviSelected: {},
    teamSeances: [], teams: [], unvalidateSeance: jest.fn(), validateSeances: jest.fn(),
  }

  test('coach sans équipe dirigée : message dédié', async () => {
    await render(<EquipeCoachScreen {...baseProps} leadershipTeams={[]} />)
    expect(container.textContent).toContain('Tu ne diriges aucune équipe')
  })

  test('affiche les onglets et les joueurs de l’équipe, y compris ceux sans compte', async () => {
    const coachRosterData = [{ user_id: 'u2', prenom: 'Kenji', nom: 'Lahib', role: 'joueur', kpis: { sprint30: 4.8 }, mesuresData: [] }]
    const managedPlayers = [{ user_id: 'ghost:m1', managed_player_id: 'm1', isManaged: true, prenom: 'Siriman', nom: 'Sissoko', role: 'joueur', kpis: {}, mesuresData: [] }]
    await render(<EquipeCoachScreen {...baseProps} coachRosterData={coachRosterData} managedPlayers={managedPlayers} />)
    const text = container.textContent
    expect(text).toContain('Performances')
    expect(text).toContain('Suivi')
    expect(text).toContain('Kenji')
    expect(text).toContain('Siriman')
  })

  test('changer d’équipe passe par setCoachTeamId et réinitialise l’édition de programme', async () => {
    const props = { ...baseProps, setCoachTeamId: jest.fn(), setEditingProg: jest.fn() }
    await render(<EquipeCoachScreen {...props} />)
    await act(async () => { buttonWithText('Mobambi').click() })
    expect(props.setCoachTeamId).toHaveBeenCalledWith('t2')
    expect(props.setEditingProg).toHaveBeenCalledWith(false)
  })
})
