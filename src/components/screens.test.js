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
import { toDateStr } from '../lib/stats'
import { dayCodeOf } from '../lib/planning'

const MESSAGES = [
  { id: 'msg1', team_id: 't1', user_id: 'u2', content: 'Entraînement à 18h', sender_prenom: 'Kenji', created_at: '2026-09-24T10:00:00Z' },
  { id: 'msg2', team_id: 't1', user_id: 'u1', content: 'Bien reçu', sender_prenom: 'Ralph', created_at: '2026-09-24T10:05:00Z' },
]

// Fonctions simples (pas jest.fn) : la config CRA remet les mocks à zéro entre les tests.
const mockRpcCalls = []
const mockInserts = []
jest.mock('../lib/supabase', () => {
  const query = (table) => {
    const rows = table === 'team_messages' ? MESSAGES : []
    const q = {
      select: () => q, eq: () => q, in: () => q, order: () => q, delete: () => q,
      limit: () => Promise.resolve({ data: rows }),
      maybeSingle: () => Promise.resolve({ data: null }),
      single: () => Promise.resolve({ data: { requested_at: '2026-10-22T10:00:00Z', reason: '' } }),
      insert: (row) => { mockInserts.push({ table, row }); return q },
      then: undefined,
    }
    return q
  }
  const channel = { on: () => channel, subscribe: () => channel }
  return { supabase: {
    from: (table) => query(table), channel: () => channel, removeChannel: () => {},
    rpc: (name, args) => { mockRpcCalls.push({ name, args }); return Promise.resolve({ data: 'r1', error: null }) },
  } }
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

  test('signalement : seulement sur le message des autres, avec un motif, envoyé au staff', async () => {
    mockRpcCalls.length = 0
    const showToast = jest.fn()
    await render(<ChatScreen {...baseProps} showToast={showToast} myTeams={teams} chatTeamId="t1" onSelectTeam={jest.fn()} />)
    const reportButtons = [...container.querySelectorAll('button')].filter(b => b.getAttribute('aria-label') === 'Signaler ce message')
    expect(reportButtons).toHaveLength(1) // le message de Kenji, pas le mien
    await act(async () => { reportButtons[0].click() })
    expect(container.textContent).toContain("L'auteur du message ne saura pas qui l'a signalé")
    const reason = container.querySelector('textarea[aria-label="Motif du signalement"]')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
    await act(async () => { setter.call(reason, 'Insulte'); reason.dispatchEvent(new Event('input', { bubbles: true })) })
    await act(async () => { buttonWithText('Envoyer le signalement').click() })
    expect(mockRpcCalls).toContainEqual({ name: 'report_message', args: { p_message_id: 'msg1', p_reason: 'Insulte' } })
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('signalé'))
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
    availableTeams: [{ id: 't1', name: 'U12 B', color: '#3b82f6', club_id: 'c1' }, { id: 't2', name: 'U14', color: '#10b981', club_id: 'c1' }], myTeamIds: new Set(['t1']), myTeamRoles: { t1: 'joueur' }, createClubInvite: jest.fn(),
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

  test('apparence : propose Sombre / Clair / Automatique et signale le choix', async () => {
    const onThemeChange = jest.fn()
    await render(<ProfilScreen {...props} theme="dark" onThemeChange={onThemeChange} />)
    expect(container.textContent).toContain('Apparence')
    expect(buttonWithText('Sombre').getAttribute('aria-pressed')).toBe('true')
    expect(buttonWithText('Clair').getAttribute('aria-pressed')).toBe('false')
    await act(async () => { buttonWithText('Clair').click() })
    expect(onThemeChange).toHaveBeenCalledWith('light')
    await act(async () => { buttonWithText('Automatique').click() })
    expect(onThemeChange).toHaveBeenCalledWith('system')
  })

  test("cloisonnement : « Mes équipes » ne liste que les équipes de l'utilisateur, sans pouvoir en rejoindre d'autres", async () => {
    await render(<ProfilScreen {...props} />)
    expect(container.textContent).toContain('U12 B')
    expect(container.textContent).not.toContain('U14')
    expect(buttonWithText('U12 B')).toBeUndefined()
  })

  test("invitation staff : un joueur n'a pas la carte, un coach d'équipe invite pour son équipe seulement", async () => {
    await render(<ProfilScreen {...props} />)
    expect(container.textContent).not.toContain('INVITER UN MEMBRE DU STAFF')

    const createClubInvite = jest.fn()
    await render(<ProfilScreen {...props} myTeamRoles={{ t1: 'coach' }} createClubInvite={createClubInvite} />)
    expect(container.textContent).toContain('INVITER UN MEMBRE DU STAFF')
    expect(container.textContent).toContain("l'équipe U12 B")
    await act(async () => { buttonWithText('Générer le lien').click() })
    expect(createClubInvite).toHaveBeenCalledWith('c1', 'coach', null, 't1')
  })

  test('suppression du compte : demande confirmée puis enregistrée, annulable', async () => {
    mockInserts.length = 0
    await render(<ProfilScreen {...props} />)
    await act(async () => { buttonWithText('Demander la suppression de mon compte').click() })
    expect(container.textContent).toContain('définitivement effacés')
    expect(mockInserts).toHaveLength(0)
    await act(async () => { buttonWithText('Confirmer la demande').click() })
    expect(mockInserts).toEqual([{ table: 'account_deletion_requests', row: { user_id: 'u1', reason: '' } }])
    expect(container.textContent).toContain('Suppression demandée le')
    expect(buttonWithText('Annuler ma demande')).toBeDefined()
  })

  test('profil incomplet (ex : inscription Google) : s’ouvre directement en édition avec un message d’accueil', async () => {
    const incompleteProfil = { nom: 'Kiluanzi', prenom: 'Léo', surnom: '', club: '', division: '', poste1: '', poste2: '', photo_url: '' }
    await render(<ProfilScreen {...props} profil={incompleteProfil} />)
    expect(container.textContent).toContain('Complète ton profil')
    const values = [...container.querySelectorAll('input')].map(i => i.value)
    expect(values).toEqual(expect.arrayContaining(['Kiluanzi', 'Léo']))
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

  test('suppression d’une mesure en deux temps (icône corbeille puis confirmation)', async () => {
    const onDeleteMesure = jest.fn(() => Promise.resolve())
    await render(<StatsScreen isMobile={false} mesures={mesures} selectedKpi="sprint30" setSelectedKpi={jest.fn()}
      getLatest={() => 4.8} getMesuresForKpi={getMesuresForKpi} getProgress={() => '4.0'} onDeleteMesure={onDeleteMesure} />)
    expect(container.textContent).toContain('4.8 sec')
    const trash = [...container.querySelectorAll('button')].filter(b => b.getAttribute('aria-label') === 'Supprimer cette mesure')
    expect(trash).toHaveLength(2)
    await act(async () => { trash[0].click() })
    expect(onDeleteMesure).not.toHaveBeenCalled()
    const confirm = [...container.querySelectorAll('button')].find(b => b.style.background === 'rgb(239, 68, 68)')
    await act(async () => { confirm.click() })
    expect(onDeleteMesure).toHaveBeenCalledTimes(1)
  })
})

describe('SeancesScreen', () => {
  const team = { id: 't1', name: 'U15 A' }
  const today = toDateStr(new Date())

  test('rien de planifié : message d’attente, plus de programme codé en dur', async () => {
    await render(<SeancesScreen myTeams={[team]} getProgramForDate={() => null} getProgramsForTeam={() => []} isSeanceDone={() => false} toggleSeance={jest.fn()} />)
    expect(container.textContent).toContain('Rien de prévu pour le moment')
    expect(container.textContent).not.toContain('Explosivité')
  })

  test('sans équipe : invite à en rejoindre une', async () => {
    await render(<SeancesScreen myTeams={[]} getProgramForDate={() => null} getProgramsForTeam={() => []} isSeanceDone={() => false} toggleSeance={jest.fn()} />)
    expect(container.textContent).toContain('Rejoins une équipe')
  })

  test('entraînement du calendrier du coach : affiché dans la semaine et validable pour l’équipe', async () => {
    const toggleSeance = jest.fn()
    const events = [{ id: 'e1', team_id: 't1', date: today, type: 'entrainement', label: 'Jeu de passes', duration: '1h30', objectif: 'Conserver', blocs: [{ titre: 'Rondo', duree: '15 min', exercices: ['4 contre 2'] }] }]
    await render(<SeancesScreen myTeams={[team]} events={events} getProgramForDate={() => null} getProgramsForTeam={() => []} isSeanceDone={() => false} toggleSeance={toggleSeance} />)
    expect(container.textContent).toContain('Jeu de passes')
    expect(container.textContent).toContain('Calendrier')
    await act(async () => { container.querySelector('[role="button"]').click() })
    expect(container.textContent).toContain('4 contre 2')
    await act(async () => { buttonWithText('Valider cette séance').click() })
    expect(toggleSeance).toHaveBeenCalledWith(dayCodeOf(today), today, 't1')
  })

  test('match du calendrier : affiché pour information, sans bouton de validation', async () => {
    const events = [{ id: 'm1', team_id: 't1', date: today, type: 'match', label: 'Match vs Clamart', blocs: [] }]
    await render(<SeancesScreen myTeams={[team]} events={events} getProgramForDate={() => null} getProgramsForTeam={() => []} isSeanceDone={() => false} toggleSeance={jest.fn()} />)
    expect(container.textContent).toContain('Match vs Clamart')
    expect(container.querySelector('[role="button"]')).toBeNull()
  })
})
