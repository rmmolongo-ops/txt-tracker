// Rendu React direct (sans Testing Library) : act() est nécessaire autour de root.render.
/* eslint-disable testing-library/no-unnecessary-act */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import ForgotPassword from './ForgotPassword'
import ResetPassword from './ResetPassword'
import Auth from './Auth'

// Fonctions simples (pas jest.fn) : la config CRA remet les mocks à zéro entre les tests.
const mockResets = []
const mockUpdates = []
jest.mock('../lib/supabase', () => ({
  supabase: {
    rpc: () => Promise.resolve({ data: [] }),
    auth: {
      resetPasswordForEmail: (email, options) => { mockResets.push({ email, options }); return Promise.resolve({ error: null }) },
      updateUser: (attrs) => { mockUpdates.push(attrs); return Promise.resolve({ error: null }) },
      signInWithPassword: () => Promise.resolve({ error: null }),
      signInWithOAuth: () => Promise.resolve({ error: null }),
    },
  },
}))
jest.mock('./Turnstile', () => {
  const { useEffect } = require('react')
  return function MockTurnstile({ onToken }) { useEffect(() => { onToken('jeton-test') }, [onToken]); return null }
})

let container, root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  mockResets.length = 0
  mockUpdates.length = 0
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const render = async (el) => { await act(async () => { root.render(el) }) }
const buttonWithText = (txt) => [...container.querySelectorAll('button')].find(b => b.textContent.includes(txt))
const typeIn = async (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  await act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })) })
}

test('connexion : « Mot de passe oublié ? » ouvre la demande de lien, avec l’email déjà saisi', async () => {
  await render(<Auth />)
  await typeIn(container.querySelector('input[type="email"]'), 'joueur@test.fr')
  await act(async () => { buttonWithText('Mot de passe oublié').click() })
  expect(container.textContent).toContain('tu recevras un lien')
  expect(container.querySelector('input[type="email"]').value).toBe('joueur@test.fr')
})

test('demande de lien : envoyée avec le jeton anti-robot, puis un message neutre (ne révèle pas si le compte existe)', async () => {
  await render(<ForgotPassword initialEmail="joueur@test.fr" onBack={jest.fn()} />)
  await act(async () => { buttonWithText('Recevoir le lien').click() })
  expect(mockResets).toHaveLength(1)
  expect(mockResets[0].email).toBe('joueur@test.fr')
  expect(mockResets[0].options.captchaToken).toBe('jeton-test')
  expect(container.textContent).toContain('Si un compte existe pour joueur@test.fr')
})

test('demande de lien : une adresse invalide est refusée sans envoi', async () => {
  await render(<ForgotPassword initialEmail="pas-une-adresse" onBack={jest.fn()} />)
  await act(async () => { buttonWithText('Recevoir le lien').click() })
  expect(mockResets).toHaveLength(0)
  expect(container.textContent).toContain('adresse email valide')
})

test('nouveau mot de passe : règles et confirmation vérifiées avant l’enregistrement', async () => {
  const onDone = jest.fn()
  await render(<ResetPassword onDone={onDone} />)
  const [pwd, confirm] = container.querySelectorAll('input')

  await typeIn(pwd, 'faible')
  await typeIn(confirm, 'faible')
  await act(async () => { buttonWithText('Enregistrer').click() })
  expect(mockUpdates).toHaveLength(0)
  expect(container.textContent).toContain('conditions requises')

  await typeIn(pwd, 'Nouveau1!pass')
  await typeIn(confirm, 'Nouveau1!autre')
  await act(async () => { buttonWithText('Enregistrer').click() })
  expect(mockUpdates).toHaveLength(0)
  expect(container.textContent).toContain('pas identiques')

  await typeIn(confirm, 'Nouveau1!pass')
  await act(async () => { buttonWithText('Enregistrer').click() })
  expect(mockUpdates).toEqual([{ password: 'Nouveau1!pass' }])
  expect(container.textContent).toContain('Mot de passe modifié')
  await act(async () => { buttonWithText("Continuer vers l'appli").click() })
  expect(onDone).toHaveBeenCalled()
})

test('lien d’email expiré : un message explique quoi faire sur la page de connexion', async () => {
  await render(<Auth linkError="otp_expired" />)
  expect(container.textContent).toContain('Ce lien a expiré ou a déjà été utilisé')
})
