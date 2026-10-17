import { C } from '../lib/constants'

// Confirmation avant d'utiliser un lien d'invitation avec le compte actuellement connecté :
// sans elle, un lien ouvert dans un navigateur déjà connecté s'appliquait en silence au mauvais compte.
export default function InviteConfirm({ invite, email, busy, onConfirm, onCancel, onSwitchAccount }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Invitation" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}>
      <div style={{ background: C.card, borderRadius: 16, padding: 22, maxWidth: 400, width: '100%', border: '1px solid ' + C.border }}>
        <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 10 }}>Invitation reçue</div>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: C.muted, marginBottom: 16 }}>
          Ce lien t'invite à rejoindre <strong style={{ color: C.text }}>{invite.label}</strong> en tant que <strong style={{ color: C.text }}>{invite.roleLabel}</strong>.
        </div>
        <div style={{ fontSize: 13, background: C.surface, borderRadius: 10, padding: '10px 12px', marginBottom: 16, lineHeight: 1.5 }}>
          Tu es connecté avec <strong data-testid="invite-account">{email}</strong>. Le rôle sera attribué à ce compte.
        </div>
        <button onClick={onConfirm} disabled={busy}
          style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: C.accent, color: '#fff', fontWeight: 600, fontSize: 15, cursor: busy ? 'default' : 'pointer', marginBottom: 8, opacity: busy ? 0.6 : 1 }}>
          Rejoindre avec ce compte
        </button>
        <button onClick={onSwitchAccount} disabled={busy}
          style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid ' + C.border, background: 'transparent', color: C.text, fontWeight: 500, fontSize: 14, cursor: busy ? 'default' : 'pointer', marginBottom: 8 }}>
          Utiliser un autre compte
        </button>
        <button onClick={onCancel} disabled={busy}
          style={{ width: '100%', padding: 10, borderRadius: 10, border: 'none', background: 'transparent', color: C.muted, fontSize: 14, cursor: busy ? 'default' : 'pointer' }}>
          Annuler
        </button>
      </div>
    </div>
  )
}
