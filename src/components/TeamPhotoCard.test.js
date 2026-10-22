// Rendu React direct (sans Testing Library) : act() est nécessaire autour de root.render.
/* eslint-disable testing-library/no-unnecessary-act */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import TeamPhotoCard from './TeamPhotoCard'

jest.mock('./SecureImg', () => function MockSecureImg() { return <img alt="" data-testid="photo" /> })

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

test('sans photo : initiales et bouton « Ajouter » ; le fichier choisi est envoyé pour cette équipe', async () => {
  const onUpload = jest.fn()
  await render(<TeamPhotoCard team={{ id: 't1', name: 'U12 B' }} uploading={false} onUpload={onUpload} />)
  expect(container.textContent).toContain('U12')
  expect(container.textContent).toContain('Ajouter')

  const input = container.querySelector('input[type="file"]')
  const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
  Object.defineProperty(input, 'files', { value: [file] })
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
  expect(onUpload).toHaveBeenCalledWith('t1', file)
})

test('avec photo : la photo est affichée et le bouton devient « Changer » ; pendant l’envoi il est désactivé', async () => {
  await render(<TeamPhotoCard team={{ id: 't1', name: 'U12 B', photo_url: 'https://x/storage/v1/object/public/photos/teams/t1/photo.jpg' }} uploading onUpload={jest.fn()} />)
  expect(container.querySelector('[data-testid="photo"]')).not.toBeNull()
  expect(container.textContent).toContain('Envoi…')
  expect(container.querySelector('input[type="file"]').disabled).toBe(true)
})
