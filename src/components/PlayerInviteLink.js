import { useState } from 'react'
import { C } from '../lib/constants'

// Lien d'invitation joueur d'une équipe : partage, et renouvellement qui invalide l'ancien lien.
export default function PlayerInviteLink({ teamId, teamName, onShare, onRegenerate }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const regenerate = async () => {
    setBusy(true)
    const ok = await onRegenerate(teamId)
    setBusy(false)
    if (ok) setConfirming(false)
  }

  return (
    <div style={{ background: C.card, borderRadius: 14, padding: 16, marginBottom: 20, border: '1px solid ' + C.border }}>
      <div style={{ fontSize: 13, color: C.muted, fontWeight: 500, marginBottom: 6 }}>Inviter des joueurs</div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 12 }}>
        Partage ce lien pour que des joueurs rejoignent <strong style={{ color: C.text }}>{teamName}</strong>. Si le lien a trop circulé ou après le départ d'un joueur, renouvelle-le : l'ancien cessera de fonctionner.
      </div>
      {confirming ? (
        <div style={{ background: C.red + '12', border: '1px solid ' + C.red + '40', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>Renouveler le lien ? L'ancien lien ne fonctionnera plus pour personne. Les joueurs déjà inscrits restent dans l'équipe.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setConfirming(false)} disabled={busy}
              style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
            <button onClick={regenerate} disabled={busy}
              style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: C.red, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>Renouveler le lien</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onShare(teamId, teamName)}
            style={{ flex: 2, padding: 10, borderRadius: 10, border: 'none', background: C.accent, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Partager le lien</button>
          <button onClick={() => setConfirming(true)}
            style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid ' + C.border, background: 'transparent', color: C.text, fontSize: 13, cursor: 'pointer' }}>Renouveler</button>
        </div>
      )}
    </div>
  )
}
