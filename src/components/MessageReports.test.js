// Rendu React direct (sans Testing Library) : act() est nécessaire autour de root.render.
/* eslint-disable testing-library/no-unnecessary-act */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import MessageReports from './MessageReports'

// Fonctions simples (pas jest.fn) : la config CRA remet les mocks à zéro entre les tests.
const mockState = { reports: [], rpcCalls: [] }
jest.mock('../lib/supabase', () => {
  const query = () => {
    const q = { select: () => q, eq: () => q, order: () => q, limit: () => Promise.resolve({ data: mockState.reports, error: null }) }
    return q
  }
  return { supabase: {
    from: () => query(),
    rpc: (name, args) => {
      mockState.rpcCalls.push({ name, args })
      mockState.reports = mockState.reports.filter(r => r.id !== args.p_report_id)
      return Promise.resolve({ error: null })
    },
  } }
})

const REPORT = {
  id: 'r1', message_id: 'msg1', team_id: 't1', author_name: 'Kenji Diallo', message_content: 'Message déplacé',
  message_created_at: '2026-10-22T09:00:00Z', created_at: '2026-10-22T09:05:00Z', reason: 'Insulte', status: 'ouvert',
}

let container, root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  mockState.reports = []
  mockState.rpcCalls = []
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const render = async (el) => { await act(async () => { root.render(el) }) }
const buttonWithText = (txt) => [...container.querySelectorAll('button')].find(b => b.textContent.includes(txt))

test('chat, rien à traiter (ou pas staff) : aucun bandeau', async () => {
  await render(<MessageReports compact />)
  expect(container.textContent).toBe('')
})

test('chat, staff : bandeau replié, puis message, auteur et motif', async () => {
  mockState.reports = [REPORT]
  await render(<MessageReports teams={[{ id: 't1', name: 'U15 A' }]} compact />)
  expect(container.textContent).toContain('1 message signalé à examiner')
  expect(container.textContent).not.toContain('Message déplacé')
  await act(async () => { buttonWithText('signalé').click() })
  expect(container.textContent).toContain('Message déplacé')
  expect(container.textContent).toContain('Kenji Diallo')
  expect(container.textContent).toContain('Insulte')
  expect(container.textContent).toContain('U15 A')
})

test('décision : supprimer le message passe par la fonction de la base', async () => {
  mockState.reports = [REPORT]
  const onResolved = jest.fn()
  await render(<MessageReports onResolved={onResolved} />)
  await act(async () => { buttonWithText('Supprimer le message').click() })
  expect(mockState.rpcCalls).toEqual([{ name: 'resolve_message_report', args: { p_report_id: 'r1', p_delete_message: true } }])
  expect(onResolved).toHaveBeenCalled()
  expect(container.textContent).toContain('Aucun signalement')
})

test('décision : conserver le message', async () => {
  mockState.reports = [REPORT]
  await render(<MessageReports />)
  await act(async () => { buttonWithText('Conserver le message').click() })
  expect(mockState.rpcCalls).toEqual([{ name: 'resolve_message_report', args: { p_report_id: 'r1', p_delete_message: false } }])
})
