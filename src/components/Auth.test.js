// Rendu React direct (sans Testing Library) : act() est nécessaire autour de root.render.
/* eslint-disable testing-library/no-unnecessary-act */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import Auth from './Auth'

// La page d'inscription ne lit aucune table : seulement les fonctions d'information d'un lien.
// Fonctions simples (pas jest.fn) : la config CRA remet les mocks à zéro entre les tests.
jest.mock('../lib/supabase', () => {
  const teamInvites = { t1: { team_name: 'U12 B', club_name: 'FO Plaisir' } }
  const clubInvites = {
    'code-coach': { club_id: 'c1', club_name: 'FO Plaisir', role: 'coach', team_id: 't1', team_name: 'U12 B' },
    'code-dirigeant': { club_id: 'c1', club_name: 'FO Plaisir', role: 'dirigeant', team_id: 't1', team_name: 'U12 B' },
    'code-admin': { club_id: 'c1', club_name: 'FO Plaisir', role: 'admin', team_id: null, team_name: null },
  }
  const rpc = (name, args) => {
    const row = name === 'get_team_invite_info' ? teamInvites[args.p_team_id] : name === 'get_club_invite_info' ? clubInvites[args.p_code] : null
    return Promise.resolve({ data: row ? [row] : [] })
  }
  const forbidden = () => { throw new Error('La page d’inscription ne doit lire aucune table') }
  return { supabase: { from: forbidden, rpc, auth: { signUp: jest.fn(() => Promise.resolve({ error: null })), signInWithPassword: jest.fn(), signInWithOAuth: jest.fn() } } }
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
const typeIn = (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true }))
}
const fillAccount = async ({ poste = true } = {}) => {
  await act(async () => { typeIn(container.querySelector('input[type="email"]'), 'nouveau@test.fr') })
  await act(async () => { typeIn(container.querySelector('input[type="password"]'), 'Motdepasse1!') })
  await act(async () => { typeIn(container.querySelector('input[placeholder="Nom"]'), 'Dupont') })
  await act(async () => { typeIn(container.querySelector('input[placeholder="Prénom"]'), 'Jean') })
  if (poste) await act(async () => { typeIn(container.querySelector('input[placeholder="Ex: Milieu Gauche"]'), 'Attaquant') })
  await act(async () => { container.querySelector('input[type="checkbox"]').click() })
}

test('sans lien : connexion seulement, aucune inscription libre ni aucun club ou équipe proposé', async () => {
  await render(<Auth />)
  expect(container.textContent).toContain("L'inscription se fait sur invitation")
  expect(buttonWithText('Inscription')).toBeUndefined()
  expect(container.querySelectorAll('select').length).toBe(0)
  expect(container.querySelector('input[placeholder="Nom"]')).toBeNull()
  expect(buttonWithText('Se connecter')).toBeDefined()
})

test("lien d'équipe (joueur) : club et équipe viennent du lien, sans aucun menu de choix", async () => {
  const { supabase } = require('../lib/supabase')
  supabase.auth.signUp.mockClear()
  await render(<Auth inviteTeamId="t1" />)

  expect(container.querySelectorAll('select').length).toBe(0)
  expect(container.querySelector('[data-testid="club-locked"]').textContent).toContain('FO Plaisir')
  expect(container.querySelector('[data-testid="team-locked"]').textContent).toContain('U12 B')
  expect(container.textContent).toContain('Profil joueur')

  await fillAccount()
  await act(async () => { buttonWithText('Créer mon compte').click() })
  expect(supabase.auth.signUp).toHaveBeenCalledTimes(1)
  expect(supabase.auth.signUp.mock.calls[0][0].options.data).toMatchObject({ club: 'FO Plaisir', equipe: 't1', poste1: 'Attaquant', club_invite: '' })
})

test('lien joueur : le poste reste obligatoire', async () => {
  const { supabase } = require('../lib/supabase')
  supabase.auth.signUp.mockClear()
  await render(<Auth inviteTeamId="t1" />)
  expect(container.textContent).not.toContain('(optionnel)')
  await fillAccount({ poste: false })
  await act(async () => { buttonWithText('Créer mon compte').click() })
  expect(supabase.auth.signUp).not.toHaveBeenCalled()
})

test('lien staff coach : club ET équipe fixés par le lien, poste facultatif, jamais inscrit comme simple joueur', async () => {
  const { supabase } = require('../lib/supabase')
  supabase.auth.signUp.mockClear()
  await render(<Auth clubInviteCode="code-coach" />)

  expect(container.querySelectorAll('select').length).toBe(0)
  expect(container.querySelector('[data-testid="club-locked"]').textContent).toContain('FO Plaisir')
  expect(container.querySelector('[data-testid="team-locked"]').textContent).toContain('U12 B')
  expect(container.textContent).toContain('en tant que coach')
  expect(container.textContent).toContain('Poste 1 (optionnel)')

  await fillAccount({ poste: false })
  await act(async () => { buttonWithText('Créer mon compte').click() })
  expect(supabase.auth.signUp).toHaveBeenCalledTimes(1)
  expect(supabase.auth.signUp.mock.calls[0][0].options.data).toMatchObject({ club: 'FO Plaisir', equipe: '', poste1: '', club_invite: 'code-coach' })
})

test('lien dirigeant ou administrateur : poste facultatif, et un lien administrateur ne cible aucune équipe', async () => {
  await render(<Auth clubInviteCode="code-dirigeant" />)
  expect(container.textContent).toContain('Poste 1 (optionnel)')
  expect(container.querySelector('[data-testid="team-locked"]')).not.toBeNull()

  await render(<Auth clubInviteCode="code-admin" key="admin" />)
  expect(container.textContent).toContain('Poste 1 (optionnel)')
  expect(container.textContent).toContain('en tant que administrateur')
  expect(container.querySelector('[data-testid="club-locked"]')).not.toBeNull()
  expect(container.querySelector('[data-testid="team-locked"]')).toBeNull()
})

test("lien invalide ou expiré : message d'erreur, pas d'inscription, connexion toujours possible", async () => {
  await render(<Auth clubInviteCode="code-expire" />)
  expect(container.textContent).toContain("n'est plus valide")
  expect(container.querySelector('input[placeholder="Nom"]')).toBeNull()
  expect(buttonWithText('Inscription')).toBeUndefined()
  expect(buttonWithText('Se connecter')).toBeDefined()

  await render(<Auth inviteTeamId="equipe-inconnue" key="team" />)
  expect(container.textContent).toContain("n'est plus valide")
  expect(container.querySelector('input[placeholder="Nom"]')).toBeNull()
})
