// Rendu React direct (sans Testing Library) : act() est nécessaire autour de root.render.
/* eslint-disable testing-library/no-unnecessary-act */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import ErrorBoundary from './ErrorBoundary'

let container, root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  console.error.mockRestore()
})

const Boom = () => { throw new Error('écran cassé') }

test("affiche l'écran normalement quand il n'y a pas d'erreur", async () => {
  await act(async () => { root.render(<ErrorBoundary onError={jest.fn()}><div>Accueil</div></ErrorBoundary>) })
  expect(container.textContent).toBe('Accueil')
})

test('un écran qui plante affiche le message de secours et signale l’erreur', async () => {
  const onError = jest.fn()
  await act(async () => { root.render(<ErrorBoundary onError={onError}><Boom /></ErrorBoundary>) })
  expect(container.textContent).toContain('Un problème est survenu')
  expect(container.textContent).toContain("Recharger l'appli")
  expect(onError).toHaveBeenCalledTimes(1)
  expect(onError.mock.calls[0][0].message).toBe('écran cassé')
  expect(onError.mock.calls[0][1]).toBe('ecran')
})
