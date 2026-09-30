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
  return { supabase: { from: query, auth: { signUp: jest.fn(() => Promise.resolve({ error: null })), signInWithPassword: jest.fn(), signInWithOAuth: jest.fn() } } }
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

test("invitation d'équipe : le club de l'équipe est présélectionné et l'équipe reste choisie", async () => {
  await render(<Auth inviteTeamId="t1" />)
  const selects = container.querySelectorAll('select')
  expect(selects[0].value).toBe('FO Plaisir')
  expect(teamOptions()).toEqual(['t1'])
  expect(selects[1].value).toBe('t1')
})
