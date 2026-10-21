import { photoPath, resolvePhotoUrl, cachedPhotoUrl } from './photos'

const mockCalls = []
jest.mock('./supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrls: (paths) => {
          mockCalls.push(paths)
          return Promise.resolve({ data: paths.map(p => ({ path: p, signedUrl: p.startsWith('interdit') ? null : 'https://signe/' + p + '?token=x' })) })
        },
      }),
    },
  },
}))

const BASE = 'https://projet.supabase.co/storage/v1/object/public/photos/'

test("photoPath : chemin dans le stockage, ou null pour une photo externe (Google) ou absente", () => {
  expect(photoPath(BASE + 'u1/avatar.jpg?t=123')).toBe('u1/avatar.jpg')
  expect(photoPath(BASE + 'teams/t1/photo.jpg')).toBe('teams/t1/photo.jpg')
  expect(photoPath('https://lh3.googleusercontent.com/a/photo')).toBeNull()
  expect(photoPath('')).toBeNull()
})

test('une photo externe est affichée telle quelle, sans demande de lien signé', async () => {
  mockCalls.length = 0
  await expect(resolvePhotoUrl('https://lh3.googleusercontent.com/a/photo')).resolves.toBe('https://lh3.googleusercontent.com/a/photo')
  expect(mockCalls).toHaveLength(0)
})

test('les photos demandées ensemble partent en une seule requête, puis sont servies depuis le cache', async () => {
  mockCalls.length = 0
  const [a, b] = await Promise.all([resolvePhotoUrl(BASE + 'u2/avatar.jpg'), resolvePhotoUrl(BASE + 'u3/avatar.jpg')])
  expect(a).toBe('https://signe/u2/avatar.jpg?token=x')
  expect(b).toBe('https://signe/u3/avatar.jpg?token=x')
  expect(mockCalls).toEqual([['u2/avatar.jpg', 'u3/avatar.jpg']])

  expect(cachedPhotoUrl(BASE + 'u2/avatar.jpg')).toBe('https://signe/u2/avatar.jpg?token=x')
  await resolvePhotoUrl(BASE + 'u2/avatar.jpg')
  expect(mockCalls).toHaveLength(1)
})

test('une photo non autorisée ne renvoie rien (aucune image affichée)', async () => {
  await expect(resolvePhotoUrl(BASE + 'interdit/avatar.jpg')).resolves.toBeNull()
})
