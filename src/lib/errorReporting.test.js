import { reportError, resetErrorReporting } from './errorReporting'

// Fonctions simples (pas jest.fn) : la config CRA remet les mocks à zéro entre les tests.
const mockInserts = []
let mockSession = { user: { id: 'u1' } }
jest.mock('./supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: mockSession } }) },
    from: () => ({ insert: (row) => { mockInserts.push(row); return Promise.resolve({ error: null }) } }),
  },
}))

beforeEach(() => { mockInserts.length = 0; mockSession = { user: { id: 'u1' } }; resetErrorReporting() })

test("enregistre l'erreur avec sa source, tronquée à la taille autorisée", async () => {
  const long = new Error('x'.repeat(800))
  await expect(reportError(long, 'ecran')).resolves.toBe(true)
  expect(mockInserts).toHaveLength(1)
  expect(mockInserts[0].message).toHaveLength(500)
  expect(mockInserts[0].source).toBe('ecran')
})

test('une même erreur n’est signalée qu’une fois par session', async () => {
  await reportError(new Error('doublon'))
  await reportError(new Error('doublon'))
  expect(mockInserts).toHaveLength(1)
})

test('au plus 10 erreurs par session, pour ne pas inonder le journal', async () => {
  for (let i = 0; i < 15; i++) await reportError(new Error('erreur ' + i))
  expect(mockInserts).toHaveLength(10)
})

test('rien n’est envoyé sans utilisateur connecté', async () => {
  mockSession = null
  await expect(reportError(new Error('page connexion'))).resolves.toBe(false)
  expect(mockInserts).toHaveLength(0)
})
