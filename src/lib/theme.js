import { useCallback, useEffect, useState } from 'react'
import { C, PALETTES } from './constants'

// Préférence d'apparence : 'dark' (défaut), 'light' ou 'system' (suit l'appareil).
// Stockée par appareil dans localStorage ; index.html lit la même clé avant le premier rendu.
const KEY = 'txt_theme'
export const THEME_OPTIONS = [
  { id: 'dark', label: 'Sombre' },
  { id: 'light', label: 'Clair' },
  { id: 'system', label: 'Automatique' },
]

const systemPrefersLight = () => !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches)

export function getStoredTheme() {
  try {
    const v = localStorage.getItem(KEY)
    return THEME_OPTIONS.some(o => o.id === v) ? v : 'dark'
  } catch (e) { return 'dark' }
}

export const resolveTheme = (pref) => pref === 'system' ? (systemPrefersLight() ? 'light' : 'dark') : (pref === 'light' ? 'light' : 'dark')

// Applique la palette : met à jour C, le fond de page, la barre du navigateur et les contrôles natifs.
export function applyTheme(pref) {
  const name = resolveTheme(pref)
  Object.assign(C, PALETTES[name])
  const root = document.documentElement
  root.setAttribute('data-theme', name)
  root.style.colorScheme = name
  root.style.setProperty('--focus', C.accentGlow)
  if (document.body) document.body.style.background = C.bg
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', C.bg)
  return name
}

// À appeler une seule fois, dans la racine : le changement re-rend toute l'appli.
export function useTheme() {
  const [pref, setPref] = useState(getStoredTheme)
  const [, setTick] = useState(0)

  const changeTheme = useCallback((next) => {
    try { localStorage.setItem(KEY, next) } catch (e) { /* stockage indisponible : le choix vaut pour cette session */ }
    applyTheme(next)
    setPref(next)
    setTick(t => t + 1)
  }, [])

  useEffect(() => {
    if (pref !== 'system' || !window.matchMedia) return undefined
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => { applyTheme('system'); setTick(t => t + 1) }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])

  return [pref, changeTheme]
}
