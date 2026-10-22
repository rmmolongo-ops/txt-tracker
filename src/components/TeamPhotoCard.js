import { C } from '../lib/constants'
import SecureImg from './SecureImg'
import Icon from './Icons'

// Photo de l'équipe, modifiable par le staff (coach/dirigeant de l'équipe, responsables du club).
export default function TeamPhotoCard({ team, uploading, onUpload }) {
  if (!team) return null
  return (
    <div style={{ background: C.card, borderRadius: 14, padding: 16, marginBottom: 20, border: '1px solid ' + C.border, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 56, height: 56, borderRadius: 12, background: C.bg, border: '1px solid ' + C.border, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: uploading ? 0.6 : 1 }}>
        {team.photo_url
          ? <SecureImg src={team.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 16, fontWeight: 600, color: C.accentGlow }}>{(team.name || '?').slice(0, 3).toUpperCase()}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>Photo de l'équipe</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Visible par les membres de l'équipe et du club.</div>
      </div>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, border: '1px solid ' + C.border, color: C.text, fontSize: 13, cursor: uploading ? 'wait' : 'pointer', flexShrink: 0 }}>
        <Icon name="camera" size={15} />
        {uploading ? 'Envoi…' : team.photo_url ? 'Changer' : 'Ajouter'}
        <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading}
          onChange={e => { const file = e.target.files[0]; e.target.value = ''; if (file) onUpload(team.id, file) }} />
      </label>
    </div>
  )
}
