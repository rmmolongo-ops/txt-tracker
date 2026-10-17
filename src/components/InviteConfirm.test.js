// Rendu React direct (sans Testing Library) : act() est nécessaire autour de root.render.
/* eslint-disable testing-library/no-unnecessary-act */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import InviteConfirm from './InviteConfirm'

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

const invite = { kind: 'club', code: 'abc', label: 'FOP U18 F (FO Plaisir)', roleLabel: 'coach' }

test("affiche l'équipe, le rôle du lien et le compte qui va le recevoir", async () => {
  await render(<InviteConfirm invite={invite} email="ralph.molongo@gmail.com" onConfirm={jest.fn()} onCancel={jest.fn()} onSwitchAccount={jest.fn()} />)
  expect(container.textContent).toContain('FOP U18 F (FO Plaisir)')
  expect(container.textContent).toContain('coach')
  expect(container.querySelector('[data-testid="invite-account"]').textContent).toBe('ralph.molongo@gmail.com')
})

test('les trois choix appellent chacun leur action, sans rien attribuer avant la confirmation', async () => {
  const onConfirm = jest.fn(), onCancel = jest.fn(), onSwitchAccount = jest.fn()
  await render(<InviteConfirm invite={invite} email="a@b.fr" onConfirm={onConfirm} onCancel={onCancel} onSwitchAccount={onSwitchAccount} />)
  expect(onConfirm).not.toHaveBeenCalled()

  await act(async () => { buttonWithText('Utiliser un autre compte').click() })
  expect(onSwitchAccount).toHaveBeenCalledTimes(1)
  await act(async () => { buttonWithText('Annuler').click() })
  expect(onCancel).toHaveBeenCalledTimes(1)
  await act(async () => { buttonWithText('Rejoindre avec ce compte').click() })
  expect(onConfirm).toHaveBeenCalledTimes(1)
})

test('pendant le traitement, les boutons sont désactivés', async () => {
  await render(<InviteConfirm invite={invite} email="a@b.fr" busy onConfirm={jest.fn()} onCancel={jest.fn()} onSwitchAccount={jest.fn()} />)
  expect(buttonWithText('Rejoindre avec ce compte').disabled).toBe(true)
  expect(buttonWithText('Annuler').disabled).toBe(true)
})
