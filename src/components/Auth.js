import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../lib/constants'
import Turnstile from './Turnstile'

const CLUB_ROLE_LABELS = { admin: 'administrateur', dirigeant: 'dirigeant', coach: 'coach' }

const lockedBox = { width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }

const rules = [
  { id: 'length', label: '8 caractères minimum', test: p => p.length >= 8 },
  { id: 'upper', label: '1 majuscule', test: p => /[A-Z]/.test(p) },
  { id: 'number', label: '1 chiffre', test: p => /[0-9]/.test(p) },
  { id: 'special', label: '1 caractère spécial (!@#$...)', test: p => /[^A-Za-z0-9]/.test(p) },
]

export default function Auth({ teamJoinCode, clubInviteCode }) {
  const hasInvite = !!(teamJoinCode || clubInviteCode)
  const [mode, setMode] = useState(hasInvite ? 'register' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  // Après une inscription réussie, le formulaire laisse place à un écran de confirmation : un
  // second clic renverrait la demande, refusée par Supabase (une par minute et par adresse).
  const [signupDoneEmail, setSignupDoneEmail] = useState(null)
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [poste1, setPoste1] = useState('')
  const [poste2, setPoste2] = useState('')
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  // Jeton anti-robot (Cloudflare Turnstile), à usage unique : nouveau widget après chaque tentative.
  const [captchaToken, setCaptchaToken] = useState(null)
  const [captchaKey, setCaptchaKey] = useState(0)
  // Informations du lien, lues par fonction (la page d'inscription ne lit aucune table) :
  // undefined = vérification en cours, null = lien invalide/expiré, objet = lien valide.
  const [teamInvite, setTeamInvite] = useState(teamJoinCode ? undefined : null)
  const [clubInvite, setClubInvite] = useState(clubInviteCode ? undefined : null)

  useEffect(() => {
    if (!teamJoinCode) return
    supabase.rpc('get_team_join_info', { p_code: teamJoinCode }).then(({ data }) => setTeamInvite(data?.[0] || null))
  }, [teamJoinCode])

  useEffect(() => {
    if (!clubInviteCode) return
    supabase.rpc('get_club_invite_info', { p_code: clubInviteCode }).then(({ data }) => setClubInvite(data?.[0] || null))
  }, [clubInviteCode])

  // L'inscription n'est possible que sur invitation valide : le club et l'équipe viennent du lien
  // et ne sont jamais choisis par l'utilisateur.
  const checking = (teamJoinCode && teamInvite === undefined) || (clubInviteCode && clubInvite === undefined)
  const inviteInvalid = hasInvite && !checking && !teamInvite && !clubInvite
  const canRegister = !!(teamInvite || clubInvite)
  const clubName = teamInvite?.club_name || clubInvite?.club_name || ''
  const teamName = teamInvite?.team_name || clubInvite?.team_name || ''
  // Un lien joueur rattache à l'équipe à la création du compte (code gardé dans le compte) ; un
  // lien staff rattache à l'utilisation du code (rôle coach/dirigeant), jamais comme simple joueur.
  const teamCodeValue = teamInvite ? teamJoinCode : ''
  // Un membre du staff invité (coach, dirigeant, administrateur) n'a pas de poste de jeu.
  const posteOptional = ['coach', 'dirigeant', 'admin'].includes(clubInvite?.role)
  const registering = mode === 'register' && canRegister

  const passwordValid = rules.every(r => r.test(password))
  const profilValid = !registering || (nom.trim() && prenom.trim() && (poste1.trim() || posteOptional))

  const borderFor = (val) => '1px solid ' + (attemptedSubmit && !String(val).trim() ? C.red : C.border)

  const switchMode = (m) => { setMode(m); setError(null); setSuccess(null); setAttemptedSubmit(false) }

  const handleGoogleAuth = async () => {
    setError(null)
    setSuccess(null)
    const redirectTo = teamJoinCode ? `${window.location.origin}/?join=${teamJoinCode}`
      : clubInviteCode ? `${window.location.origin}/?club_invite=${clubInviteCode}`
      : window.location.origin
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error) setError(error.message)
  }

  // Le lien de confirmation d'email doit ramener sur l'invitation (équipe ou club) suivie,
  // sinon le code est perdu et l'utilisateur n'est jamais rattaché.
  const signupRedirect = teamJoinCode ? `${window.location.origin}/?join=${teamJoinCode}`
    : clubInviteCode ? `${window.location.origin}/?club_invite=${clubInviteCode}`
    : window.location.origin

  const handleAuth = async () => {
    setAttemptedSubmit(true)
    setError(null)
    setSuccess(null)
    if (!email || !password) {
      setError('Merci de renseigner ton email et ton mot de passe.')
      return
    }
    if (registering && !passwordValid) {
      setError('Le mot de passe ne respecte pas les conditions requises.')
      return
    }
    if (registering && !profilValid) {
      setError('Merci de renseigner tous les champs en rouge.')
      return
    }
    if (registering && !acceptedTerms) {
      setError("Merci d'accepter les CGU et la politique de confidentialité pour créer un compte.")
      return
    }
    if (!captchaToken) {
      setError('Merci de valider la vérification anti-robot ci-dessus.')
      return
    }
    setLoading(true)
    try {
      if (!registering) {
        const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: signupRedirect,
            captchaToken,
            data: { nom: nom.trim(), prenom: prenom.trim(), club: clubName, equipe: '', team_join_code: teamCodeValue, poste1: poste1.trim(), poste2: poste2.trim(), club_invite: clubInvite ? clubInviteCode : '' },
          },
        })
        if (error) throw error
        setSignupDoneEmail(email)
      }
    } catch (e) {
      setError(e.message)
    }
    setCaptchaToken(null)
    setCaptchaKey(k => k + 1)
    setLoading(false)
  }

  return (
    <div style={{ background: C.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: C.card, border: '1px solid ' + C.border, color: C.accentGlow, display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 600, margin: '0 auto 16px' }}>TxT</div>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: C.text, letterSpacing: '-0.03em' }}>TxT Tracker</h1>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>Talent × Travail × Temps</div>
      </div>
      {signupDoneEmail ? (
      <div role="status" style={{ background: C.card, borderRadius: 16, padding: 28, width: '100%', maxWidth: 380, border: '1px solid ' + C.border, textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 10 }}>Vérifie ta boîte mail</div>
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 20 }}>
          Ton compte est créé. Un email de confirmation a été envoyé à <strong style={{ color: C.text }}>{signupDoneEmail}</strong>. Clique sur le bouton qu'il contient pour activer ton compte et rejoindre ton équipe.
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>Rien reçu ? Regarde dans les courriers indésirables. L'email peut mettre quelques minutes à arriver.</div>
      </div>
      ) : (
      <div style={{ background: C.card, borderRadius: 16, padding: 28, width: '100%', maxWidth: 380, border: '1px solid ' + C.border }}>
        {canRegister && (
        <div style={{ display: 'flex', borderRadius: 10, padding: 3, marginBottom: 24, border: '1px solid ' + C.border }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => switchMode(m)}
              style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 14, background: mode === m ? C.surface : 'transparent', color: mode === m ? C.text : C.muted }}>
              {m === 'login' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>
        )}
        {!hasInvite && (
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.5 }}>
            L'inscription se fait sur invitation : demande un lien à ton coach ou à ton club.
          </div>
        )}
        {teamInvite && (
          <div style={{ background: C.accent + '15', border: '1px solid ' + C.accent + '40', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.text }}>
            Invitation à rejoindre l'équipe <strong>{teamInvite.team_name}</strong>
          </div>
        )}
        {clubInvite && (
          <div style={{ background: C.accent + '15', border: '1px solid ' + C.accent + '40', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.text }}>
            Invitation à rejoindre <strong>{clubInvite.team_name ? clubInvite.team_name + ' (' + clubInvite.club_name + ')' : 'le club ' + clubInvite.club_name}</strong> en tant que <strong>{CLUB_ROLE_LABELS[clubInvite.role] || clubInvite.role}</strong>
          </div>
        )}
        {checking && (
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Vérification de l'invitation…</div>
        )}
        {inviteInvalid && (
          <div style={{ background: C.red + '15', border: '1px solid ' + C.red + '40', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.text }}>
            Ce lien d'invitation n'est plus valide (expiré, déjà utilisé ou introuvable). Demande-en un nouveau à ton club.
          </div>
        )}
        <button onClick={handleGoogleAuth} type="button"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 13, borderRadius: 10, border: '1px solid ' + C.border, cursor: 'pointer', fontWeight: 500, fontSize: 15, background: '#fff', color: '#1f2937', marginBottom: 18 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.86 2.7-6.62z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
          </svg>
          Continuer avec Google
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <div style={{ fontSize: 12, color: C.muted }}>ou</div>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Email</div>
          <input type="email" placeholder="ton@email.com" value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', background: C.surface, border: borderFor(email), borderRadius: 10, padding: '12px 14px', color: C.text, fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: registering ? 12 : 20 }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Mot de passe</div>
          <div style={{ position: 'relative' }}>
            <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              style={{ width: '100%', background: C.surface, border: borderFor(password), borderRadius: 10, padding: '12px 84px 12px 14px', color: C.text, fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.accentGlow, padding: 0 }}>
              {showPassword ? 'Masquer' : 'Afficher'}
            </button>
          </div>
        </div>
        {registering && password.length > 0 && (
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
        {registering && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 10, fontWeight: 500 }}>{posteOptional ? 'Ton profil' : 'Profil joueur'}</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Nom</div>
                <input type="text" placeholder="Nom" value={nom} onChange={e => setNom(e.target.value)}
                  style={{ width: '100%', background: C.surface, border: borderFor(nom), borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Prénom</div>
                <input type="text" placeholder="Prénom" value={prenom} onChange={e => setPrenom(e.target.value)}
                  style={{ width: '100%', background: C.surface, border: borderFor(prenom), borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Club</div>
              <div style={lockedBox} data-testid="club-locked"><span>{clubName}</span><span style={{ fontSize: 11, color: C.muted }}>Fixé par l'invitation</span></div>
            </div>
            {teamName && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Équipe</div>
                <div style={lockedBox} data-testid="team-locked"><span>{teamName}</span><span style={{ fontSize: 11, color: C.muted }}>Fixée par l'invitation</span></div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Poste 1{posteOptional ? ' (optionnel)' : ''}</div>
                <input type="text" placeholder="Ex: Milieu Gauche" value={poste1} onChange={e => setPoste1(e.target.value)}
                  style={{ width: '100%', background: C.surface, border: posteOptional ? '1px solid ' + C.border : borderFor(poste1), borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Poste 2</div>
                <input type="text" placeholder="Ex: Attaquant" value={poste2} onChange={e => setPoste2(e.target.value)}
                  style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>
        )}
        {registering && (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16, fontSize: 12, color: C.muted, cursor: 'pointer' }}>
            <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0 }} />
            <span>
              J'accepte les <a href="/legal/cgu.html" target="_blank" rel="noopener noreferrer" style={{ color: C.accentGlow }}>CGU</a> et la{' '}
              <a href="/legal/confidentialite.html" target="_blank" rel="noopener noreferrer" style={{ color: C.accentGlow }}>politique de confidentialité</a>.
            </span>
          </label>
        )}
        {error && <div role="alert" style={{ background: C.red + '20', border: '1px solid ' + C.red + '40', borderRadius: 10, padding: '10px 14px', color: C.red, fontSize: 13, marginBottom: 14 }}>{error}</div>}
        {success && <div style={{ background: C.green + '20', border: '1px solid ' + C.green + '40', borderRadius: 10, padding: '10px 14px', color: C.green, fontSize: 13, marginBottom: 14 }}>{success}</div>}
        {!checking && (
          <div style={{ marginBottom: 12 }}>
            <Turnstile key={captchaKey} action={registering ? 'inscription' : 'connexion'} onToken={setCaptchaToken} />
          </div>
        )}
        <button onClick={handleAuth} disabled={loading || checking}
          style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 16, background: C.accent, color: '#fff', opacity: loading ? 0.7 : 1 }}>
          {loading ? '...' : registering ? 'Créer mon compte' : 'Se connecter'}
        </button>
      </div>
      )}
      <div style={{ marginTop: 20, fontSize: 12, color: C.muted, textAlign: 'center' }}>
        Suivi de performance pour les joueurs de ton club
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: C.muted, textAlign: 'center', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="/legal/mentions-legales.html" target="_blank" rel="noopener noreferrer" style={{ color: C.muted }}>Mentions légales</a>
        <a href="/legal/confidentialite.html" target="_blank" rel="noopener noreferrer" style={{ color: C.muted }}>Confidentialité</a>
        <a href="/legal/cgu.html" target="_blank" rel="noopener noreferrer" style={{ color: C.muted }}>CGU</a>
        <a href="/legal/cookies.html" target="_blank" rel="noopener noreferrer" style={{ color: C.muted }}>Cookies</a>
      </div>
    </div>
  )
}
