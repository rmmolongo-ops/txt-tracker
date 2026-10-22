// Rendu React direct (sans Testing Library) : act() est nécessaire autour de root.render.
/* eslint-disable testing-library/no-unnecessary-act */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import Backoffice from './Backoffice'
import BackofficeUsers from './BackofficeUsers'

// Faux widget anti-robot : fournit un jeton, sauf si mockCaptchaOk est à false.
let mockCaptchaOk = true
jest.mock('../Turnstile', () => {
  const { useEffect } = require('react')
  return function MockTurnstile({ onToken }) {
    useEffect(() => { if (mockCaptchaOk) onToken('jeton-test') }, [onToken])
    return null
  }
})

// Fonctions simples (pas jest.fn) : la config CRA remet les mocks à zéro entre les tests.
let mockIsAdmin = false
const mockDeleted = []
const mockResends = []
const mockUsers = [
  { user_id: 'moi', email: 'ralph@test.fr', prenom: 'Ralph', nom: 'M', created_at: '2026-06-10', email_confirmed_at: '2026-06-10', last_sign_in_at: '2026-10-20', provider: 'email', is_super_admin: true, equipes: [], clubs: [], nb_mesures: 3 },
  { user_id: 'u2', email: 'joueur@test.fr', prenom: 'Léo', nom: 'K', created_at: '2026-10-01', email_confirmed_at: null, last_sign_in_at: null, provider: 'email', is_super_admin: false, equipes: [], clubs: [], nb_mesures: 0 },
  { user_id: 'u3', email: 'coach@test.fr', prenom: 'Sam', nom: 'D', created_at: '2026-09-01', email_confirmed_at: '2026-09-01', last_sign_in_at: '2026-10-19', provider: 'google', is_super_admin: false,
    equipes: [{ team: 'U12 B', club: 'FO Plaisir', role: 'coach' }, { team: 'U14', club: 'AS Meudon', role: 'joueur' }], clubs: [], nb_mesures: 5 },
]
jest.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (name, args) => {
      if (name === 'is_super_admin') return Promise.resolve({ data: mockIsAdmin })
      if (name === 'backoffice_users') return Promise.resolve({ data: mockUsers })
      if (name === 'backoffice_clubs') return Promise.resolve({ data: [] })
      if (name === 'backoffice_stats') return Promise.resolve({ data: { totaux: {}, semaines: [] } })
      if (name === 'delete_user_as_admin') { mockDeleted.push(args.target_user_id); return Promise.resolve({ error: null }) }
      return Promise.resolve({ data: null })
    },
    // Demandes de suppression de compte : Léo (u2) en a déposé une.
    from: () => ({ select: () => Promise.resolve({ data: [{ user_id: 'u2', reason: 'Je quitte le club', requested_at: '2026-10-21T08:00:00Z' }] }) }),
    auth: { resend: (args) => { mockResends.push(args); return Promise.resolve({ error: null }) } },
  },
}))

let container, root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  mockDeleted.length = 0
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const render = async (el) => { await act(async () => { root.render(el) }) }
const buttonWithText = (txt) => [...container.querySelectorAll('button')].find(b => b.textContent.includes(txt))

test('un compte qui n’est pas super admin voit « Accès refusé », sans aucune donnée', async () => {
  mockIsAdmin = false
  await render(<Backoffice user={{ id: 'u2', email: 'joueur@test.fr' }} onSignOut={jest.fn()} />)
  expect(container.textContent).toContain('Accès refusé')
  expect(container.textContent).not.toContain('Comptes')
})

test('le super admin voit les sections du back-office', async () => {
  mockIsAdmin = true
  await render(<Backoffice user={{ id: 'moi', email: 'ralph@test.fr' }} onSignOut={jest.fn()} />)
  ;["Vue d'ensemble", 'Comptes', 'Statistiques', 'Signalements', 'Erreurs'].forEach(t => expect(buttonWithText(t)).toBeDefined())
})

test('comptes : les demandes de suppression sont signalées et filtrables, avec la raison', async () => {
  await render(<BackofficeUsers currentUserId="moi" />)
  await act(async () => { buttonWithText('Suppression demandée (1)').click() })
  expect(container.textContent).toContain('joueur@test.fr')
  expect(container.textContent).not.toContain('coach@test.fr')
  expect(container.textContent).toContain('Je quitte le club')
})

test('comptes : filtres non confirmés / plusieurs clubs, et pas de suppression de son propre compte', async () => {
  await render(<BackofficeUsers currentUserId="moi" />)
  expect(container.textContent).toContain('Comptes (3/3)')
  expect(buttonWithText('Relancer l')).toBeDefined()
  expect([...container.querySelectorAll('button')].filter(b => b.textContent === 'Supprimer')).toHaveLength(2)

  await act(async () => { buttonWithText('Email non confirmé').click() })
  expect(container.textContent).toContain('joueur@test.fr')
  expect(container.textContent).not.toContain('coach@test.fr')

  await act(async () => { buttonWithText('Plusieurs clubs').click() })
  expect(container.textContent).toContain('coach@test.fr')
  expect(container.textContent).toContain('Présent dans plusieurs clubs')
})

test('suppression : rien sans confirmation, puis le compte disparaît de la liste', async () => {
  await render(<BackofficeUsers currentUserId="moi" />)
  const supprimer = () => [...container.querySelectorAll('button')].filter(b => b.textContent === 'Supprimer')
  await act(async () => { supprimer()[0].click() })
  expect(mockDeleted).toHaveLength(0)
  expect(container.textContent).toContain('irréversible')

  await act(async () => { buttonWithText('Supprimer définitivement').click() })
  expect(mockDeleted).toEqual(['u2'])
  expect(container.textContent).not.toContain('joueur@test.fr (')
  expect(container.textContent).toContain('Comptes (2/2)')
})

test('relance : aucune vérification affichée avant le clic, puis l’email part avec le jeton anti-robot', async () => {
  mockResends.length = 0
  mockCaptchaOk = true
  await render(<BackofficeUsers currentUserId="moi" />)
  expect(mockResends).toHaveLength(0)
  await act(async () => { buttonWithText('Relancer l').click() })
  expect(mockResends).toHaveLength(1)
  expect(mockResends[0]).toMatchObject({ type: 'signup', email: 'joueur@test.fr', options: { captchaToken: 'jeton-test' } })
  expect(container.textContent).toContain('Email de confirmation renvoyé à joueur@test.fr')
})
