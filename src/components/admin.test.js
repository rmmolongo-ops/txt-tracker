// Rendu React direct (sans Testing Library) : act() est nécessaire autour de root.render.
/* eslint-disable testing-library/no-unnecessary-act */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import AdminScreen from './AdminScreen'

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
// Saisie dans un champ contrôlé React (setter natif + événement input).
const typeIn = async (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  await act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })) })
}

const kenji = {
  user_id: 'u2', prenom: 'Kenji', nom: 'Lahib', surnom: 'KL', email: 'kenji@example.com', teams: [],
  nb_mesures: 2, nb_seances: 0, kpis: { sprint30: 4.8 },
  mesuresData: [
    { id: 'me1', kpi_id: 'sprint30', valeur: 5.0, date: '2026-09-01' },
    { id: 'me2', kpi_id: 'sprint30', valeur: 4.8, date: '2026-09-15' },
  ],
}

const baseProps = {
  addManagedPlayer: jest.fn(), addingManagedPlayer: false, adminData: [kenji], adminDeleteMesure: jest.fn(() => Promise.resolve(true)),
  adminError: null, adminLoading: false, adminManagedPlayers: [], adminView: 'overview', clubs: [{ id: 'c1', name: 'FO Plaisir' }],
  coachRosterData: [], createClub: jest.fn(() => Promise.resolve(true)), createTeam: jest.fn(() => Promise.resolve(true)),
  deleteClub: jest.fn(), deleteManagedPlayer: jest.fn(), deleteTeam: jest.fn(), deleteUserAccount: jest.fn(() => Promise.resolve(true)),
  isAdmin: true, isMobile: false, loadAdminData: jest.fn(), managedPlayerDraft: { prenom: '', nom: '', poste1: '' }, managedPlayers: [],
  openFiche: jest.fn(), renderProgrammeCatalog: () => null, resendConfirmation: jest.fn(() => Promise.resolve()), selectedAdminTeam: null,
  setAddingManagedPlayer: jest.fn(), setAdminView: jest.fn(), setEditingProg: jest.fn(), setEditingProgramId: jest.fn(),
  setManagedPlayerDraft: jest.fn(), setPlayerRole: jest.fn(), setProgDraft: jest.fn(), setSelectedAdminTeam: jest.fn(),
  shareInviteLink: jest.fn(), teams: [], togglePlayerTeam: jest.fn(), unconfirmedSignups: [], uploadTeamPhoto: jest.fn(), uploadingTeamPhoto: null,
}

test('vue d’ensemble : joueurs sans équipe listés', async () => {
  await render(<AdminScreen {...baseProps} />)
  expect(container.textContent).toContain('Sans équipe (1)')
  expect(container.textContent).toContain('Kenji')
})

test('créer une équipe : envoie le nom saisi puis vide le champ', async () => {
  const createTeam = jest.fn(() => Promise.resolve(true))
  await render(<AdminScreen {...baseProps} createTeam={createTeam} />)
  const input = container.querySelector('input[placeholder="Nom de l\'équipe..."]')
  await typeIn(input, '  U13 A  ')
  await act(async () => { buttonWithText('Créer').click() })
  expect(createTeam).toHaveBeenCalledWith('U13 A')
  expect(input.value).toBe('')
})

test('supprimer une saisie KPI depuis la carte joueur : confirmation puis appel à adminDeleteMesure', async () => {
  const adminDeleteMesure = jest.fn(() => Promise.resolve(true))
  await render(<AdminScreen {...baseProps} adminDeleteMesure={adminDeleteMesure} />)
  // Déplie la carte de Kenji
  const header = [...container.querySelectorAll('div')].find(d => d.style.cursor === 'pointer' && d.textContent.includes('Kenji'))
  await act(async () => { header.click() })
  expect(container.textContent).toContain('Saisies — Sprint 30m (2)')
  const trash = [...container.querySelectorAll('button[title="Supprimer cette saisie"]')]
  expect(trash).toHaveLength(2)
  await act(async () => { trash[0].click() })
  expect(adminDeleteMesure).not.toHaveBeenCalled()
  await act(async () => { buttonWithText('Supprimer').click() })
  expect(adminDeleteMesure).toHaveBeenCalledWith(kenji, 'me2') // la plus récente est en tête de liste
})

test('vue détail équipe : affiche l’équipe, et « Retour » revient à la vue d’ensemble', async () => {
  const team = { id: 't1', name: 'U12 B', color: '#3b82f6' }
  const setAdminView = jest.fn()
  const setSelectedAdminTeam = jest.fn()
  await render(<AdminScreen {...baseProps} adminView="team_detail" selectedAdminTeam={team} teams={[team]}
    setAdminView={setAdminView} setSelectedAdminTeam={setSelectedAdminTeam} />)
  expect(container.textContent).toContain('U12 B')
  expect(container.textContent).not.toContain('Sans équipe')
  await act(async () => { buttonWithText('Retour').click() })
  expect(setAdminView).toHaveBeenCalledWith('overview')
  expect(setSelectedAdminTeam).toHaveBeenCalledWith(null)
})
