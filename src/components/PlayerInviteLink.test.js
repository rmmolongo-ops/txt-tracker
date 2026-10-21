// Rendu React direct (sans Testing Library) : act() est nécessaire autour de root.render.
/* eslint-disable testing-library/no-unnecessary-act */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import PlayerInviteLink from './PlayerInviteLink'

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

test("partager envoie le lien de l'équipe", async () => {
  const onShare = jest.fn()
  await render(<PlayerInviteLink teamId="t1" teamName="U12 B" onShare={onShare} onRegenerate={jest.fn()} />)
  expect(container.textContent).toContain('U12 B')
  await act(async () => { buttonWithText('Partager le lien').click() })
  expect(onShare).toHaveBeenCalledWith('t1', 'U12 B')
})

test("renouveler demande une confirmation avant d'invalider l'ancien lien", async () => {
  const onRegenerate = jest.fn(() => Promise.resolve(true))
  await render(<PlayerInviteLink teamId="t1" teamName="U12 B" onShare={jest.fn()} onRegenerate={onRegenerate} />)

  await act(async () => { buttonWithText('Renouveler').click() })
  expect(onRegenerate).not.toHaveBeenCalled()
  expect(container.textContent).toContain("L'ancien lien ne fonctionnera plus")

  await act(async () => { buttonWithText('Annuler').click() })
  expect(onRegenerate).not.toHaveBeenCalled()

  await act(async () => { buttonWithText('Renouveler').click() })
  await act(async () => { buttonWithText('Renouveler le lien').click() })
  expect(onRegenerate).toHaveBeenCalledWith('t1')
  expect(buttonWithText('Partager le lien')).toBeDefined()
})
