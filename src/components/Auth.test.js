// Rendu React direct (sans Testing Library) : act() est nécessaire autour de root.render.
/* eslint-disable testing-library/no-unnecessary-act */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import Auth from './Auth'

jest.mock('../lib/supabase', () => {
  const tables = {
    clubs: [{ id: 'c1', name: 'FO Plaisir' }, { id: 'c2', name: 'AS Meudon' }],
    teams: [{ id: 't1', name: 'U12 B', club_id: 'c1' }, { id: 't2', name: 'U14', club_id: 'c2' }],
  }
  const query = (table) => ({ select: () => ({ order: () => Promise.resolve({ data: tables[table] || [] }) }) })
  // Fonction simple (pas jest.fn) : la config CRA remet les mocks à zéro entre les tests.
  const staffRoles = { 'bon-code': 'coach', 'code-dirigeant': 'dirigeant', 'code-admin': 'admin' }
  const rpc = (name, args) => Promise.resolve({ data: name === 'get_club_invite_info' && staffRoles[args.p_code] ? [{ club_id: 'c1', club_name: 'FO Plaisir', role: staffRoles[args.p_code] }] : [] })
  return { supabase: { from: query, rpc, auth: { signUp: jest.fn(() => Promise.resolve({ error: null })), signInWithPassword: jest.fn(), signInWithOAuth: jest.fn() } } }
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
const selectValue = (select, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set
  setter.call(select, value); select.dispatchEvent(new Event('change', { bubbles: true }))
}

test('inscription : liens légaux présents, et la case CGU doit être cochée pour créer le compte', async () => {
  const { supabase } = require('../lib/supabase')
  await render(<Auth />)
  await act(async () => { buttonWithText('Inscription').click() })

  expect(container.querySelector('a[href="/legal/cgu.html"]')).not.toBeNull()
  expect(container.querySelector('a[href="/legal/confidentialite.html"]')).not.toBeNull()

  await act(async () => { typeIn(container.querySelector('input[type="email"]'), 'joueur@test.fr') })
  await act(async () => { typeIn(container.querySelector('input[type="password"]'), 'Motdepasse1!') })
  await act(async () => { typeIn(container.querySelector('input[placeholder="Nom"]'), 'Dupont') })
  await act(async () => { typeIn(container.querySelector('input[placeholder="Prénom"]'), 'Jean') })
  await act(async () => { typeIn(container.querySelector('input[placeholder="Ex: Milieu Gauche"]'), 'Attaquant') })
  const selects = container.querySelectorAll('select')
  await act(async () => { selectValue(selects[0], 'FO Plaisir') })
  await act(async () => { selectValue(selects[1], 't1') })

  await act(async () => { buttonWithText('Créer mon compte').click() })
  expect(container.textContent).toContain("Merci d'accepter les CGU")
  expect(supabase.auth.signUp).not.toHaveBeenCalled()

  await act(async () => { container.querySelector('input[type="checkbox"]').click() })
  await act(async () => { buttonWithText('Créer mon compte').click() })
  expect(supabase.auth.signUp).toHaveBeenCalledTimes(1)
})

const teamOptions = () => [...container.querySelectorAll('select')[1].querySelectorAll('option')].filter(o => o.value).map(o => o.value)

test("inscription : l'équipe n'est proposée qu'après le choix du club, et seulement celles de ce club", async () => {
  await render(<Auth />)
  await act(async () => { buttonWithText('Inscription').click() })
  const equipeSelect = () => container.querySelectorAll('select')[1]

  expect(equipeSelect().disabled).toBe(true)
  expect(teamOptions()).toEqual([])

  await act(async () => { selectValue(container.querySelectorAll('select')[0], 'FO Plaisir') })
  expect(equipeSelect().disabled).toBe(false)
  expect(teamOptions()).toEqual(['t1'])

  await act(async () => { selectValue(equipeSelect(), 't1') })
  await act(async () => { selectValue(container.querySelectorAll('select')[0], 'AS Meudon') })
  expect(teamOptions()).toEqual(['t2'])
  expect(equipeSelect().value).toBe('')
})

test("invitation d'équipe : club et équipe sont fixés par le lien et ne peuvent pas être changés", async () => {
  const { supabase } = require('../lib/supabase')
  supabase.auth.signUp.mockClear()
  await render(<Auth inviteTeamId="t1" />)

  expect(container.querySelectorAll('select').length).toBe(0)
  expect(container.querySelector('[data-testid="club-locked"]').textContent).toContain('FO Plaisir')
  expect(container.querySelector('[data-testid="team-locked"]').textContent).toContain('U12 B')

  await act(async () => { typeIn(container.querySelector('input[type="email"]'), 'joueur@test.fr') })
  await act(async () => { typeIn(container.querySelector('input[type="password"]'), 'Motdepasse1!') })
  await act(async () => { typeIn(container.querySelector('input[placeholder="Nom"]'), 'Dupont') })
  await act(async () => { typeIn(container.querySelector('input[placeholder="Prénom"]'), 'Jean') })
  await act(async () => { typeIn(container.querySelector('input[placeholder="Ex: Milieu Gauche"]'), 'Attaquant') })
  await act(async () => { container.querySelector('input[type="checkbox"]').click() })
  await act(async () => { buttonWithText('Créer mon compte').click() })

  expect(supabase.auth.signUp).toHaveBeenCalledTimes(1)
  const { options } = supabase.auth.signUp.mock.calls[0][0]
  expect(options.data).toMatchObject({ club: 'FO Plaisir', equipe: 't1' })
})

test("invitation staff : le club du lien est fixé, l'équipe reste optionnelle parmi les équipes de ce club", async () => {
  await render(<Auth clubInviteCode="bon-code" />)

  expect(container.querySelector('[data-testid="club-locked"]').textContent).toContain('FO Plaisir')
  expect(container.textContent).toContain('en tant que coach')
  expect(container.querySelectorAll('select').length).toBe(1)
  expect(container.querySelector('select').disabled).toBe(false)
  expect([...container.querySelector('select').querySelectorAll('option')].filter(o => o.value).map(o => o.value)).toEqual(['t1'])
})

test("invitation coach : le poste n'est pas obligatoire pour créer le compte", async () => {
  const { supabase } = require('../lib/supabase')
  supabase.auth.signUp.mockClear()
  await render(<Auth clubInviteCode="bon-code" />)
  expect(container.textContent).toContain('Poste 1 (optionnel)')

  await act(async () => { typeIn(container.querySelector('input[type="email"]'), 'coach@test.fr') })
  await act(async () => { typeIn(container.querySelector('input[type="password"]'), 'Motdepasse1!') })
  await act(async () => { typeIn(container.querySelector('input[placeholder="Nom"]'), 'Martin') })
  await act(async () => { typeIn(container.querySelector('input[placeholder="Prénom"]'), 'Paul') })
  await act(async () => { container.querySelector('input[type="checkbox"]').click() })
  await act(async () => { buttonWithText('Créer mon compte').click() })

  expect(supabase.auth.signUp).toHaveBeenCalledTimes(1)
  expect(supabase.auth.signUp.mock.calls[0][0].options.data).toMatchObject({ club: 'FO Plaisir', poste1: '' })
})

test("invitation dirigeant ou administrateur : le poste est aussi facultatif", async () => {
  await render(<Auth clubInviteCode="code-dirigeant" />)
  expect(container.textContent).toContain('Poste 1 (optionnel)')
  await render(<Auth clubInviteCode="code-admin" key="admin" />)
  expect(container.textContent).toContain('Poste 1 (optionnel)')
})

test("inscription joueur : le poste reste obligatoire", async () => {
  const { supabase } = require('../lib/supabase')
  supabase.auth.signUp.mockClear()
  await render(<Auth inviteTeamId="t1" />)
  expect(container.textContent).not.toContain('(optionnel)')

  await act(async () => { typeIn(container.querySelector('input[type="email"]'), 'joueur@test.fr') })
  await act(async () => { typeIn(container.querySelector('input[type="password"]'), 'Motdepasse1!') })
  await act(async () => { typeIn(container.querySelector('input[placeholder="Nom"]'), 'Dupont') })
  await act(async () => { typeIn(container.querySelector('input[placeholder="Prénom"]'), 'Jean') })
  await act(async () => { container.querySelector('input[type="checkbox"]').click() })
  await act(async () => { buttonWithText('Créer mon compte').click() })
  expect(supabase.auth.signUp).not.toHaveBeenCalled()
})

test("lien d'invitation invalide ou expiré : message d'erreur et formulaire d'inscription normal", async () => {
  await render(<Auth clubInviteCode="code-expire" />)
  expect(container.textContent).toContain("n'est plus valide")
  expect(container.querySelector('[data-testid="club-locked"]')).toBeNull()
  expect(container.querySelectorAll('select').length).toBe(2)

  await act(async () => root.unmount())
  root = createRoot(container)
  await render(<Auth inviteTeamId="equipe-inconnue" />)
  expect(container.textContent).toContain("n'est plus valide")
  expect(container.querySelector('[data-testid="team-locked"]')).toBeNull()
  expect(container.querySelectorAll('select').length).toBe(2)
})
