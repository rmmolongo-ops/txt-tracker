import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../lib/constants'
import Turnstile from './Turnstile'

const inputStyle = { width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '12px 14px', color: C.text, fontSize: 15, outline: 'none', boxSizing: 'border-box' }

// Demande de réinitialisation : envoie un lien par email. Le message de confirmation est le même
// que l'adresse ait un compte ou non, pour ne pas révéler quelles adresses sont inscrites.
export default function ForgotPassword({ initialEmail = '', onBack }) {
  const [email, setEmail] = useState(initialEmail)
  const [captchaToken, setCaptchaToken] = useState(null)
  const [captchaKey, setCaptchaKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sentTo, setSentTo] = useState(null)

  const submit = async () => {
    setError(null)
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Saisis une adresse email valide.'); return }
    if (!captchaToken) { setError('Merci de valider la vérification anti-robot.'); return }
    setLoading(true)
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + '/', captchaToken })
    setLoading(false)
    setCaptchaToken(null)
    setCaptchaKey(k => k + 1)
    if (e) { setError(e.message); return }
    setSentTo(email.trim())
  }

  if (sentTo) {
    return (
      <div role="status" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 10 }}>Vérifie ta boîte mail</div>
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 20 }}>
          Si un compte existe pour <strong style={{ color: C.text }}>{sentTo}</strong>, un email vient de partir avec un lien pour choisir un nouveau mot de passe.
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 20 }}>Rien reçu ? Regarde dans les courriers indésirables. L'email peut mettre quelques minutes à arriver.</div>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.accentGlow, fontSize: 14, cursor: 'pointer' }}>Retour à la connexion</button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 8 }}>Mot de passe oublié</div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, marginBottom: 18 }}>
        Indique l'adresse de ton compte : tu recevras un lien pour choisir un nouveau mot de passe.
      </div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Email</div>
      <input type="email" placeholder="ton@email.com" value={email} onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()} style={{ ...inputStyle, marginBottom: 16 }} />
      {error && <div role="alert" style={{ background: C.red + '20', border: '1px solid ' + C.red + '40', borderRadius: 10, padding: '10px 14px', color: C.red, fontSize: 13, marginBottom: 14 }}>{error}</div>}
      <div style={{ marginBottom: 12 }}>
        <Turnstile key={captchaKey} action="mot_de_passe" onToken={setCaptchaToken} />
      </div>
      <button onClick={submit} disabled={loading}
        style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 16, background: C.accent, color: '#fff', opacity: loading ? 0.7 : 1, marginBottom: 12 }}>
        {loading ? '...' : 'Recevoir le lien'}
      </button>
      <button onClick={onBack} style={{ width: '100%', background: 'none', border: 'none', color: C.muted, fontSize: 14, cursor: 'pointer' }}>Retour à la connexion</button>
    </div>
  )
}
