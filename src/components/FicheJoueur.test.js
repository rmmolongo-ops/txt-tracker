// Rendu React direct (sans Testing Library) : act() est nécessaire autour de root.render.
/* eslint-disable testing-library/no-unnecessary-act */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import FicheJoueur from './FicheJoueur'

const MATCHES = [
  { id: 'm1', team_id: 't1', date: '2026-09-20', label: 'Match vs Meudon', resultat: 'victoire', score_pour: 3, score_contre: 1, presents: ['u1'], buts: { u1: 2 } },
  { id: 'm2', team_id: 't1', date: '2026-09-13', label: 'Match vs Versailles', resultat: 'defaite', score_pour: 0, score_contre: 2, presents: ['u2'], buts: {} },
]

jest.mock('../lib/supabase', () => {
  const query = (result) => {
    const q = { select: () => q, eq: () => q, in: () => q, order: () => Promise.resolve(result) }
    return q
  }
  return { supabase: { from: () => query({ data: MATCHES }) } }
})

global.IS_REACT_ACT_ENVIRONMENT = true
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }

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

const player = {
  user_id: 'u1', prenom: 'Kenji', nom: 'Lahib', surnom: 'KL', poste1: 'Attaquant',
  teams: [{ id: 't1' }], nb_seances: 12, derniereSeance: '2026-09-19', seancesSemaine: 3,
  kpis: { sprint30: 4.8 },
  mesuresData: [
    { kpi_id: 'sprint30', valeur: 5.0, date: '2026-09-01' },
    { kpi_id: 'sprint30', valeur: 4.8, date: '2026-09-15' },
  ],
  __pool: [],
}

test('affiche l’identité, les KPIs et le bilan de matchs du joueur', async () => {
  await act(async () => { root.render(<FicheJoueur player={player} onClose={() => {}} />) })
  const text = container.textContent
  expect(text).toContain('Kenji Lahib')
  expect(text).toContain('"KL"')
  expect(text).toContain('Match vs Meudon')
  expect(text).toContain('⚽ 2') // ses buts
  expect(text).toContain('Absent') // absent du 2e match
  expect(text).toContain('▲4%') // progression sprint : 5.0 → 4.8
})

test('le clic sur le fond ou sur ✕ ferme la fiche, pas le clic sur la carte', async () => {
  const onClose = jest.fn()
  await act(async () => { root.render(<FicheJoueur player={player} onClose={onClose} />) })
  act(() => { document.getElementById('fiche-joueur-print').click() })
  expect(onClose).not.toHaveBeenCalled()
  const closeBtn = [...container.querySelectorAll('button')].find(b => b.textContent === '✕')
  act(() => { closeBtn.click() })
  expect(onClose).toHaveBeenCalledTimes(1)
})
