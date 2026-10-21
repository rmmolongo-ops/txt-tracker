import { supabase } from './supabase'

// Photos privées : le stockage n'est plus public, chaque photo s'affiche via un lien signé
// temporaire, délivré seulement si les règles d'accès l'autorisent (soi-même, coéquipiers,
// responsables du club, super admin). L'adresse enregistrée en base garde son format d'origine
// et sert uniquement d'identifiant ; les photos externes (Google) s'affichent telles quelles.

const STORAGE_MARKER = '/storage/v1/object/public/photos/'
const TTL_SECONDS = 3600
const SAFETY_MARGIN_MS = 5 * 60 * 1000

const cache = new Map()
let queue = new Map()
let flushScheduled = false

export const photoPath = (stored) => {
  if (!stored) return null
  const i = stored.indexOf(STORAGE_MARKER)
  if (i < 0) return null
  return decodeURIComponent(stored.slice(i + STORAGE_MARKER.length).split('?')[0])
}

// Une seule requête pour toutes les photos demandées au même moment (listes d'effectif).
const flush = async () => {
  const batch = queue
  queue = new Map()
  flushScheduled = false
  const paths = [...batch.keys()]
  let signed = new Map()
  try {
    const { data } = await supabase.storage.from('photos').createSignedUrls(paths, TTL_SECONDS)
    signed = new Map((data || []).map(d => [d.path, d.signedUrl || null]))
  } catch (e) {}
  batch.forEach((resolvers, path) => resolvers.forEach(resolve => resolve(signed.get(path) || null)))
}

const requestSignedUrl = (path) => new Promise(resolve => {
  if (!queue.has(path)) queue.set(path, [])
  queue.get(path).push(resolve)
  if (!flushScheduled) { flushScheduled = true; setTimeout(flush, 0) }
})

export const cachedPhotoUrl = (stored) => {
  if (!photoPath(stored)) return stored || null
  const hit = cache.get(stored)
  return hit && hit.expires > Date.now() ? hit.url : null
}

export const resolvePhotoUrl = async (stored) => {
  const path = photoPath(stored)
  if (!path) return stored || null
  const cached = cachedPhotoUrl(stored)
  if (cached) return cached
  const url = await requestSignedUrl(path)
  if (url) cache.set(stored, { url, expires: Date.now() + TTL_SECONDS * 1000 - SAFETY_MARGIN_MS })
  return url
}
