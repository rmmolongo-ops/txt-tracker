import { C, PALETTES } from './constants'
import { applyTheme, getStoredTheme, resolveTheme } from './theme'

afterEach(() => {
  applyTheme('dark')
  localStorage.clear()
})

test('le thème clair change la palette partagée C et la page, le sombre la restaure', () => {
  applyTheme('light')
  expect(C.bg).toBe(PALETTES.light.bg)
  expect(C.text).toBe(PALETTES.light.text)
  expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  expect(document.body.style.background).not.toBe('')
  applyTheme('dark')
  expect(C.bg).toBe(PALETTES.dark.bg)
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
})

test("les deux palettes ont les mêmes clés et des hex à 6 chiffres (le code y ajoute un suffixe d'opacité)", () => {
  expect(Object.keys(PALETTES.light).sort()).toEqual(Object.keys(PALETTES.dark).sort())
  Object.values({ ...PALETTES.dark, ...PALETTES.light }).forEach(v => expect(v).toMatch(/^#[0-9a-f]{6}$/i))
})

test('le thème stocké est lu, et une valeur inconnue retombe sur sombre', () => {
  expect(getStoredTheme()).toBe('dark')
  localStorage.setItem('txt_theme', 'light')
  expect(getStoredTheme()).toBe('light')
  localStorage.setItem('txt_theme', 'rose')
  expect(getStoredTheme()).toBe('dark')
})

test('resolveTheme : clair et sombre sont inchangés, un choix inconnu donne sombre', () => {
  expect(resolveTheme('light')).toBe('light')
  expect(resolveTheme('dark')).toBe('dark')
  expect(resolveTheme('nimporte')).toBe('dark')
})
