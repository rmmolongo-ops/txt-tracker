// Rendu React direct (sans Testing Library) : act() est nécessaire autour de root.render.
/* eslint-disable testing-library/no-unnecessary-act */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import ChatScreen from './ChatScreen'
import BibliothequeScreen from './BibliothequeScreen'
import ProfilScreen from './ProfilScreen'
import KpiScreen from './KpiScreen'
import StatsScreen from './StatsScreen'
import SeancesScreen from './SeancesScreen'

const MESSAGES = [
  { id: 'msg1', team_id: 't1', user_id: 'u2', content: 'Entraînement à 18h', sender_prenom: 'Kenji', created_at: '2026-09-24T10:00:00Z' },
  { id: 'msg2', team_id: 't1', user_id: 'u1', content: 'Bien reçu', sender_prenom: 'Ralph', created_at: '2026-09-24T10:05:00Z' },
]

jest.mock('../lib/supabase', () => {
  const query = () => {
    const q = { select: () => q, eq: () => q, in: () => q, order: () => q, limit: () => Promise.resolve({ data: MESSAGES }), then: undefined }
    return q
  }
  const channel = { on: () => channel, subscribe: () => channel }
  return { supabase: { from: () => query(), channel: () => channel, removeChannel: () => {} } }
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

describe('ChatScreen', () => {
  const teams = [{ id: 't1', name: 'U12 B', color: '#3b82f6' }, { id: 't2', name: 'Mobambi', color: '#10b981' }]
  const baseProps = {
    user: { id: 'u1' }, profil: { prenom: 'Ralph' }, isAdmin: false, isMobile: false,
    unreadCounts: { t2: 3 }, markChatRead: jest.fn(), showToast: jest.fn(),
  }

  test('sans équipe : invite à rejoindre une équipe', async () => {
    await render(<ChatScreen {...baseProps} myTeams={[]} chatTeamId={null} onSelectTeam={jest.fn()} />)
    expect(container.textContent).toContain('Rejoins une équipe')
  })

  test('sélectionne la première équipe par défaut', async () => {
    const onSelectTeam = jest.fn()
    await render(<ChatScreen {...baseProps} myTeams={teams} chatTeamId={null} onSelectTeam={onSelectTeam} />)
    expect(onSelectTeam).toHaveBeenCalledWith('t1')
  })

  test('affiche les messages, marque le tchat lu et montre les non-lus des autres équipes', async () => {
    const markChatRead = jest.fn()
    await render(<ChatScreen {...baseProps} markChatRead={markChatRead} myTeams={teams} chatTeamId="t1" onSelectTeam={jest.fn()} />)
    expect(container.textContent).toContain('Entraînement à 18h')
    expect(container.textContent).toContain('Bien reçu')
    expect(markChatRead).toHaveBeenCalledWith('t1')
    expect(buttonWithText('Mobambi').textContent).toContain('3')
  })
})

describe('BibliothequeScreen', () => {
  test('liste les séances types et ouvre le formulaire de création', async () => {
    const templates = [{ id: 'tp1', label: 'Vitesse & appuis', icon: '⚡', color: '#f59e0b', duration: '1h', objectif: 'Explosivité', blocs: [] }]
    await render(<BibliothequeScreen user={{ id: 'u1' }} templates={templates} loading={false} setTemplates={jest.fn()} showToast={jest.fn()} />)
    expect(container.textContent).toContain('Vitesse & appuis')
    const createBtn = [...container.querySelectorAll('button')].find(b => /nouvelle|créer|\+/i.test(b.textContent))
    expect(createBtn).toBeDefined()
    await act(async () => { createBtn.click() })
    expect(container.querySelectorAll('input').length).toBeGreaterThan(0)
  })
})

describe('ProfilScreen', () => {
  const profil = { nom: 'Molongo', prenom: 'Ralph', surnom: 'RM', club: 'FO Plaisir', division: 'U12', poste1: 'Milieu', poste2: '', photo_url: '' }
  const props = {
    user: { id: 'u1' }, onSignOut: jest.fn(), profil, setProfil: jest.fn(), clubs: [{ id: 'c1', name: 'FO Plaisir' }],
    availableTeams: [{ id: 't1', name: 'U12 B', color: '#3b82f6' }], myTeamIds: new Set(['t1']), toggleMyTeam: jest.fn(),
    isStandalone: true, handleInstall: jest.fn(), isMobile: false, showToast: jest.fn(),
  }

  test('affiche le profil et passe en édition pré-remplie avec les infos actuelles', async () => {
    await render(<ProfilScreen {...props} />)
    expect(container.textContent).toContain('Ralph Molongo')
    expect(container.textContent).toContain('"RM"')
    await act(async () => { buttonWithText('Modifier').click() })
    const values = [...container.querySelectorAll('input')].map(i => i.value)
    expect(values).toEqual(expect.arrayContaining(['Molongo', 'Ralph', 'RM']))
  })

  test('rejoindre / quitter une équipe passe par toggleMyTeam', async () => {
    await render(<ProfilScreen {...props} />)
    await act(async () => { buttonWithText('U12 B').click() })
    expect(props.toggleMyTeam).toHaveBeenCalledWith('t1')
  })
})

describe('KpiScreen', () => {
  test('saisie d’une mesure : enregistre la valeur du KPI', async () => {
    const saveMesure = jest.fn()
    await render(<KpiScreen isMobile={false} inputValues={{ sprint30: '4.6' }} setInputValues={jest.fn()} getLatest={() => 4.9} saveMesure={saveMesure} />)
    expect(container.textContent).toContain('Sprint 30m')
    const saveBtn = container.querySelector('input[placeholder="Valeur en sec"]').parentElement.querySelector('button')
    await act(async () => { saveBtn.click() })
    expect(saveMesure).toHaveBeenCalledWith('sprint30', '4.6')
  })

  test('changer de catégorie affiche les KPIs techniques', async () => {
    await render(<KpiScreen isMobile={false} inputValues={{}} setInputValues={jest.fn()} getLatest={() => null} saveMesure={jest.fn()} />)
    expect(container.textContent).not.toContain('Jonglerie Gauche')
    await act(async () => { buttonWithText('Technique').click() })
    expect(container.textContent).toContain('Jonglerie Gauche')
  })
})

describe('StatsScreen', () => {
  const mesures = [
    { id: 'me1', kpi_id: 'sprint30', valeur: 5.0, date: '2026-09-01' },
    { id: 'me2', kpi_id: 'sprint30', valeur: 4.8, date: '2026-09-15' },
  ]
  const getMesuresForKpi = (id) => mesures.filter(m => m.kpi_id === id)

  test('suppression d’une mesure en deux temps (🗑️ puis confirmation)', async () => {
    const onDeleteMesure = jest.fn(() => Promise.resolve())
    await render(<StatsScreen isMobile={false} mesures={mesures} selectedKpi="sprint30" setSelectedKpi={jest.fn()}
      getLatest={() => 4.8} getMesuresForKpi={getMesuresForKpi} getProgress={() => '4.0'} onDeleteMesure={onDeleteMesure} />)
    expect(container.textContent).toContain('4.8 sec')
    const trash = [...container.querySelectorAll('button')].filter(b => b.textContent === '🗑️')
    expect(trash).toHaveLength(2)
    await act(async () => { trash[0].click() })
    expect(onDeleteMesure).not.toHaveBeenCalled()
    const confirm = [...container.querySelectorAll('button')].find(b => b.style.background === 'rgb(239, 68, 68)')
    await act(async () => { confirm.click() })
    expect(onDeleteMesure).toHaveBeenCalledTimes(1)
  })
})

describe('SeancesScreen', () => {
  test('sans programme d’équipe : programme perso de la semaine, validation d’une séance', async () => {
    const toggleSeance = jest.fn()
    await render(<SeancesScreen myTeams={[]} getProgramForDate={() => null} getProgramsForTeam={() => []} isSeanceDone={() => false} toggleSeance={toggleSeance} />)
    expect(container.textContent).toContain('LUN — Explosivité & Vitesse')
    await act(async () => { container.querySelector('[style*="cursor: pointer"]').click() })
    await act(async () => { buttonWithText('Valider cette séance').click() })
    expect(toggleSeance).toHaveBeenCalledWith('LUN')
  })
})
