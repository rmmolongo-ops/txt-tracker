import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../lib/constants'
import { PASSWORD_RULES, isPasswordValid } from '../lib/password'

const inputStyle = { width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '12px 14px', color: C.text, fontSize: 15, outline: 'none', boxSizing: 'border-box' }

// Choix d'un nouveau mot de passe, affiché quand on arrive par le lien de l'email de
// réinitialisation (la personne est alors connectée le temps de changer son mot de passe).
export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const submit = async () => {
    setError(null)
    if (!isPasswordValid(password)) { setError('Le mot de passe ne respecte pas les conditions requises.'); return }
    if (password !== confirm) { setError('Les deux mots de passe ne sont pas identiques.'); return }
    setLoading(true)
    const { error: e } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (e) { setError(e.message); return }
    setDone(true)
  }

  return (
    <div style={{ background: C.bg, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: C.card, borderRadius: 16, padding: 28, width: '100%', maxWidth: 380, border: '1px solid ' + C.border }}>
        {done ? (
          <div role="status" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 10 }}>Mot de passe modifié</div>
            <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 20 }}>Ton nouveau mot de passe est enregistré. Utilise-le pour tes prochaines connexions.</div>
            <button onClick={onDone} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 16, background: C.accent, color: '#fff' }}>Continuer vers l'appli</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 8 }}>Nouveau mot de passe</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, marginBottom: 18 }}>Choisis le mot de passe que tu utiliseras désormais pour te connecter.</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Nouveau mot de passe</div>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password"
                aria-label="Nouveau mot de passe" style={{ ...inputStyle, paddingRight: 84 }} />
              <button onClick={() => setShow(v => !v)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.accentGlow, padding: 0 }}>
                {show ? 'Masquer' : 'Afficher'}
              </button>
            </div>
            {password.length > 0 && (
              <div style={{ background: C.surface, borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                {PASSWORD_RULES.map(r => {
                  const ok = r.test(password)
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: ok ? C.green : C.red }}>{ok ? '✓' : '✗'}</span>
                      <span style={{ fontSize: 12, color: ok ? C.green : C.muted }}>{r.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Confirme le mot de passe</div>
            <input type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password"
              aria-label="Confirme le mot de passe" onKeyDown={e => e.key === 'Enter' && submit()} style={{ ...inputStyle, marginBottom: 16 }} />
            {error && <div role="alert" style={{ background: C.red + '20', border: '1px solid ' + C.red + '40', borderRadius: 10, padding: '10px 14px', color: C.red, fontSize: 13, marginBottom: 14 }}>{error}</div>}
            <button onClick={submit} disabled={loading}
              style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 16, background: C.accent, color: '#fff', opacity: loading ? 0.7 : 1 }}>
              {loading ? '...' : 'Enregistrer le mot de passe'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
