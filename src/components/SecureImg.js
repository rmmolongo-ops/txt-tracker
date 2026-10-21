import { useEffect, useState } from 'react'
import { cachedPhotoUrl, resolvePhotoUrl } from '../lib/photos'

// <img> pour les photos du stockage privé : affiche la photo via un lien signé, rien sinon.
export default function SecureImg({ src, alt = '', ...rest }) {
  const [url, setUrl] = useState(() => cachedPhotoUrl(src))

  useEffect(() => {
    let active = true
    setUrl(cachedPhotoUrl(src))
    resolvePhotoUrl(src).then(u => { if (active) setUrl(u) })
    return () => { active = false }
  }, [src])

  if (!url) return null
  return <img src={url} alt={alt} {...rest} />
}
