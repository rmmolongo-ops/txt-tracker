import { useState, useEffect } from 'react'
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

export default function Auth({ inviteTeamId }) {
  const [mode, setMode] = useState(inviteTeamId ? 'register' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [club, setClub] = useState('')
  const [equipe, setEquipe] = useState(inviteTeamId || '')
  const [poste1, setPoste1] = useState('')
  const [poste2, setPoste2] = useState('')
  const [clubs, setClubs] = useState([])
  const [teams, setTeams] = useState([])
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const inviteTeam = teams.find(t => t.id === inviteTeamId)

  useEffect(() => {
    supabase.from('clubs').select('*').order('name').then(({ data }) => { if (data) setClubs(data) })
    supabase.from('teams').select('id, name').order('name').then(({ data }) => { if (data) setTeams(data) })
  }, [])

  const passwordValid = rules.every(r => r.test(password))
  const profilValid = mode === 'login' || (nom.trim() && prenom.trim() && club && equipe && poste1.trim())

  const borderFor = (val) => '1px solid ' + (attemptedSubmit && !String(val).trim() ? C.red : C.border)

  const switchMode = (m) => { setMode(m); setError(null); setSuccess(null); setAttemptedSubmit(false) }

  const handleAuth = async () => {
    setAttemptedSubmit(true)
    setError(null)
    setSuccess(null)
    if (!email || !password) {
      setError('Merci de renseigner ton email et ton mot de passe.')
      return
    }
    if (mode === 'register' && !passwordValid) {
      setError('Le mot de passe ne respecte pas les conditions requises.')
      return
    }
    if (mode === 'register' && !profilValid) {
      setError('Merci de renseigner tous les champs en rouge.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { nom: nom.trim(), prenom: prenom.trim(), club, equipe, poste1: poste1.trim(), poste2: poste2.trim() },
          },
        })
        if (error) throw error
        setSuccess('Compte créé ! Vérifie ton email pour confirmer.')
      }
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleGoogleAuth = async () => {
    setError(null)
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
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
            <button key={m} onClick={() => switchMode(m)}
              style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: mode === m ? C.accent : 'transparent', color: mode === m ? '#fff' : C.muted, transition: 'all 0.2s' }}>
              {m === 'login' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>
        {inviteTeam && (
          <div style={{ background: C.accent + '15', border: '1px solid ' + C.accent + '40', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.text }}>
            🎟️ Invitation à rejoindre l'équipe <strong>{inviteTeam.name}</strong>
          </div>
        )}
        <button onClick={handleGoogleAuth} disabled={googleLoading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12, borderRadius: 12, border: '1px solid ' + C.border, cursor: googleLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, background: '#fff', color: '#1f2937', opacity: googleLoading ? 0.7 : 1, marginBottom: 18 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
          </svg>
          {googleLoading ? 'Redirection...' : 'Continuer avec Google'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>OU</div>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>EMAIL</div>
          <input type="email" placeholder="ton@email.com" value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', background: C.surface, border: borderFor(email), borderRadius: 10, padding: '12px 14px', color: C.text, fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: mode === 'register' ? 12 : 20 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>MOT DE PASSE</div>
          <div style={{ position: 'relative' }}>
            <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              style={{ width: '100%', background: C.surface, border: borderFor(password), borderRadius: 10, padding: '12px 44px 12px 14px', color: C.text, fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
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
        {mode === 'register' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Profil joueur</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>NOM</div>
                <input type="text" placeholder="Nom" value={nom} onChange={e => setNom(e.target.value)}
                  style={{ width: '100%', background: C.surface, border: borderFor(nom), borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>PRÉNOM</div>
                <input type="text" placeholder="Prénom" value={prenom} onChange={e => setPrenom(e.target.value)}
                  style={{ width: '100%', background: C.surface, border: borderFor(prenom), borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>CLUB</div>
              <select value={club} onChange={e => setClub(e.target.value)}
                style={{ width: '100%', background: C.surface, border: borderFor(club), borderRadius: 10, padding: '10px 12px', color: club ? C.text : C.muted, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
                <option value="">Sélectionne ton club...</option>
                {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              {clubs.length === 0 && <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Aucun club disponible pour l'instant, contacte ton coach.</div>}
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>ÉQUIPE</div>
              <select value={equipe} onChange={e => setEquipe(e.target.value)}
                style={{ width: '100%', background: C.surface, border: borderFor(equipe), borderRadius: 10, padding: '10px 12px', color: equipe ? C.text : C.muted, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
                <option value="">Sélectionne ton équipe...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {teams.length === 0 && <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Aucune équipe disponible pour l'instant, contacte ton coach.</div>}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>POSTE 1</div>
                <input type="text" placeholder="Ex: Milieu Gauche" value={poste1} onChange={e => setPoste1(e.target.value)}
                  style={{ width: '100%', background: C.surface, border: borderFor(poste1), borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>POSTE 2</div>
                <input type="text" placeholder="Ex: Attaquant" value={poste2} onChange={e => setPoste2(e.target.value)}
                  style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>
        )}
        {error && <div style={{ background: C.red + '20', border: '1px solid ' + C.red + '40', borderRadius: 10, padding: '10px 14px', color: C.red, fontSize: 13, marginBottom: 14 }}>{error}</div>}
        {success && <div style={{ background: C.green + '20', border: '1px solid ' + C.green + '40', borderRadius: 10, padding: '10px 14px', color: C.green, fontSize: 13, marginBottom: 14 }}>{success}</div>}
        <button onClick={handleAuth} disabled={loading}
          style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 16, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', transition: 'all 0.2s', opacity: loading ? 0.7 : 1 }}>
          {loading ? '...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </button>
      </div>
      <div style={{ marginTop: 20, fontSize: 12, color: C.muted, textAlign: 'center' }}>
        Application réservée aux joueurs suivis par Coach Ralph 🎯
      </div>
    </div>
  )
}
