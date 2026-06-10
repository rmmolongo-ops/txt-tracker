import { useState } from 'react'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#0a0e1a', card: '#111827', border: '#1e293b',
  accent: '#3b82f6', green: '#10b981', red: '#ef4444',
  text: '#f1f5f9', muted: '#64748b', surface: '#1e293b', gold: '#f59e0b'
}

const rules = [
  { id: 'length', label: '8 caractères minimum', test: p => p.length >= 8 },
  { id: 'upper', label: '1 majuscule', test: p => /[A-Z]/.test(p) },
  { id: 'number', label: '1 chiffre', test: p => /[0-9]/.test(p) },
  { id: 'special', label: '1 caractère spécial (!@#$...)', test: p => /[^A-Za-z0-9]/.test(p) },
]

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const passwordValid = rules.every(r => r.test(password))

  const handleAuth = async () => {
    if (mode === 'register' && !passwordValid) {
      setError('Le mot de passe ne respecte pas les conditions requises.')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Compte créé ! Vérifie ton email pour confirmer.')
      }
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 16px', boxShadow: '0 0 40px rgba(59,130,246,0.4)' }}>⚽</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: C.text, letterSpacing: -1 }}>TxT Tracker</div>
        <div style={{ fontSize: 14, color: C.gold, fontWeight: 600, marginTop: 4 }}>Talent × Travail × Temps</div>
      </div>
      <div style={{ background: C.card, borderRadius: 20, padding: 28, width: '100%', maxWidth: 380, border: '1px solid ' + C.border }}>
        <div style={{ display: 'flex', background: C.surface, borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(null); setSuccess(null) }}
              style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: mode === m ? C.accent : 'transparent', color: mode === m ? '#fff' : C.muted, transition: 'all 0.2s' }}>
              {m === 'login' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>EMAIL</div>
          <input type="email" placeholder="ton@email.com" value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '12px 14px', color: C.text, fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: mode === 'register' ? 12 : 20 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>MOT DE PASSE</div>
          <div style={{ position: 'relative' }}>
            <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '12px 44px 12px 14px', color: C.text, fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={() => setShowPassword(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: C.muted, padding: 0 }}>
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        {mode === 'register' && password.length > 0 && (
          <div style={{ background: C.surface, borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
            {rules.map(r => {
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
        {error && <div style={{ background: C.red + '20', border: '1px solid ' + C.red + '40', borderRadius: 10, padding: '10px 14px', color: C.red, fontSize: 13, marginBottom: 14 }}>{error}</div>}
        {success && <div style={{ background: C.green + '20', border: '1px solid ' + C.green + '40', borderRadius: 10, padding: '10px 14px', color: C.green, fontSize: 13, marginBottom: 14 }}>{success}</div>}
        <button onClick={handleAuth} disabled={loading || !email || !password || (mode === 'register' && !passwordValid)}
          style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: (loading || !email || !password) ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 16, background: (!email || !password || (mode === 'register' && !passwordValid)) ? C.surface : 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: (!email || !password) ? C.muted : '#fff', transition: 'all 0.2s' }}>
          {loading ? '...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </button>
      </div>
      <div style={{ marginTop: 20, fontSize: 12, color: C.muted, textAlign: 'center' }}>
        Application réservée aux joueurs suivis par Ralph 🎯
      </div>
    </div>
  )
}
