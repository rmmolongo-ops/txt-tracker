import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getDeferredPrompt, onPromptAvailable } from '../lib/installPrompt'
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const C = {
  bg: '#0a0e1a', card: '#111827', border: '#1e293b',
  accent: '#3b82f6', accentGlow: '#60a5fa', gold: '#f59e0b',
  green: '#10b981', red: '#ef4444', text: '#f1f5f9',
  muted: '#64748b', surface: '#1e293b',
}

const TEAM_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#f97316','#14b8a6','#ec4899']

const DAY_ORDER = ['LUN','MAR','MER','JEU','VEN','SAM','DIM']
const toDateStr = (d) => { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }
const getMonday = (d) => { const date = new Date(d); const dow = date.getDay(); date.setDate(date.getDate() - dow + (dow === 0 ? -6 : 1)); date.setHours(0, 0, 0, 0); return date }

const ROLE_CONFIG = {
  joueur: { label: 'Joueur', color: '#64748b' },
  coach: { label: 'Coach', color: '#3b82f6' },
  dirigeant: { label: 'Dirigeant', color: '#8b5cf6' },
  capitaine: { label: 'Capitaine', color: '#f59e0b' },
  invite: { label: 'Invité', color: '#14b8a6' },
}

const KPI_CONFIG = [
  { id: 'sprint30', label: 'Sprint 30m', unit: 'sec', icon: '⚡', color: '#f59e0b', lower: true, category: 'physique' },
  { id: 'sprint10', label: 'Sprint 10m', unit: 'sec', icon: '💥', color: '#ef4444', lower: true, category: 'physique' },
  { id: 'jonglerie_g', label: 'Jonglerie Gauche', unit: 'touches', icon: '🦶', color: '#3b82f6', lower: false, category: 'technique' },
  { id: 'jonglerie_d', label: 'Jonglerie Droite', unit: 'touches', icon: '👟', color: '#8b5cf6', lower: false, category: 'technique' },
  { id: 'jonglerie_alt', label: 'Jonglerie Alternée', unit: 'touches', icon: '🔀', color: '#0ea5e9', lower: false, category: 'technique' },
  { id: 'precision', label: 'Précision Frappe', unit: '/10', icon: '🎯', color: '#10b981', lower: false, category: 'technique' },
  { id: 'slalom', label: 'Slalom 20m', unit: 'sec', icon: '🔄', color: '#f97316', lower: true, category: 'technique' },
  { id: 'scan', label: 'Scan Ballon/Mvt', unit: '/10', icon: '👁️', color: '#14b8a6', lower: false, category: 'technique' },
  { id: 'motivation', label: 'Motivation', unit: '/10', icon: '🔥', color: '#ec4899', lower: false, category: 'mental' },
  { id: 'sommeil', label: 'Qualité Sommeil', unit: '/10', icon: '😴', color: '#06b6d4', lower: false, category: 'mental' },
]

const SESSIONS = [
  { day: 'LUN', label: 'Explosivité & Vitesse', duration: '1h15', icon: '💥', color: '#f59e0b', objectif: 'Explosivité et vitesse', blocs: [
    { titre: 'Séance collective simulée', duree: '30 min', exercices: ['Passes courtes en mouvement — pied droit / pied gauche', 'Réception et contrôle orienté vers l\'avant'] },
    { titre: 'Sprints et accélérations', duree: '15 min', exercices: ['6 × 20m départ arrêté', '6 × 30m départ en mouvement', 'Récupération 45 sec entre chaque'] },
    { titre: 'Conduite de balle rapide', duree: '30 min', exercices: ['Slalom entre plots sur 20m', 'Conduite gauche / droite en alternance', 'Accélération finale après le dernier plot'] },
  ]},
  { day: 'MAR', label: 'Élimination & Duel', duration: '1h', icon: '⚔️', color: '#ef4444', objectif: 'Élimination et duel', blocs: [
    { titre: 'Technique individuelle', duree: '30 min', exercices: ['Travail de crochets intérieur / extérieur', 'Feintes de corps devant un plot fixe', 'Roulette et changements de direction'] },
    { titre: 'Travail 1v1', duree: '15 min', exercices: ['Face à un plot ou simulation défenseur', 'Élimination côté gauche en priorité', 'Variante : élimination côté droit'] },
    { titre: 'Dribbles haute intensité', duree: '15 min', exercices: ['Circuit de dribbles avec 6 plots', 'Vitesse d\'exécution progressive', 'Chrono sur chaque passage'] },
  ]},
  { day: 'MER', label: 'Agilité & Appuis', duration: '45min', icon: '🔄', color: '#3b82f6', objectif: 'Agilité et appuis', blocs: [
    { titre: 'Exercices d\'agilité', duree: '20 min', exercices: ['Échelle de rythme : pas chassés, un pied / deux pieds', 'Sauts latéraux sur ligne', 'Changements de direction en T (5m × 5m)'] },
    { titre: 'Renforcement bas du corps', duree: '15 min', exercices: ['Squats sans charge : 3 × 15', 'Fentes avant alternées : 3 × 10', 'Mollets : 3 × 20'] },
    { titre: 'Technique individuelle', duree: '10 min', exercices: ['Jonglerie pied droit / pied gauche', 'Pieds uniquement — pas d\'épaule jusqu\'au 17 juin'] },
  ]},
  { day: 'JEU', label: 'Finition & Efficacité', duration: '1h', icon: '🎯', color: '#10b981', objectif: 'Finition et efficacité', blocs: [
    { titre: 'Séance collective simulée', duree: '30 min', exercices: ['Passes et combinaisons à 2 ou 3 joueurs', 'Appels de balle et décrochages'] },
    { titre: 'Répétition devant le but', duree: '20 min', exercices: ['Frappes en mouvement depuis 16m', 'Alternance pied droit / pied gauche', 'Centres rentrés côté gauche'] },
    { titre: 'Placements et appels', duree: '10 min', exercices: ['Marche rapide sur terrain — visualiser les déplacements', 'Timing des appels en profondeur'] },
  ]},
  { day: 'VEN', label: 'Prise de Décision', duration: '1h', icon: '🧠', color: '#8b5cf6', objectif: 'Prise de décision rapide', blocs: [
    { titre: 'Séance collective', duree: '20 min', exercices: ['Rondos à 4-5 joueurs si possible', 'Jeu à une touche — vitesse de décision'] },
    { titre: 'Matchs à effectif réduit', duree: '20 min', exercices: ['2v2 ou 3v3 sans contact physique', 'Accent sur vitesse de passe et premier contrôle'] },
    { titre: 'Passes et premier contrôle', duree: '20 min', exercices: ['Passes contre un mur : contrôle orienté vers l\'avant', 'Enchaînement contrôle + frappe en 2 touches'] },
  ]},
  { day: 'SAM', label: 'Performance', duration: '45min', icon: '🏆', color: '#f97316', objectif: 'Performance en compétition', blocs: [
    { titre: 'Échauffement intense', duree: '20 min', exercices: ['Footing léger 10 min', 'Étirements dynamiques', 'Touches de balle légères'] },
    { titre: 'Match ou simulation', duree: '25 min', exercices: ['Jeu libre à effectif réduit sans contact', 'OU analyse vidéo des déplacements de son poste'] },
  ]},
  { day: 'DIM', label: 'Récupération Active', duration: '30min', icon: '🧘', color: '#06b6d4', objectif: 'Récupération active', blocs: [
    { titre: 'Récupération douce', duree: '30 min', exercices: ['Marche rapide ou vélo léger : 15 min', 'Étirements doux complets : 10 min', 'Mobilité épaule légère si autorisée : 5 min'] },
  ]},
]

const DEFAULT_PROFIL = { nom: '', prenom: '', surnom: 'TxT', club: '', division: '', poste1: '', poste2: '', photo_url: '' }

export default function App({ user, onSignOut, inviteTeamId }) {
  const [tab, setTab] = useState(() => localStorage.getItem('txt_tab') || 'dashboard')
  const [mesures, setMesures] = useState([])
  const [seances, setSeances] = useState([])
  const [profil, setProfil] = useState(DEFAULT_PROFIL)
  const [profilEdit, setProfilEdit] = useState(DEFAULT_PROFIL)
  const [editMode, setEditMode] = useState(false)
  const [inputValues, setInputValues] = useState({})
  const [selectedKpi, setSelectedKpi] = useState('sprint30')
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('physique')
  const [expandedDay, setExpandedDay] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [expandedDayDashboard, setExpandedDayDashboard] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminData, setAdminData] = useState([])
  const [unconfirmedSignups, setUnconfirmedSignups] = useState([])
  const [expandedAdmin, setExpandedAdmin] = useState(null)
  const [adminError, setAdminError] = useState(null)
  const [adminLoading, setAdminLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [teams, setTeams] = useState([])
  const [newTeamName, setNewTeamName] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [clubs, setClubs] = useState([])
  const [newClubName, setNewClubName] = useState('')
  const [creatingClub, setCreatingClub] = useState(false)
  const [uploadingTeamPhoto, setUploadingTeamPhoto] = useState(null)
  const [availableTeams, setAvailableTeams] = useState([])
  const [myTeamIds, setMyTeamIds] = useState(new Set())
  const [adminChartKpi, setAdminChartKpi] = useState('sprint30')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [adminView, setAdminView] = useState('overview')
  const [selectedAdminTeam, setSelectedAdminTeam] = useState(null)
  const [adminDetailTab, setAdminDetailTab] = useState('joueurs')
  const [equipeTab, setEquipeTab] = useState('perf')
  const [equipeTeamId, setEquipeTeamId] = useState(null)
  const [equipeKpi, setEquipeKpi] = useState('sprint30')
  const [programsCatalog, setProgramsCatalog] = useState([])
  const [editingProg, setEditingProg] = useState(false)
  const [progDraft, setProgDraft] = useState(null)
  const [editingProgramId, setEditingProgramId] = useState(null)
  const [seancesWeekOffset, setSeancesWeekOffset] = useState(0)
  const [canInstall, setCanInstall] = useState(!!getDeferredPrompt())
  const [isStandalone] = useState(() => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true)
  const [isIOS] = useState(() => /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream)
  const [chatTeamId, setChatTeamId] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [unreadCounts, setUnreadCounts] = useState({})
  const activeChatTeamRef = useRef(null)
  const [rosterTeamId, setRosterTeamId] = useState(null)
  const [rosterPlayers, setRosterPlayers] = useState([])

  const showToast = (msg, duration = 2500) => { setToast(msg); setTimeout(() => setToast(null), duration) }

  useEffect(() => onPromptAvailable(() => setCanInstall(true)), [])

  const handleInstall = async () => {
    const prompt = getDeferredPrompt()
    if (prompt) {
      prompt.prompt()
      const choice = await prompt.userChoice
      if (choice.outcome === 'accepted') showToast('📲 Application installée !')
      setCanInstall(false)
      return
    }
    if (isIOS) {
      showToast('📲 Appuie sur Partager, puis "Sur l\'écran d\'accueil"', 5000)
    } else {
      showToast('📲 Utilise le menu de ton navigateur pour ajouter la page à l\'écran d\'accueil', 5000)
    }
  }

  const changeTab = (newTab) => {
    localStorage.setItem('txt_tab', newTab)
    setTab(newTab)
  }

  const loadAdminData = async () => {
    setAdminLoading(true)
    setAdminError(null)
    try {
      const [
        { data: allProfils, error: errP },
        { data: allMesures },
        { data: allSeances },
        { data: allEmails },
        { data: allTeams },
        { data: allTeamMembers },
        { data: unconfirmed },
      ] = await Promise.all([
        supabase.from('profils').select('*'),
        supabase.from('mesures').select('user_id, kpi_id, valeur, date'),
        supabase.from('seances').select('user_id, date, jour'),
        supabase.rpc('get_user_emails_for_admins'),
        supabase.from('teams').select('*').order('created_at'),
        supabase.from('team_members').select('user_id, team_id, role'),
        supabase.rpc('get_unconfirmed_signups_for_admins'),
      ])
      if (errP) { setAdminError('Erreur lecture profils : ' + errP.message); setAdminLoading(false); return }
      setTeams(allTeams || [])
      setUnconfirmedSignups(unconfirmed || [])
      const emailMap = {}
      ;(allEmails || []).forEach(e => { emailMap[e.user_id] = e.email })
      const teamMap = {}
      ;(allTeams || []).forEach(t => { teamMap[t.id] = t })
      const playerTeamsMap = {}
      ;(allTeamMembers || []).forEach(tm => {
        if (!playerTeamsMap[tm.user_id]) playerTeamsMap[tm.user_id] = []
        if (teamMap[tm.team_id]) playerTeamsMap[tm.user_id].push({ ...teamMap[tm.team_id], role: tm.role })
      })
      const enriched = (allProfils || []).map(p => {
        const mes = (allMesures || []).filter(m => m.user_id === p.user_id)
        const sea = (allSeances || []).filter(s => s.user_id === p.user_id)
        const derniereSeance = sea.slice().sort((a, b) => b.date.localeCompare(a.date))[0]?.date || null
        const derniereMesure = mes.slice().sort((a, b) => b.date.localeCompare(a.date))[0]?.date || null
        const kpis = {}
        KPI_CONFIG.forEach(k => {
          const arr = mes.filter(m => m.kpi_id === k.id).sort((a, b) => a.date.localeCompare(b.date))
          kpis[k.id] = arr.length > 0 ? arr[arr.length - 1].valeur : null
        })
        return { ...p, email: emailMap[p.user_id] || null, teams: playerTeamsMap[p.user_id] || [], mesuresData: mes, nb_mesures: mes.length, nb_seances: sea.length, derniere_seance: derniereSeance, derniere_mesure: derniereMesure, kpis }
      })
      setAdminData(enriched)
    } catch (e) { setAdminError('Erreur inattendue : ' + e.message) }
    setAdminLoading(false)
  }

  const loadAll = useCallback(async () => {
    const [{ data: m }, { data: s }, { data: p }, { data: t }, { data: myMemberships }, { data: progs }, { data: cl }] = await Promise.all([
      supabase.from('mesures').select('*').eq('user_id', user.id).order('date', { ascending: true }),
      supabase.from('seances').select('*').eq('user_id', user.id),
      supabase.from('profils').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('teams').select('id, name, color, photo_url, dashboard_kpis').order('created_at'),
      supabase.from('team_members').select('team_id').eq('user_id', user.id),
      supabase.from('team_programs').select('*').order('start_date'),
      supabase.from('clubs').select('*').order('name'),
    ])
    if (m) setMesures(m)
    if (s) setSeances(s)
    if (t) setAvailableTeams(t)
    if (myMemberships) setMyTeamIds(new Set(myMemberships.map(tm => tm.team_id)))
    if (progs) setProgramsCatalog(progs)
    if (cl) setClubs(cl)
    if (p) { setProfil(p); setProfilEdit(p) }
    else {
      const meta = user.user_metadata || {}
      const initial = { ...DEFAULT_PROFIL, nom: meta.nom || '', prenom: meta.prenom || '', club: meta.club || '', poste1: meta.poste1 || '', poste2: meta.poste2 || '' }
      const { data: newP } = await supabase.from('profils').upsert({ user_id: user.id, ...initial }, { onConflict: 'user_id' }).select().single()
      if (newP) { setProfil(newP); setProfilEdit(newP) }
      if (meta.equipe) {
        const { error: joinError } = await supabase.from('team_members').insert({ user_id: user.id, team_id: meta.equipe })
        if (!joinError) setMyTeamIds(prev => new Set([...prev, meta.equipe]))
      }
    }
    try {
      const { data: adminCheck } = await supabase.from('admins').select('user_id').eq('user_id', user.id).single()
      if (adminCheck) { setIsAdmin(true); await loadAdminData() }
    } catch (e) {}
    setLoading(false)
  }, [user.id])

  useEffect(() => { loadAll() }, [loadAll])

  const inviteHandledRef = useRef(false)
  useEffect(() => {
    if (!inviteTeamId || inviteHandledRef.current) return
    const team = availableTeams.find(t => t.id === inviteTeamId)
    if (!team) return
    inviteHandledRef.current = true
    ;(async () => {
      if (!myTeamIds.has(inviteTeamId)) {
        const { error } = await supabase.from('team_members').insert({ user_id: user.id, team_id: inviteTeamId })
        if (!error) {
          setMyTeamIds(prev => new Set([...prev, inviteTeamId]))
          showToast(`✅ Ajouté à l'équipe "${team.name}" !`)
        }
      }
      window.history.replaceState({}, '', window.location.pathname)
    })()
  }, [inviteTeamId, availableTeams, myTeamIds, user.id])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (tab !== 'chat' || chatTeamId) return
    const myTeams = availableTeams.filter(t => myTeamIds.has(t.id))
    if (myTeams.length > 0) setChatTeamId(myTeams[0].id)
  }, [tab, availableTeams, myTeamIds, chatTeamId])

  useEffect(() => {
    if (tab !== 'chat' || !chatTeamId) return
    let active = true
    supabase.from('team_messages').select('*').eq('team_id', chatTeamId).order('created_at').limit(200)
      .then(({ data }) => { if (active && data) setChatMessages(data) })
    const channel = supabase.channel('team_messages_' + chatTeamId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages', filter: 'team_id=eq.' + chatTeamId }, payload => {
        setChatMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'team_messages', filter: 'team_id=eq.' + chatTeamId }, payload => {
        setChatMessages(prev => prev.filter(m => m.id !== payload.old.id))
      })
      .subscribe()
    markChatRead(chatTeamId)
    return () => { active = false; supabase.removeChannel(channel) }
  }, [tab, chatTeamId])

  useEffect(() => {
    activeChatTeamRef.current = (tab === 'chat') ? chatTeamId : null
  }, [tab, chatTeamId])

  useEffect(() => {
    const myTeams = availableTeams.filter(t => myTeamIds.has(t.id))
    if (myTeams.length === 0) return
    let active = true
    ;(async () => {
      const { data: reads } = await supabase.from('chat_reads').select('team_id, last_read_at').eq('user_id', user.id)
      const readMap = {}
      ;(reads || []).forEach(r => { readMap[r.team_id] = r.last_read_at })
      const counts = {}
      await Promise.all(myTeams.map(async team => {
        const since = readMap[team.id] || '1970-01-01T00:00:00Z'
        const { count } = await supabase.from('team_messages').select('id', { count: 'exact', head: true }).eq('team_id', team.id).gt('created_at', since).neq('user_id', user.id)
        counts[team.id] = count || 0
      }))
      if (active) setUnreadCounts(counts)
    })()
    return () => { active = false }
  }, [availableTeams, myTeamIds, user.id])

  useEffect(() => {
    const myTeams = availableTeams.filter(t => myTeamIds.has(t.id))
    if (myTeams.length === 0) return
    const channels = myTeams.map(team => supabase.channel('unread_' + team.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages', filter: 'team_id=eq.' + team.id }, payload => {
        if (payload.new.user_id === user.id) return
        if (activeChatTeamRef.current === team.id) { markChatRead(team.id); return }
        setUnreadCounts(prev => ({ ...prev, [team.id]: (prev[team.id] || 0) + 1 }))
      })
      .subscribe())
    return () => { channels.forEach(c => supabase.removeChannel(c)) }
  }, [availableTeams, myTeamIds, user.id])

  const markChatRead = async (teamId) => {
    const now = new Date().toISOString()
    setUnreadCounts(prev => ({ ...prev, [teamId]: 0 }))
    await supabase.from('chat_reads').upsert({ user_id: user.id, team_id: teamId, last_read_at: now }, { onConflict: 'user_id,team_id' })
  }

  useEffect(() => {
    if (tab !== 'equipe' || isAdmin || rosterTeamId) return
    const myTeams = availableTeams.filter(t => myTeamIds.has(t.id))
    if (myTeams.length > 0) setRosterTeamId(myTeams[0].id)
  }, [tab, isAdmin, availableTeams, myTeamIds, rosterTeamId])

  useEffect(() => {
    if (tab !== 'equipe' || isAdmin || !rosterTeamId) return
    let active = true
    ;(async () => {
      const { data: members } = await supabase.from('team_members').select('user_id, role').eq('team_id', rosterTeamId)
      const roleMap = {}
      ;(members || []).forEach(m => { roleMap[m.user_id] = m.role })
      const ids = (members || []).map(m => m.user_id)
      if (ids.length === 0) { if (active) setRosterPlayers([]); return }
      const { data: players } = await supabase.from('profils').select('user_id, nom, prenom, surnom, photo_url, poste1, poste2').in('user_id', ids)
      if (active) setRosterPlayers((players || []).map(p => ({ ...p, role: roleMap[p.user_id] || 'joueur' })))
    })()
    return () => { active = false }
  }, [tab, isAdmin, rosterTeamId])

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !chatTeamId) return
    const content = chatInput.trim()
    setChatInput('')
    const { error } = await supabase.from('team_messages').insert({
      team_id: chatTeamId,
      user_id: user.id,
      content,
      sender_prenom: profil.prenom || '',
      sender_nom: profil.nom || '',
      sender_surnom: profil.surnom || '',
      sender_photo_url: profil.photo_url || '',
    })
    if (error) showToast('❌ ' + error.message)
  }

  const deleteChatMessage = async (id) => {
    await supabase.from('team_messages').delete().eq('id', id)
    setChatMessages(prev => prev.filter(m => m.id !== id))
  }

  const saveMesure = async (kpiId, value) => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('mesures').insert({ user_id: user.id, kpi_id: kpiId, valeur: parseFloat(value), date: today }).select().single()
    if (data) { setMesures(prev => [...prev, data]); showToast('✅ Performance enregistrée !') }
    setInputValues(v => ({ ...v, [kpiId]: '' }))
  }

  const deleteMesure = async (id) => {
    await supabase.from('mesures').delete().eq('id', id)
    setMesures(prev => prev.filter(m => m.id !== id))
    showToast('🗑️ Mesure supprimée')
    setConfirmDelete(null)
  }

  const toggleSeance = async (day, dateStr, teamId) => {
    const targetDate = dateStr || new Date().toISOString().split('T')[0]
    const targetTeamId = teamId || null
    const existing = seances.find(s => s.jour === day && s.date === targetDate && s.team_id === targetTeamId)
    if (existing) {
      await supabase.from('seances').delete().eq('id', existing.id)
      setSeances(prev => prev.filter(s => s.id !== existing.id))
    } else {
      const { data } = await supabase.from('seances').insert({ user_id: user.id, jour: day, date: targetDate, team_id: targetTeamId }).select().single()
      if (data) { setSeances(prev => [...prev, data]); showToast('💪 Séance validée !') }
    }
  }

  const saveProfil = async () => {
    await supabase.from('profils').update({ ...profilEdit, updated_at: new Date().toISOString() }).eq('user_id', user.id)
    setProfil(profilEdit)
    setEditMode(false)
    showToast('✅ Profil mis à jour !')
  }

  const toggleMyTeam = async (teamId) => {
    const isIn = myTeamIds.has(teamId)
    if (isIn) {
      await supabase.from('team_members').delete().eq('user_id', user.id).eq('team_id', teamId)
      setMyTeamIds(prev => { const next = new Set(prev); next.delete(teamId); return next })
    } else {
      await supabase.from('team_members').insert({ user_id: user.id, team_id: teamId })
      setMyTeamIds(prev => new Set([...prev, teamId]))
    }
    const team = availableTeams.find(t => t.id === teamId)
    showToast(isIn ? `Retiré de "${team?.name}"` : `✅ Ajouté à "${team?.name}" !`)
  }

  const uploadPhoto = async (file) => {
    setUploadingPhoto(true)
    try {
      const img = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      const MAX = 300
      const ratio = Math.min(MAX / img.width, MAX / img.height)
      canvas.width = img.width * ratio; canvas.height = img.height * ratio
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.8))
      const path = `${user.id}/avatar.jpg`
      await supabase.storage.from('photos').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)
      const url = publicUrl + '?t=' + Date.now()
      await supabase.from('profils').update({ photo_url: url }).eq('user_id', user.id)
      setProfil(p => ({ ...p, photo_url: url }))
      setProfilEdit(p => ({ ...p, photo_url: url }))
      showToast('📷 Photo mise à jour !')
    } catch (e) { showToast('❌ Erreur upload photo') }
    setUploadingPhoto(false)
  }

  const deletePhoto = async () => {
    setUploadingPhoto(true)
    try {
      const path = `${user.id}/avatar.jpg`
      await supabase.storage.from('photos').remove([path])
      await supabase.from('profils').update({ photo_url: '' }).eq('user_id', user.id)
      setProfil(p => ({ ...p, photo_url: '' }))
      setProfilEdit(p => ({ ...p, photo_url: '' }))
      showToast('🗑️ Photo supprimée')
    } catch (e) { showToast('❌ Erreur suppression photo') }
    setUploadingPhoto(false)
  }

  const uploadTeamPhoto = async (teamId, file) => {
    setUploadingTeamPhoto(teamId)
    try {
      const img = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      const MAX = 200
      const ratio = Math.min(MAX / img.width, MAX / img.height)
      canvas.width = img.width * ratio; canvas.height = img.height * ratio
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.8))
      const path = `teams/${teamId}/photo.jpg`
      const { error: uploadError } = await supabase.storage.from('photos').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)
      const url = publicUrl + '?t=' + Date.now()
      const { error: updateError } = await supabase.from('teams').update({ photo_url: url }).eq('id', teamId)
      if (updateError) throw updateError
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, photo_url: url } : t))
      setSelectedAdminTeam(prev => prev?.id === teamId ? { ...prev, photo_url: url } : prev)
      showToast('📷 Photo d\'équipe mise à jour !')
    } catch (e) { showToast('❌ Erreur : ' + e.message) }
    finally { setUploadingTeamPhoto(null) }
  }

  const createTeam = async () => {
    if (!newTeamName.trim()) return
    setCreatingTeam(true)
    const color = TEAM_COLORS[teams.length % TEAM_COLORS.length]
    const { data, error } = await supabase.from('teams').insert({ name: newTeamName.trim(), admin_id: user.id, color }).select().single()
    if (data) { setTeams(prev => [...prev, data]); setAvailableTeams(prev => [...prev, data]); setNewTeamName(''); showToast('✅ Équipe créée !') }
    else if (error) showToast('❌ ' + error.message)
    setCreatingTeam(false)
  }

  const deleteTeam = async (teamId) => {
    await supabase.from('teams').delete().eq('id', teamId)
    setTeams(prev => prev.filter(t => t.id !== teamId))
    setAvailableTeams(prev => prev.filter(t => t.id !== teamId))
    setAdminData(prev => prev.map(p => ({ ...p, teams: (p.teams || []).filter(t => t.id !== teamId) })))
    setMyTeamIds(prev => { const next = new Set(prev); next.delete(teamId); return next })
    if (selectedAdminTeam?.id === teamId) { setSelectedAdminTeam(null); setAdminView('overview') }
    if (equipeTeamId === teamId) setEquipeTeamId(null)
    showToast('🗑️ Équipe supprimée')
  }

  const shareInviteLink = async (teamId, teamName) => {
    const url = `${window.location.origin}/?invite=${teamId}`
    if (navigator.share) {
      try { await navigator.share({ title: 'TxT Tracker', text: `Rejoins l'équipe ${teamName} sur TxT Tracker !`, url }); return }
      catch (e) { if (e.name === 'AbortError') return }
    }
    try {
      await navigator.clipboard.writeText(url)
      showToast('🔗 Lien d\'invitation copié !')
    } catch (e) {
      showToast('❌ Impossible de copier le lien')
    }
  }

  const createClub = async () => {
    if (!newClubName.trim()) return
    setCreatingClub(true)
    const { data, error } = await supabase.from('clubs').insert({ name: newClubName.trim() }).select().single()
    if (data) { setClubs(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name))); setNewClubName(''); showToast('✅ Club ajouté !') }
    else if (error) showToast('❌ ' + error.message)
    setCreatingClub(false)
  }

  const deleteClub = async (clubId) => {
    await supabase.from('clubs').delete().eq('id', clubId)
    setClubs(prev => prev.filter(c => c.id !== clubId))
    showToast('🗑️ Club supprimé')
  }

  const togglePlayerTeam = async (playerUserId, teamId) => {
    const player = adminData.find(p => p.user_id === playerUserId)
    const isIn = (player?.teams || []).some(t => t.id === teamId)
    if (isIn) {
      await supabase.from('team_members').delete().eq('user_id', playerUserId).eq('team_id', teamId)
      setAdminData(prev => prev.map(p => p.user_id !== playerUserId ? p : { ...p, teams: p.teams.filter(t => t.id !== teamId) }))
    } else {
      await supabase.from('team_members').insert({ user_id: playerUserId, team_id: teamId })
      const team = teams.find(t => t.id === teamId)
      setAdminData(prev => prev.map(p => p.user_id !== playerUserId ? p : { ...p, teams: [...(p.teams || []), { ...team, role: 'joueur' }] }))
    }
  }

  const setPlayerRole = async (playerUserId, teamId, role) => {
    const { error } = await supabase.from('team_members').update({ role }).eq('user_id', playerUserId).eq('team_id', teamId)
    if (error) { showToast('❌ ' + error.message); return }
    setAdminData(prev => prev.map(p => p.user_id !== playerUserId ? p : { ...p, teams: p.teams.map(t => t.id === teamId ? { ...t, role } : t) }))
    showToast('✅ Rôle mis à jour')
  }

  const getProgramsForTeam = (teamId) => programsCatalog.filter(p => p.team_id === teamId).sort((a, b) => a.start_date.localeCompare(b.start_date))

  const getProgramForDate = (teamId, dateStr) => programsCatalog.find(p => p.team_id === teamId && dateStr >= p.start_date && dateStr <= p.end_date)

  const saveProgram = async (teamId, draft, programId) => {
    if (!draft.name.trim()) { showToast('❌ Donne un nom au programme'); return }
    if (!draft.start_date || !draft.end_date) { showToast('❌ Renseigne les dates de début et de fin'); return }
    if (draft.end_date < draft.start_date) { showToast('❌ La date de fin doit être après la date de début'); return }
    const overlap = programsCatalog.some(p => p.team_id === teamId && p.id !== programId && draft.start_date <= p.end_date && draft.end_date >= p.start_date)
    if (overlap) { showToast('❌ Ce programme chevauche un programme existant pour cette équipe'); return }
    const clean = {
      team_id: teamId,
      name: draft.name.trim(),
      start_date: draft.start_date,
      end_date: draft.end_date,
      sessions: draft.sessions.map(s => ({ ...s, blocs: s.blocs.map(b => ({ ...b, exercices: b.exercices.filter(e => e.trim() !== '') })) })),
    }
    if (programId) {
      const { data, error } = await supabase.from('team_programs').update(clean).eq('id', programId).select().single()
      if (error) { showToast('❌ ' + error.message); return }
      setProgramsCatalog(prev => prev.map(p => p.id === programId ? data : p))
    } else {
      const { data, error } = await supabase.from('team_programs').insert(clean).select().single()
      if (error) { showToast('❌ ' + error.message); return }
      setProgramsCatalog(prev => [...prev, data])
    }
    setEditingProg(false)
    setProgDraft(null)
    setEditingProgramId(null)
    showToast('✅ Programme sauvegardé !')
  }

  const deleteProgram = async (programId) => {
    await supabase.from('team_programs').delete().eq('id', programId)
    setProgramsCatalog(prev => prev.filter(p => p.id !== programId))
    showToast('🗑️ Programme supprimé')
  }

  const deleteUserAccount = async (userId) => {
    const { error } = await supabase.rpc('delete_user_as_admin', { target_user_id: userId })
    if (error) {
      showToast('❌ Erreur : ' + error.message)
    } else {
      setAdminData(prev => prev.filter(p => p.user_id !== userId))
      setExpandedAdmin(null)
      setDeleteConfirm(null)
      showToast('🗑️ Compte supprimé définitivement')
    }
  }

  const getMesuresForKpi = (kpiId) => mesures.filter(m => m.kpi_id === kpiId).sort((a, b) => a.date.localeCompare(b.date))
  const getLatest = (kpiId) => { const arr = getMesuresForKpi(kpiId); return arr.length > 0 ? arr[arr.length - 1].valeur : null }
  const getProgress = (kpiId) => {
    const arr = getMesuresForKpi(kpiId)
    if (arr.length < 2) return null
    const cfg = KPI_CONFIG.find(k => k.id === kpiId)
    const diff = cfg.lower ? ((arr[0].valeur - arr[arr.length-1].valeur) / arr[0].valeur) * 100 : ((arr[arr.length-1].valeur - arr[0].valeur) / arr[0].valeur) * 100
    return diff.toFixed(1)
  }
  const getDashboardKpiIds = () => {
    const myTeams = availableTeams.filter(t => myTeamIds.has(t.id))
    const withConfig = myTeams.find(t => t.dashboard_kpis && t.dashboard_kpis.length > 0)
    return withConfig ? withConfig.dashboard_kpis : ['sprint30', 'jonglerie_g', 'precision', 'scan']
  }
  const isSeanceDone = (day, dateStr, teamId) => { const targetDate = dateStr || new Date().toISOString().split('T')[0]; const targetTeamId = teamId || null; return seances.some(s => s.jour === day && s.date === targetDate && s.team_id === targetTeamId) }
  const getWeekCompliance = () => {
    let done = 0, total = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      SESSIONS.forEach(s => { total++; if (seances.some(x => x.jour === s.day && x.date === dateStr && x.team_id === null)) done++ })
    }
    return Math.round((done / total) * 100)
  }
  const todayDow = new Date().getDay()
  const dayMap = { LUN: 1, MAR: 2, MER: 3, JEU: 4, VEN: 5, SAM: 6, DIM: 0 }
  const todayStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  if (loading) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.accent, fontSize: 40 }}>⚽</div>
    </div>
  )

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  const NAV_ITEMS = [
    { id: 'dashboard', icon: '🏠', label: 'Accueil' },
    { id: 'seances', icon: '💪', label: 'Programme' },
    { id: 'kpi', icon: '📊', label: 'Mesures' },
    { id: 'stats', icon: '📈', label: 'Stats' },
    { id: 'chat', icon: '💬', label: 'Chat' },
    { id: 'equipe', icon: '⚽', label: 'Équipe' },
    ...(isAdmin ? [
      { id: 'admin', icon: '🛡️', label: 'Admin' },
    ] : []),
  ]

  const PLAYER_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#f97316','#14b8a6','#ec4899']

  const renderSessionBlocs = (s, expanded, done, onToggle) => expanded && (
    <div style={{ background: C.card, padding: '0 16px 16px' }}>
      <div style={{ background: s.color + '15', borderRadius: 10, padding: '8px 12px', margin: '12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>🎯</span>
        <span style={{ fontSize: 13, color: s.color, fontWeight: 700 }}>Objectif : {s.objectif}</span>
      </div>
      {s.blocs.map((bloc, bi) => (
        <div key={bi} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{bloc.titre}</div>
            <div style={{ fontSize: 11, color: s.color, background: s.color + '20', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>{bloc.duree}</div>
          </div>
          {bloc.exercices.map((ex, ei) => (
            <div key={ei} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, marginTop: 6, flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.4 }}>{ex}</div>
            </div>
          ))}
          {bi < s.blocs.length - 1 && <div style={{ height: 1, background: C.border, marginTop: 12 }} />}
        </div>
      ))}
      <button onClick={(e) => { e.stopPropagation(); onToggle() }}
        style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, marginTop: 4, background: done ? C.surface : 'linear-gradient(135deg, ' + s.color + ', ' + s.color + 'cc)', color: done ? C.muted : '#fff' }}>
        {done ? '✓ Séance validée' : 'Valider cette séance'}
      </button>
    </div>
  )

  const renderPlayerCard = (j, cardKey, teamContextId) => {
    const expanded = expandedAdmin === cardKey
    const currentRole = teamContextId ? ((j.teams || []).find(t => t.id === teamContextId)?.role || 'joueur') : null
    return (
      <div key={cardKey} style={{ background: C.card, borderRadius: 16, border: '1px solid ' + (expanded ? C.accent + '60' : C.border), overflow: 'hidden' }}>
        <div onClick={() => setExpandedAdmin(expanded ? null : cardKey)} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
            {j.photo_url ? <img src={j.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚽'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {j.prenom || '—'} {j.nom || ''} <span style={{ color: C.gold }}>"{j.surnom || 'TxT'}"</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 11, color: C.muted }}>{j.poste1 || '—'} • {j.club || '—'}</div>
              {(j.teams || []).map(t => (
                <span key={t.id} style={{ fontSize: 10, fontWeight: 700, color: t.color, background: t.color + '20', padding: '1px 7px', borderRadius: 10 }}>{t.name}</span>
              ))}
            </div>
            {teamContextId && (
              <select value={currentRole} onClick={e => e.stopPropagation()}
                onChange={e => setPlayerRole(j.user_id, teamContextId, e.target.value)}
                style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: ROLE_CONFIG[currentRole].color, background: ROLE_CONFIG[currentRole].color + '18', border: '1px solid ' + ROLE_CONFIG[currentRole].color + '50', borderRadius: 8, padding: '2px 6px', cursor: 'pointer', outline: 'none' }}>
                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
              </select>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>{j.nb_seances || 0} séances</div>
            <div style={{ fontSize: 11, color: C.muted }}>{j.nb_mesures || 0} mesures</div>
          </div>
          <div style={{ fontSize: 16, color: C.muted, marginLeft: 4, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>⌄</div>
        </div>

        {expanded && (
          <div style={{ borderTop: '1px solid ' + C.border, padding: '14px 16px' }}>
            {j.email && (
              <div style={{ background: C.surface, borderRadius: 10, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>✉️</span>
                <div>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 1 }}>EMAIL</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{j.email}</div>
                </div>
              </div>
            )}

            <div style={{ background: C.surface, borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 8, fontWeight: 600 }}>ÉQUIPES</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {teams.map(t => {
                  const inTeam = (j.teams || []).some(jt => jt.id === t.id)
                  return (
                    <button key={t.id} onClick={() => togglePlayerTeam(j.user_id, t.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 16, border: '2px solid ' + (inTeam ? t.color : C.border), background: inTeam ? t.color + '20' : 'transparent', color: inTeam ? t.color : C.muted, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      {inTeam ? '✓ ' : '+ '}{t.name}
                    </button>
                  )
                })}
                {teams.length === 0 && <span style={{ fontSize: 12, color: C.muted }}>Aucune équipe créée</span>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <div style={{ background: C.surface, borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>DERNIÈRE SÉANCE</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: j.derniere_seance ? C.green : C.muted }}>
                  {j.derniere_seance ? new Date(j.derniere_seance).toLocaleDateString('fr-FR') : '—'}
                </div>
              </div>
              <div style={{ background: C.surface, borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>DERNIÈRE MESURE</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: j.derniere_mesure ? C.accent : C.muted }}>
                  {j.derniere_mesure ? new Date(j.derniere_mesure).toLocaleDateString('fr-FR') : '—'}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Performances</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
              {KPI_CONFIG.map(kpi => (
                <div key={kpi.id} onClick={() => setAdminChartKpi(kpi.id)}
                  style={{ background: adminChartKpi === kpi.id ? kpi.color + '20' : C.bg, borderRadius: 8, padding: '8px 10px', textAlign: 'center', cursor: 'pointer', border: '1px solid ' + (adminChartKpi === kpi.id ? kpi.color + '60' : 'transparent'), transition: 'all 0.15s' }}>
                  <div style={{ fontSize: 14, marginBottom: 2 }}>{kpi.icon}</div>
                  <div style={{ fontSize: 9, color: C.muted, marginBottom: 2, lineHeight: 1.2 }}>{kpi.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: j.kpis?.[kpi.id] != null ? kpi.color : C.muted }}>
                    {j.kpis?.[kpi.id] != null ? j.kpis[kpi.id] : '—'}
                  </div>
                  {j.kpis?.[kpi.id] != null && <div style={{ fontSize: 9, color: C.muted }}>{kpi.unit}</div>}
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid ' + C.border, paddingTop: 14 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
                Graphique — {KPI_CONFIG.find(k => k.id === adminChartKpi)?.label}
              </div>
              {(() => {
                const kpi = KPI_CONFIG.find(k => k.id === adminChartKpi)
                const arr = (j.mesuresData || []).filter(m => m.kpi_id === adminChartKpi).sort((a, b) => a.date.localeCompare(b.date))
                const chartData = arr.slice(-12).map(d => ({ date: d.date.slice(5), val: d.valeur }))
                if (chartData.length < 2) return (
                  <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.surface, borderRadius: 10, color: C.muted, fontSize: 12 }}>
                    Moins de 2 mesures pour ce KPI
                  </div>
                )
                return (
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: C.muted }} />
                      <YAxis tick={{ fontSize: 9, fill: C.muted }} />
                      <Tooltip contentStyle={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 8, color: C.text, fontSize: 11 }} />
                      <Line type="monotone" dataKey="val" stroke={kpi.color} strokeWidth={2} dot={{ fill: kpi.color, r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )
              })()}
              <div style={{ fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 6 }}>Cliquez sur un KPI pour changer le graphique</div>
            </div>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid ' + C.border }}>
              {deleteConfirm?.userId === j.user_id ? (
                deleteConfirm.step === 1 ? (
                  <div style={{ background: C.red + '12', border: '1px solid ' + C.red + '40', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 4 }}>Supprimer le compte de {j.prenom || '—'} {j.nom || ''} ?</div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>Toutes ses séances et performances seront supprimées.</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid ' + C.border, background: C.surface, color: C.muted, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
                      <button onClick={() => setDeleteConfirm({ userId: j.user_id, step: 2 })} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: C.red + '25', color: C.red, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>Continuer →</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: C.red + '20', border: '2px solid ' + C.red + '70', borderRadius: 12, padding: '14px' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.red, marginBottom: 6 }}>⚠️ Action irréversible</div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>
                      Le compte de <strong style={{ color: C.text }}>{j.prenom} {j.nom}</strong> et <strong style={{ color: C.text }}>toutes ses données</strong> seront définitivement supprimés.<br />
                      Cette action est <strong style={{ color: C.red }}>impossible à annuler</strong>.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid ' + C.border, background: C.surface, color: C.muted, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
                      <button onClick={() => deleteUserAccount(j.user_id)} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: C.red, color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 800 }}>🗑️ Supprimer définitivement</button>
                    </div>
                  </div>
                )
              ) : (
                <button onClick={() => setDeleteConfirm({ userId: j.user_id, step: 1 })}
                  style={{ width: '100%', padding: '9px', borderRadius: 10, border: '1px solid ' + C.red + '35', background: 'transparent', color: C.red, fontSize: 12, cursor: 'pointer', fontWeight: 600, opacity: 0.75 }}>
                  Supprimer ce compte
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderProgrammeCatalog = (teamId) => (
    <div>
      {!editingProg ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Catalogue de programmes</div>
            <button onClick={() => { setProgDraft({ name: '', start_date: '', end_date: '', sessions: JSON.parse(JSON.stringify(SESSIONS)) }); setEditingProgramId(null); setEditingProg(true) }}
              style={{ padding: '9px 16px', background: C.accent, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              + Nouveau programme
            </button>
          </div>

          {getProgramsForTeam(teamId).length === 0 ? (
            <div style={{ background: C.card, borderRadius: 16, padding: 32, textAlign: 'center', color: C.muted }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
              Aucun programme planifié pour cette équipe
            </div>
          ) : (
            getProgramsForTeam(teamId).map(prog => {
              const today = toDateStr(new Date())
              const status = today < prog.start_date ? { label: 'À venir', color: C.gold } : today > prog.end_date ? { label: 'Terminé', color: C.muted } : { label: 'En cours', color: C.green }
              return (
                <div key={prog.id} style={{ background: C.card, borderRadius: 14, padding: 16, marginBottom: 10, border: '1px solid ' + C.border }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 800, fontSize: 15 }}>{prog.name}</div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: status.color, background: status.color + '20', padding: '2px 8px', borderRadius: 8 }}>{status.label}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.muted }}>
                        Du {new Date(prog.start_date).toLocaleDateString('fr-FR')} au {new Date(prog.end_date).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => { setProgDraft({ name: prog.name, start_date: prog.start_date, end_date: prog.end_date, sessions: JSON.parse(JSON.stringify(prog.sessions)) }); setEditingProgramId(prog.id); setEditingProg(true) }}
                        style={{ padding: '7px 10px', background: C.surface, color: C.text, border: '1px solid ' + C.border, borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>✏️</button>
                      <button onClick={() => deleteProgram(prog.id)}
                        style={{ padding: '7px 10px', background: 'transparent', color: C.red, border: '1px solid ' + C.red + '40', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>🗑️</button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{editingProgramId ? 'Modifier le programme' : 'Nouveau programme'}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setEditingProg(false); setProgDraft(null); setEditingProgramId(null) }}
                style={{ padding: '9px 14px', background: C.surface, color: C.muted, border: '1px solid ' + C.border, borderRadius: 10, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
                Annuler
              </button>
              <button onClick={() => saveProgram(teamId, progDraft, editingProgramId)}
                style={{ padding: '9px 18px', background: C.green, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                ✓ Sauvegarder
              </button>
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 14, padding: 16, marginBottom: 16, border: '1px solid ' + C.border }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>NOM DU PROGRAMME</div>
              <input value={progDraft.name} onChange={e => setProgDraft(d => ({ ...d, name: e.target.value }))} placeholder="Ex : Reprise estivale"
                style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>DÉBUT</div>
                <input type="date" value={progDraft.start_date} onChange={e => setProgDraft(d => ({ ...d, start_date: e.target.value }))}
                  style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>FIN</div>
                <input type="date" value={progDraft.end_date} onChange={e => setProgDraft(d => ({ ...d, end_date: e.target.value }))}
                  style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Semaine type</div>
          {progDraft.sessions.map((s, si) => (
            <div key={s.day} style={{ background: C.card, borderRadius: 16, marginBottom: 12, border: '1px solid ' + s.color + '50', overflow: 'hidden' }}>
              {/* En-tête du jour */}
              <div style={{ background: s.color + '18', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{s.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: s.color, fontWeight: 700 }}>{s.day}</div>
                  <input value={s.label}
                    onChange={e => { const d = JSON.parse(JSON.stringify(progDraft)); d.sessions[si].label = e.target.value; setProgDraft(d) }}
                    style={{ background: 'transparent', border: 'none', borderBottom: '1px solid ' + s.color + '60', color: C.text, fontSize: 15, fontWeight: 700, outline: 'none', width: '100%' }} />
                </div>
                <input value={s.duration}
                  onChange={e => { const d = JSON.parse(JSON.stringify(progDraft)); d.sessions[si].duration = e.target.value; setProgDraft(d) }}
                  style={{ background: 'transparent', border: '1px solid ' + s.color + '50', borderRadius: 6, color: s.color, fontSize: 12, padding: '4px 8px', outline: 'none', width: 65, textAlign: 'center', fontWeight: 700 }} />
              </div>

              {/* Objectif + blocs */}
              <div style={{ padding: '10px 16px 16px' }}>
                <input value={s.objectif}
                  onChange={e => { const d = JSON.parse(JSON.stringify(progDraft)); d.sessions[si].objectif = e.target.value; setProgDraft(d) }}
                  style={{ width: '100%', background: s.color + '10', border: '1px solid ' + s.color + '30', borderRadius: 8, padding: '7px 12px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
                  placeholder="Objectif de la séance..." />

                {s.blocs.map((bloc, bi) => (
                  <div key={bi} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <input value={bloc.titre}
                        onChange={e => { const d = JSON.parse(JSON.stringify(progDraft)); d.sessions[si].blocs[bi].titre = e.target.value; setProgDraft(d) }}
                        style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid ' + C.border, color: C.text, fontSize: 13, fontWeight: 700, outline: 'none', marginRight: 10 }} />
                      <input value={bloc.duree}
                        onChange={e => { const d = JSON.parse(JSON.stringify(progDraft)); d.sessions[si].blocs[bi].duree = e.target.value; setProgDraft(d) }}
                        style={{ background: 'transparent', border: '1px solid ' + s.color + '40', borderRadius: 6, color: s.color, fontSize: 11, padding: '2px 6px', outline: 'none', width: 70, textAlign: 'center' }} />
                    </div>
                    <textarea value={bloc.exercices.join('\n')}
                      onChange={e => { const d = JSON.parse(JSON.stringify(progDraft)); d.sessions[si].blocs[bi].exercices = e.target.value.split('\n'); setProgDraft(d) }}
                      rows={Math.max(3, bloc.exercices.length + 1)}
                      style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7, boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const tabContent = (
    <div style={{ paddingBottom: isMobile ? 80 : 24 }}>

      {/* ── DASHBOARD ── */}
      {tab === 'dashboard' && (
        <div>
          <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2a4a)', borderRadius: 16, padding: 16, marginBottom: 16, border: '1px solid ' + C.accent + '30' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: C.muted }}>ASSIDUITÉ 7 JOURS</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: C.accentGlow }}>{getWeekCompliance()}%</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: C.muted }}>Séances aujourd'hui</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.green }}>{SESSIONS.filter(s => isSeanceDone(s.day)).length}</div>
              </div>
            </div>
            <div style={{ background: C.surface, borderRadius: 8, height: 8, overflow: 'hidden' }}>
              <div style={{ width: getWeekCompliance() + '%', height: '100%', background: 'linear-gradient(90deg, ' + C.accent + ', ' + C.green + ')', borderRadius: 8, transition: 'width 0.5s' }} />
            </div>
          </div>

          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Mes équipes</div>
          {(() => {
            const myTeams = availableTeams.filter(t => myTeamIds.has(t.id))
            if (myTeams.length === 0) return (
              <div style={{ background: C.card, borderRadius: 14, padding: 16, textAlign: 'center', color: C.muted, fontSize: 13, marginBottom: 16, border: '1px solid ' + C.border }}>
                Tu n'as pas encore rejoint d'équipe. Rends-toi dans l'onglet Profil pour en rejoindre une.
              </div>
            )
            return (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                {myTeams.map(team => (
                  <div key={team.id} style={{ background: C.card, borderRadius: 14, border: '1px solid ' + team.color + '40', overflow: 'hidden' }}>
                    <div style={{ height: 3, background: team.color }} />
                    <div style={{ padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: team.color + '20', border: '1px solid ' + team.color + '50', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {team.photo_url ? <img src={team.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 18 }}>🏟️</span>}
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: team.color, background: team.color + '20', padding: '2px 8px', borderRadius: 8, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>ÉQUIPE</span>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.name}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>⚽ Football</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}

          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Performances clés</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            {KPI_CONFIG.filter(k => getDashboardKpiIds().includes(k.id)).map(kpi => {
              const val = getLatest(kpi.id); const prog = getProgress(kpi.id)
              return (
                <div key={kpi.id} style={{ background: C.card, borderRadius: 14, padding: 14, border: '1px solid ' + C.border, minWidth: 0, overflow: 'hidden' }}>
                  <div onClick={() => { setSelectedKpi(kpi.id); changeTab('stats') }} style={{ cursor: 'pointer' }}>
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{kpi.icon}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kpi.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {val !== null ? val : '—'}<span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}> {kpi.unit}</span>
                    </div>
                    {prog !== null && <div style={{ fontSize: 11, color: parseFloat(prog) >= 0 ? C.green : C.red, marginTop: 4, fontWeight: 600 }}>{parseFloat(prog) >= 0 ? '▲' : '▼'} {Math.abs(prog)}%</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, minWidth: 0 }}>
                    <input type="number" placeholder={'Valeur en ' + kpi.unit} value={inputValues[kpi.id] || ''}
                      onChange={e => setInputValues(v => ({ ...v, [kpi.id]: e.target.value }))}
                      style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '7px 8px', color: C.text, fontSize: 14, outline: 'none', minWidth: 0, width: 0 }} />
                    <button onClick={() => inputValues[kpi.id] && saveMesure(kpi.id, inputValues[kpi.id])}
                      style={{ padding: '7px 10px', background: inputValues[kpi.id] ? kpi.color : C.surface, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>✓</button>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Mental du jour</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {KPI_CONFIG.filter(k => ['motivation', 'sommeil'].includes(k.id)).map(kpi => {
              const val = getLatest(kpi.id)
              return (
                <div key={kpi.id} style={{ background: C.card, borderRadius: 14, padding: 14, border: '1px solid ' + C.border, minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>{kpi.icon}</span>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, lineHeight: 1.2 }}>{kpi.label}</div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: kpi.color, marginBottom: 8 }}>
                    {val !== null ? val : '—'}<span style={{ fontSize: 10, color: C.muted, fontWeight: 400 }}> {kpi.unit}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="number" min="0" max="10" placeholder="/10" value={inputValues[kpi.id] || ''}
                      onChange={e => setInputValues(v => ({ ...v, [kpi.id]: e.target.value }))}
                      style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '7px 8px', color: C.text, fontSize: 14, outline: 'none', minWidth: 0, width: 0 }} />
                    <button onClick={() => inputValues[kpi.id] && saveMesure(kpi.id, inputValues[kpi.id])}
                      style={{ padding: '7px 10px', background: inputValues[kpi.id] ? kpi.color : C.surface, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>✓</button>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Programme du jour</div>
          {(() => {
            const myTeamsWithProgram = availableTeams.filter(t => myTeamIds.has(t.id) && getProgramsForTeam(t.id).length > 0)
            const todayDayCode = Object.keys(dayMap).find(k => dayMap[k] === todayDow)
            let todaySessions = SESSIONS.filter(s => s.day === todayDayCode)
            let todayTeam = null
            let toggleTeamId = null
            if (myTeamsWithProgram.length === 1) {
              const program = getProgramForDate(myTeamsWithProgram[0].id, toDateStr(new Date()))
              const s = program?.sessions.find(x => x.day === todayDayCode)
              if (s) { todaySessions = [s]; todayTeam = myTeamsWithProgram[0]; toggleTeamId = myTeamsWithProgram[0].id }
              else todaySessions = []
            }
            if (todaySessions.length === 0) {
              return <div style={{ background: C.card, borderRadius: 14, padding: 16, textAlign: 'center', color: C.muted, fontSize: 14 }}>Va dans "Programme" pour valider ton entraînement</div>
            }
            return todaySessions.map(s => {
              const done = isSeanceDone(s.day, undefined, toggleTeamId); const expanded = expandedDayDashboard === s.day
              return (
                <div key={s.day} style={{ marginBottom: 10, borderRadius: 14, overflow: 'hidden', border: '1px solid ' + (done ? C.green + '60' : expanded ? s.color + '50' : C.border) }}>
                  <div onClick={() => setExpandedDayDashboard(expanded ? null : s.day)}
                    style={{ background: done ? 'linear-gradient(135deg, #064e3b, #065f46)' : expanded ? s.color + '15' : C.card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <div style={{ fontSize: 24 }}>{s.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{s.label}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{s.duration} • {todayTeam ? todayTeam.name : s.blocs.length + ' blocs'}</div>
                    </div>
                    <div style={{ fontSize: 18, color: C.muted, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>⌄</div>
                  </div>
                  {renderSessionBlocs(s, expanded, done, () => toggleSeance(s.day, undefined, toggleTeamId))}
                </div>
              )
            })
          })()}
        </div>
      )}

      {/* ── SEANCES ── */}
      {tab === 'seances' && (() => {
        const myTeamsWithProgram = availableTeams.filter(t => myTeamIds.has(t.id) && getProgramsForTeam(t.id).length > 0)

        if (myTeamsWithProgram.length === 0) {
          return (
            <div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Programme de la semaine</div>
              {SESSIONS.map(s => {
                const done = isSeanceDone(s.day); const expanded = expandedDay === s.day
                return (
                  <div key={s.day} style={{ marginBottom: 10, borderRadius: 16, overflow: 'hidden', border: '1px solid ' + (done ? C.green + '60' : expanded ? s.color + '50' : C.border) }}>
                    <div onClick={() => setExpandedDay(expanded ? null : s.day)}
                      style={{ background: done ? 'linear-gradient(135deg, #064e3b, #065f46)' : expanded ? s.color + '18' : C.card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: done ? C.green + '30' : s.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{s.day} — {s.label}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{s.duration} • {s.blocs.length} blocs</div>
                      </div>
                      <div style={{ fontSize: 18, color: C.muted, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>⌄</div>
                    </div>
                    {renderSessionBlocs(s, expanded, done, () => toggleSeance(s.day))}
                  </div>
                )
              })}
            </div>
          )
        }

        const allProgs = myTeamsWithProgram.flatMap(t => getProgramsForTeam(t.id))
        const minDate = allProgs.reduce((acc, p) => p.start_date < acc ? p.start_date : acc, allProgs[0].start_date)
        const maxDate = allProgs.reduce((acc, p) => p.end_date > acc ? p.end_date : acc, allProgs[0].end_date)

        const weekMonday = getMonday(new Date())
        weekMonday.setDate(weekMonday.getDate() + seancesWeekOffset * 7)
        const weekDates = DAY_ORDER.map((day, i) => {
          const d = new Date(weekMonday); d.setDate(d.getDate() + i)
          return { day, date: d, dateStr: toDateStr(d) }
        })

        const firstWeekMondayStr = toDateStr(getMonday(new Date(minDate + 'T00:00:00')))
        const lastWeekMondayStr = toDateStr(getMonday(new Date(maxDate + 'T00:00:00')))
        const currentWeekMondayStr = toDateStr(weekMonday)
        const canGoPrev = currentWeekMondayStr > firstWeekMondayStr
        const canGoNext = currentWeekMondayStr < lastWeekMondayStr

        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <button onClick={() => canGoPrev && setSeancesWeekOffset(o => o - 1)} disabled={!canGoPrev}
                style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid ' + C.border, background: C.card, color: canGoPrev ? C.text : C.border, fontSize: 16, cursor: canGoPrev ? 'pointer' : 'default' }}>‹</button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {weekDates[0].date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {weekDates[6].date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </div>
                {seancesWeekOffset !== 0 && (
                  <button onClick={() => setSeancesWeekOffset(0)} style={{ background: 'none', border: 'none', color: C.accent, fontSize: 11, cursor: 'pointer', padding: 0, marginTop: 2 }}>Revenir à aujourd'hui</button>
                )}
              </div>
              <button onClick={() => canGoNext && setSeancesWeekOffset(o => o + 1)} disabled={!canGoNext}
                style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid ' + C.border, background: C.card, color: canGoNext ? C.text : C.border, fontSize: 16, cursor: canGoNext ? 'pointer' : 'default' }}>›</button>
            </div>

            {weekDates.map(({ day, date, dateStr }) => {
              const dateLabel = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
              const entries = myTeamsWithProgram
                .map(team => {
                  const program = getProgramForDate(team.id, dateStr)
                  const s = program?.sessions.find(x => x.day === day)
                  return s ? { team, program, s } : null
                })
                .filter(Boolean)

              if (entries.length === 0) {
                return (
                  <div key={dateStr} style={{ marginBottom: 10, borderRadius: 16, border: '1px dashed ' + C.border, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.55 }}>
                    <div style={{ fontSize: 20 }}>💤</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'capitalize' }}>{dateLabel}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>Hors programme</div>
                    </div>
                  </div>
                )
              }

              return (
                <div key={dateStr} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 6, textTransform: 'capitalize' }}>{dateLabel}</div>
                  {entries.map(({ team, program, s }) => {
                    const cardKey = dateStr + '_' + team.id
                    const done = isSeanceDone(day, dateStr, team.id); const expanded = expandedDay === cardKey
                    return (
                      <div key={cardKey} style={{ marginBottom: 10, borderRadius: 16, overflow: 'hidden', border: '1px solid ' + (done ? C.green + '60' : expanded ? s.color + '50' : C.border) }}>
                        <div onClick={() => setExpandedDay(expanded ? null : cardKey)}
                          style={{ background: done ? 'linear-gradient(135deg, #064e3b, #065f46)' : expanded ? s.color + '18' : C.card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                          <div style={{ width: 42, height: 42, borderRadius: 12, background: done ? C.green + '30' : s.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{s.label}</div>
                            <div style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                              <span>{s.duration}</span>
                              <span>•</span>
                              <span style={{ color: team.color, fontWeight: 700 }}>{team.name}</span>
                              <span>•</span>
                              <span>{program.name}</span>
                            </div>
                          </div>
                          <div style={{ fontSize: 18, color: C.muted, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>⌄</div>
                        </div>
                        {renderSessionBlocs(s, expanded, done, () => toggleSeance(day, dateStr, team.id))}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* ── KPI ── */}
      {tab === 'kpi' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
            {['physique', 'technique', 'mental'].map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', background: activeCategory === cat ? C.accent : C.surface, color: activeCategory === cat ? '#fff' : C.muted }}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            {KPI_CONFIG.filter(k => k.category === activeCategory).map(kpi => {
              const val = getLatest(kpi.id)
              return (
                <div key={kpi.id} style={{ background: C.card, borderRadius: 14, padding: 16, border: '1px solid ' + C.border }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 24 }}>{kpi.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700 }}>{kpi.label}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>Dernière : {val !== null ? val + ' ' + kpi.unit : 'Non renseigné'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input type="number" placeholder={'Valeur en ' + kpi.unit} value={inputValues[kpi.id] || ''}
                      onChange={e => setInputValues(v => ({ ...v, [kpi.id]: e.target.value }))}
                      style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 16, outline: 'none' }} />
                    <button onClick={() => inputValues[kpi.id] && saveMesure(kpi.id, inputValues[kpi.id])}
                      style={{ padding: '10px 18px', background: inputValues[kpi.id] ? kpi.color : C.surface, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>✓</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── STATS ── */}
      {tab === 'stats' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
            {KPI_CONFIG.map(kpi => (
              <button key={kpi.id} onClick={() => setSelectedKpi(kpi.id)}
                style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', background: selectedKpi === kpi.id ? kpi.color : C.surface, color: '#fff', opacity: selectedKpi === kpi.id ? 1 : 0.6 }}>
                {kpi.icon} {kpi.label.split(' ')[0]}
              </button>
            ))}
          </div>
          {(() => {
            const kpi = KPI_CONFIG.find(k => k.id === selectedKpi)
            const arr = getMesuresForKpi(selectedKpi)
            const chartData = arr.slice(-12).map(d => ({ date: d.date.slice(5), val: d.valeur }))
            const prog = getProgress(selectedKpi); const val = getLatest(selectedKpi)
            return (
              <div>
                <div style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 14, border: '1px solid ' + C.border }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, color: C.muted }}>{kpi.label.toUpperCase()}</div>
                      <div style={{ fontSize: 36, fontWeight: 900, color: kpi.color }}>{val !== null ? val : '—'}<span style={{ fontSize: 16, color: C.muted }}> {kpi.unit}</span></div>
                    </div>
                    {prog !== null && (
                      <div style={{ background: parseFloat(prog) >= 0 ? C.green + '20' : C.red + '20', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: parseFloat(prog) >= 0 ? C.green : C.red }}>{parseFloat(prog) >= 0 ? '+' : ''}{prog}%</div>
                        <div style={{ fontSize: 10, color: C.muted }}>progression</div>
                      </div>
                    )}
                  </div>
                  {chartData.length > 1 ? (
                    <ResponsiveContainer width="100%" height={isMobile ? 160 : 220}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.muted }} />
                        <YAxis tick={{ fontSize: 10, fill: C.muted }} />
                        <Tooltip contentStyle={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 8, color: C.text }} />
                        <Line type="monotone" dataKey="val" stroke={kpi.color} strokeWidth={2.5} dot={{ fill: kpi.color, r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 13 }}>Enregistre au moins 2 mesures pour voir le graphique</div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Historique</div>
                {arr.slice().reverse().slice(0, 10).map(entry => {
                  const isConf = confirmDelete && confirmDelete.id === entry.id
                  return (
                    <div key={entry.id} style={{ background: isConf ? '#3f0f0f' : C.card, borderRadius: 10, padding: '10px 14px', marginBottom: 8, border: '1px solid ' + (isConf ? C.red + '60' : C.border), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: C.muted, fontSize: 13 }}>{new Date(entry.date).toLocaleDateString('fr-FR')}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: kpi.color, fontWeight: 700 }}>{entry.valeur} {kpi.unit}</span>
                        {isConf ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => deleteMesure(entry.id)} style={{ background: C.red, color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Confirmer</button>
                            <button onClick={() => setConfirmDelete(null)} style={{ background: C.surface, color: C.muted, border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Annuler</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDelete({ id: entry.id })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.4 }}>🗑️</button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {arr.length === 0 && <div style={{ textAlign: 'center', color: C.muted, padding: 20, fontSize: 13 }}>Aucune donnée pour l'instant</div>}
              </div>
            )
          })()}
        </div>
      )}

      {/* ── CHAT ── */}
      {tab === 'chat' && (() => {
        const myTeams = availableTeams.filter(t => myTeamIds.has(t.id))
        if (myTeams.length === 0) {
          return (
            <div style={{ background: C.card, borderRadius: 16, padding: 32, textAlign: 'center', color: C.muted }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
              Rejoins une équipe pour accéder à son tchat
            </div>
          )
        }
        const activeTeamId = myTeams.some(t => t.id === chatTeamId) ? chatTeamId : myTeams[0].id
        const activeTeam = myTeams.find(t => t.id === activeTeamId)
        return (
          <div>
            {myTeams.length > 1 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {myTeams.map(team => {
                  const sel = activeTeamId === team.id
                  return (
                    <button key={team.id} onClick={() => setChatTeamId(team.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 20, border: '2px solid ' + (sel ? team.color : C.border), background: sel ? team.color + '20' : C.card, color: sel ? team.color : C.muted, fontWeight: sel ? 700 : 500, fontSize: 13, cursor: 'pointer' }}>
                      {team.name}
                    </button>
                  )
                })}
              </div>
            )}

            <div style={{ maxHeight: isMobile ? '50vh' : 500, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 2px', marginBottom: 12 }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, marginTop: 30 }}>
                  Aucun message pour l'instant — lance la discussion !
                </div>
              )}
              {chatMessages.map(m => {
                const mine = m.user_id === user.id
                return (
                  <div key={m.id} style={{ display: 'flex', flexDirection: mine ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                      {m.sender_photo_url ? <img src={m.sender_photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚽'}
                    </div>
                    <div style={{ maxWidth: '72%' }}>
                      {!mine && <div style={{ fontSize: 11, color: C.muted, marginBottom: 2, marginLeft: 4 }}>{m.sender_prenom}{m.sender_surnom ? ' "' + m.sender_surnom + '"' : ''}</div>}
                      <div style={{ background: mine ? C.accent : C.card, color: mine ? '#fff' : C.text, border: mine ? 'none' : '1px solid ' + C.border, borderRadius: 14, padding: '8px 12px', fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word' }}>
                        {m.content}
                      </div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2, textAlign: mine ? 'right' : 'left' }}>
                        {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {(mine || isAdmin) && (
                      <button onClick={() => deleteChatMessage(m.id)}
                        style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12, opacity: 0.5, flexShrink: 0 }}>🗑️</button>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid ' + C.border }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                placeholder={'Écrire à ' + (activeTeam?.name || '...')}
                style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, borderRadius: 20, padding: '10px 16px', color: C.text, fontSize: 14, outline: 'none', minWidth: 0 }} />
              <button onClick={sendChatMessage} disabled={!chatInput.trim()}
                style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', background: chatInput.trim() ? C.accent : C.surface, color: '#fff', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>➤</button>
            </div>
          </div>
        )
      })()}

      {/* ── ÉQUIPE (ADMIN) ── */}
      {tab === 'equipe' && isAdmin && (
        <div>
          {/* Sélecteur d'équipe */}
          {teams.length === 0 ? (
            <div style={{ background: C.card, borderRadius: 16, padding: 32, textAlign: 'center', color: C.muted }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🏟️</div>
              <div style={{ fontWeight: 700 }}>Aucune équipe créée</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Créez des équipes depuis l'onglet Admin</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {teams.map(team => {
                  const sel = equipeTeamId === team.id
                  return (
                    <button key={team.id} onClick={() => { setEquipeTeamId(team.id); setEditingProg(false); setProgDraft(null); setEditingProgramId(null) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 20, border: '2px solid ' + (sel ? team.color : C.border), background: sel ? team.color + '20' : C.card, color: sel ? team.color : C.muted, fontWeight: sel ? 700 : 500, fontSize: 14, cursor: 'pointer' }}>
                      {team.photo_url
                        ? <img src={team.photo_url} alt="" style={{ width: 22, height: 22, borderRadius: 6, objectFit: 'cover' }} />
                        : <span style={{ width: 10, height: 10, borderRadius: '50%', background: team.color, display: 'inline-block' }} />}
                      {team.name}
                    </button>
                  )
                })}
              </div>

              {!equipeTeamId && (
                <div style={{ background: C.card, borderRadius: 16, padding: 32, textAlign: 'center', color: C.muted }}>
                  Sélectionne une équipe ci-dessus
                </div>
              )}

              {equipeTeamId && (() => {
                const team = teams.find(t => t.id === equipeTeamId)
                const teamPlayers = adminData.filter(j => (j.teams || []).some(t => t.id === equipeTeamId))
                return (
                  <>
                    {/* Sub-tabs */}
                    <div style={{ display: 'flex', background: C.surface, borderRadius: 12, padding: 4, marginBottom: 20, gap: 2 }}>
                      {[{ id: 'perf', icon: '📊', label: 'Performances' }, { id: 'programme', icon: '📋', label: 'Programme' }].map(t => (
                        <button key={t.id} onClick={() => { setEquipeTab(t.id); setEditingProg(false); setProgDraft(null); setEditingProgramId(null) }}
                          style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: equipeTab === t.id ? C.accent : 'transparent', color: equipeTab === t.id ? '#fff' : C.muted, transition: 'all 0.2s' }}>
                          {t.icon} {t.label}
                        </button>
                      ))}
                    </div>

                    {/* ── PERFORMANCES ── */}
                    {equipeTab === 'perf' && (
                      <div>
                        {teamPlayers.length === 0 ? (
                          <div style={{ background: C.card, borderRadius: 14, padding: 32, textAlign: 'center', color: C.muted }}>
                            <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
                            Aucun joueur dans cette équipe
                          </div>
                        ) : (
                          <>
                            {/* KPI selector */}
                            <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
                              {KPI_CONFIG.map(kpi => (
                                <button key={kpi.id} onClick={() => setEquipeKpi(kpi.id)}
                                  style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', background: equipeKpi === kpi.id ? kpi.color : C.surface, color: '#fff', opacity: equipeKpi === kpi.id ? 1 : 0.55, flexShrink: 0 }}>
                                  {kpi.icon} {kpi.label.split(' ')[0]}
                                </button>
                              ))}
                            </div>

                            {(() => {
                              const kpi = KPI_CONFIG.find(k => k.id === equipeKpi)

                              /* Graphique comparatif en barres — valeurs actuelles */
                              const barData = teamPlayers
                                .filter(j => j.kpis?.[equipeKpi] != null)
                                .map((j, idx) => ({
                                  name: (j.prenom || '?') + ' ' + (j.nom?.[0] || '') + '.',
                                  val: j.kpis[equipeKpi],
                                  color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
                                }))
                                .sort((a, b) => kpi.lower ? a.val - b.val : b.val - a.val)

                              /* Données timeline pour chaque joueur */
                              const playerCharts = teamPlayers.map((j, idx) => {
                                const arr = (j.mesuresData || [])
                                  .filter(m => m.kpi_id === equipeKpi)
                                  .sort((a, b) => a.date.localeCompare(b.date))
                                return {
                                  player: j,
                                  color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
                                  chartData: arr.slice(-10).map(d => ({ date: d.date.slice(5), val: d.valeur })),
                                  latest: arr.length > 0 ? arr[arr.length - 1].valeur : null,
                                  prog: arr.length >= 2 ? (kpi.lower
                                    ? ((arr[0].valeur - arr[arr.length-1].valeur) / arr[0].valeur * 100).toFixed(1)
                                    : ((arr[arr.length-1].valeur - arr[0].valeur) / arr[0].valeur * 100).toFixed(1)
                                  ) : null,
                                }
                              })

                              return (
                                <>
                                  {/* Podium - vue comparative */}
                                  {barData.length > 0 && (
                                    <div style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 20, border: '1px solid ' + C.border }}>
                                      <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                                        Comparaison — {kpi.label} {kpi.lower ? '(moins = mieux)' : ''}
                                      </div>
                                      <ResponsiveContainer width="100%" height={180}>
                                        <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
                                          <XAxis type="number" tick={{ fontSize: 10, fill: C.muted }} />
                                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: C.text }} width={70} />
                                          <Tooltip
                                            contentStyle={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 8, color: C.text, fontSize: 12 }}
                                            formatter={v => [v + ' ' + kpi.unit, kpi.label]} />
                                          <Bar dataKey="val" radius={[0, 6, 6, 0]}>
                                            {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                          </Bar>
                                        </BarChart>
                                      </ResponsiveContainer>
                                    </div>
                                  )}

                                  {/* Graphiques individuels */}
                                  <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                                    Courbe de progression par joueur
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                                    {playerCharts.map(({ player: j, color, chartData, latest, prog }) => (
                                      <div key={j.user_id} style={{ background: C.card, borderRadius: 14, border: '1px solid ' + C.border, overflow: 'hidden' }}>
                                        <div style={{ height: 3, background: color }} />
                                        <div style={{ padding: '12px 14px 8px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                                              {j.photo_url ? <img src={j.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚽'}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                              <div style={{ fontWeight: 700, fontSize: 13 }}>{j.prenom} {j.nom}</div>
                                              <div style={{ fontSize: 11, color: C.muted }}>{j.poste1 || '—'}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                              <div style={{ fontSize: 20, fontWeight: 900, color: latest != null ? kpi.color : C.muted }}>
                                                {latest != null ? latest : '—'}
                                                <span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}> {kpi.unit}</span>
                                              </div>
                                              {prog != null && (
                                                <div style={{ fontSize: 11, fontWeight: 700, color: parseFloat(prog) >= 0 ? C.green : C.red }}>
                                                  {parseFloat(prog) >= 0 ? '▲' : '▼'} {Math.abs(prog)}%
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          {chartData.length >= 2 ? (
                                            <ResponsiveContainer width="100%" height={100}>
                                              <LineChart data={chartData}>
                                                <XAxis dataKey="date" tick={{ fontSize: 9, fill: C.muted }} />
                                                <YAxis tick={{ fontSize: 9, fill: C.muted }} width={28} />
                                                <Tooltip contentStyle={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 6, color: C.text, fontSize: 11 }} formatter={v => [v + ' ' + kpi.unit]} />
                                                <Line type="monotone" dataKey="val" stroke={color} strokeWidth={2} dot={{ fill: color, r: 3 }} activeDot={{ r: 5 }} />
                                              </LineChart>
                                            </ResponsiveContainer>
                                          ) : (
                                            <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 12 }}>
                                              Pas assez de données
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )
                            })()}
                          </>
                        )}
                      </div>
                    )}

                    {/* ── PROGRAMME (CATALOGUE) ── */}
                    {equipeTab === 'programme' && renderProgrammeCatalog(equipeTeamId)}
                  </>
                )
              })()}
            </>
          )}
        </div>
      )}

      {/* ── ÉQUIPE (JOUEUR) ── */}
      {tab === 'equipe' && !isAdmin && (() => {
        const myTeams = availableTeams.filter(t => myTeamIds.has(t.id))
        if (myTeams.length === 0) {
          return (
            <div style={{ background: C.card, borderRadius: 16, padding: 32, textAlign: 'center', color: C.muted }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
              Rejoins une équipe pour voir tes coéquipiers
            </div>
          )
        }
        const activeTeamId = myTeams.some(t => t.id === rosterTeamId) ? rosterTeamId : myTeams[0].id
        const activeTeam = myTeams.find(t => t.id === activeTeamId)
        const sortedPlayers = rosterPlayers.slice().sort((a, b) => (a.prenom || '').localeCompare(b.prenom || ''))
        return (
          <div>
            {myTeams.length > 1 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {myTeams.map(team => {
                  const sel = activeTeamId === team.id
                  return (
                    <button key={team.id} onClick={() => setRosterTeamId(team.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 20, border: '2px solid ' + (sel ? team.color : C.border), background: sel ? team.color + '20' : C.card, color: sel ? team.color : C.muted, fontWeight: sel ? 700 : 500, fontSize: 13, cursor: 'pointer' }}>
                      {team.name}
                    </button>
                  )
                })}
              </div>
            )}

            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
              {sortedPlayers.length} joueur{sortedPlayers.length !== 1 ? 's' : ''} · {activeTeam?.name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
              {sortedPlayers.map(p => (
                <div key={p.user_id} style={{ background: C.card, borderRadius: 14, padding: 14, border: '1px solid ' + C.border, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {p.photo_url ? <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚽'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.prenom || '—'} {p.nom || ''}{p.surnom && <span style={{ color: C.gold }}> "{p.surnom}"</span>}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{p.poste1 || '—'}{p.poste2 ? ' · ' + p.poste2 : ''}</div>
                    {p.role !== 'joueur' && (
                      <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 700, color: ROLE_CONFIG[p.role].color, background: ROLE_CONFIG[p.role].color + '18', padding: '2px 7px', borderRadius: 8 }}>
                        {ROLE_CONFIG[p.role].label}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ── ADMIN : VUE OVERVIEW ── */}
      {tab === 'admin' && isAdmin && adminView === 'overview' && (
        <div>
          {adminLoading && <div style={{ background: C.card, borderRadius: 14, padding: 16, textAlign: 'center', color: C.muted, marginBottom: 16 }}>Chargement...</div>}
          {adminError && <div style={{ background: C.red + '15', border: '1px solid ' + C.red + '40', borderRadius: 12, padding: '12px 14px', marginBottom: 14, fontSize: 12, color: C.red }}>{adminError}</div>}

          {/* Stats globales */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { val: adminData.length, label: 'JOUEURS', color: C.accent },
              { val: teams.length, label: 'ÉQUIPES', color: C.green },
              { val: adminData.filter(j => !j.teams || j.teams.length === 0).length, label: 'SANS ÉQUIPE', color: C.gold },
            ].map(s => (
              <div key={s.label} style={{ background: C.card, borderRadius: 14, padding: '14px 10px', border: '1px solid ' + C.border, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Inscriptions non confirmées */}
          {unconfirmedSignups.length > 0 && (
            <div style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 20, border: '1px solid ' + C.gold + '40' }}>
              <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                ⏳ Inscriptions non confirmées ({unconfirmedSignups.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {unconfirmedSignups.map(u => (
                  <div key={u.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.surface, borderRadius: 10, padding: '8px 12px', gap: 10 }}>
                    <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
                    <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{new Date(u.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Créer une équipe */}
          <div style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 20, border: '1px solid ' + C.border }}>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Nouvelle équipe</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" placeholder="Nom de l'équipe..." value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createTeam()}
                style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none' }} />
              <button onClick={createTeam} disabled={creatingTeam || !newTeamName.trim()}
                style={{ padding: '10px 18px', background: newTeamName.trim() ? C.accent : C.surface, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap', opacity: creatingTeam ? 0.6 : 1 }}>
                + Créer
              </button>
            </div>
          </div>

          {/* Gérer les clubs (liste proposée à l'inscription) */}
          <div style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 20, border: '1px solid ' + C.border }}>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Clubs proposés à l'inscription</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: clubs.length > 0 ? 12 : 0 }}>
              <input type="text" placeholder="Nom du club..." value={newClubName}
                onChange={e => setNewClubName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createClub()}
                style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none' }} />
              <button onClick={createClub} disabled={creatingClub || !newClubName.trim()}
                style={{ padding: '10px 18px', background: newClubName.trim() ? C.accent : C.surface, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap', opacity: creatingClub ? 0.6 : 1 }}>
                + Ajouter
              </button>
            </div>
            {clubs.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {clubs.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 6px 6px 12px', borderRadius: 16, background: C.surface, border: '1px solid ' + C.border, fontSize: 13 }}>
                    {c.name}
                    <button onClick={() => deleteClub(c.id)}
                      style={{ width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'transparent', color: C.red, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grille des équipes */}
          {teams.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Mes équipes</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 24 }}>
                {teams.map(team => {
                  const teamPlayers = adminData.filter(j => (j.teams || []).some(t => t.id === team.id))
                  const lastActivity = teamPlayers.reduce((acc, j) => {
                    const d = j.derniere_seance || j.derniere_mesure
                    return d && (!acc || d > acc) ? d : acc
                  }, null)
                  return (
                    <div key={team.id}
                      onClick={() => { setSelectedAdminTeam(team); setAdminView('team_detail'); setExpandedAdmin(null); setAdminDetailTab('joueurs'); setEditingProg(false); setProgDraft(null); setEditingProgramId(null) }}
                      style={{ background: C.card, borderRadius: 16, border: '1px solid ' + team.color + '40', overflow: 'hidden', cursor: 'pointer' }}>
                      <div style={{ height: 4, background: 'linear-gradient(90deg, ' + team.color + ', ' + team.color + '50)' }} />
                      <div style={{ padding: '16px 16px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 56, height: 56, borderRadius: 14, background: team.color + '25', border: '2px solid ' + team.color + '50', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {team.photo_url
                              ? <img src={team.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <span style={{ fontSize: 28 }}>🏟️</span>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 16 }}>{team.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                              <div style={{ fontSize: 13, color: team.color, fontWeight: 700 }}>{teamPlayers.length} joueur{teamPlayers.length > 1 ? 's' : ''}</div>
                              {lastActivity && <div style={{ fontSize: 11, color: C.muted }}>Actif {new Date(lastActivity).toLocaleDateString('fr-FR')}</div>}
                            </div>
                          </div>
                          <div style={{ fontSize: 18, color: C.muted }}>→</div>
                        </div>
                        {teamPlayers.length > 0 && (
                          <div style={{ display: 'flex', marginTop: 12 }}>
                            {teamPlayers.slice(0, 6).map((j, idx) => (
                              <div key={j.user_id} style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: '2px solid ' + C.card, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginLeft: idx > 0 ? -8 : 0 }}>
                                {j.photo_url ? <img src={j.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚽'}
                              </div>
                            ))}
                            {teamPlayers.length > 6 && (
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.surface, border: '2px solid ' + C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: C.muted, marginLeft: -8, fontWeight: 700 }}>
                                +{teamPlayers.length - 6}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Joueurs sans équipe */}
          {(() => {
            const unassigned = adminData.filter(j => !j.teams || j.teams.length === 0)
            if (unassigned.length === 0) return null
            return (
              <div>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Sans équipe ({unassigned.length})</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                  {unassigned.map(j => renderPlayerCard(j, 'unassigned_' + j.user_id))}
                </div>
              </div>
            )
          })()}

          {teams.length === 0 && adminData.length === 0 && !adminLoading && (
            <div style={{ background: C.card, borderRadius: 16, padding: 40, textAlign: 'center', color: C.muted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚽</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Aucun joueur inscrit</div>
              <div style={{ fontSize: 13 }}>Créez une équipe et invitez vos joueurs</div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button onClick={loadAdminData} disabled={adminLoading}
              style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '6px 14px', fontSize: 13, color: C.muted, cursor: 'pointer', fontWeight: 600 }}>
              {adminLoading ? '...' : '↻ Actualiser'}
            </button>
          </div>
        </div>
      )}

      {/* ── ADMIN : VUE ÉQUIPE ── */}
      {tab === 'admin' && isAdmin && adminView === 'team_detail' && selectedAdminTeam && (
        <div>
          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <button onClick={() => { setAdminView('overview'); setSelectedAdminTeam(null); setExpandedAdmin(null); setEditingProg(false); setProgDraft(null); setEditingProgramId(null) }}
              style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '8px 14px', color: C.muted, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              ← Retour
            </button>
            <div style={{ fontSize: 12, color: C.muted }}>Équipes</div>
            <div style={{ fontSize: 12, color: C.muted }}>›</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: selectedAdminTeam.color }}>{selectedAdminTeam.name}</div>
            <div style={{ marginLeft: 'auto' }}>
              <button onClick={loadAdminData} disabled={adminLoading}
                style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '6px 12px', fontSize: 13, color: C.muted, cursor: 'pointer' }}>
                {adminLoading ? '...' : '↻'}
              </button>
            </div>
          </div>

          {/* Carte équipe */}
          <div style={{ background: C.card, borderRadius: 20, border: '2px solid ' + selectedAdminTeam.color + '40', overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ height: 6, background: 'linear-gradient(90deg, ' + selectedAdminTeam.color + ', ' + selectedAdminTeam.color + '40)' }} />
            <div style={{ padding: '20px 20px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <label style={{ position: 'relative', cursor: uploadingTeamPhoto === selectedAdminTeam.id ? 'wait' : 'pointer', flexShrink: 0 }}>
                  <div style={{ width: 72, height: 72, borderRadius: 18, background: selectedAdminTeam.color + '25', border: '3px solid ' + selectedAdminTeam.color + '50', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: uploadingTeamPhoto === selectedAdminTeam.id ? 0.6 : 1 }}>
                    {uploadingTeamPhoto === selectedAdminTeam.id
                      ? <span style={{ fontSize: 28 }}>⏳</span>
                      : selectedAdminTeam.photo_url
                        ? <img src={selectedAdminTeam.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 36 }}>🏟️</span>}
                  </div>
                  <div style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>📷</div>
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingTeamPhoto !== null}
                    onChange={e => e.target.files[0] && uploadTeamPhoto(selectedAdminTeam.id, e.target.files[0])} />
                </label>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{selectedAdminTeam.name}</div>
                  <div style={{ fontSize: 14, color: selectedAdminTeam.color, fontWeight: 700, marginTop: 4 }}>
                    {adminData.filter(j => (j.teams || []).some(t => t.id === selectedAdminTeam.id)).length} joueur{adminData.filter(j => (j.teams || []).some(t => t.id === selectedAdminTeam.id)).length !== 1 ? 's' : ''}
                  </div>
                </div>
                <button onClick={() => shareInviteLink(selectedAdminTeam.id, selectedAdminTeam.name)} title="Partager le lien d'invitation"
                  style={{ width: 38, height: 38, borderRadius: 10, background: C.accent + '15', border: '1px solid ' + C.accent + '30', color: C.accent, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  🔗
                </button>
                <button onClick={() => deleteTeam(selectedAdminTeam.id)}
                  style={{ width: 38, height: 38, borderRadius: 10, background: C.red + '15', border: '1px solid ' + C.red + '30', color: C.red, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  🗑️
                </button>
              </div>
            </div>
          </div>

          {/* Sub-tabs */}
          <div style={{ display: 'flex', background: C.surface, borderRadius: 12, padding: 4, marginBottom: 20, gap: 2 }}>
            {[{ id: 'joueurs', icon: '👥', label: 'Joueurs' }, { id: 'programme', icon: '📋', label: 'Programme' }].map(t => (
              <button key={t.id} onClick={() => { setAdminDetailTab(t.id); setEditingProg(false); setProgDraft(null); setEditingProgramId(null) }}
                style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: adminDetailTab === t.id ? C.accent : 'transparent', color: adminDetailTab === t.id ? '#fff' : C.muted, transition: 'all 0.2s' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {adminDetailTab === 'joueurs' && (
            <>
              {/* Ajouter des joueurs */}
              {(() => {
                const notInTeam = adminData.filter(j => !(j.teams || []).some(t => t.id === selectedAdminTeam.id))
                if (notInTeam.length === 0) return null
                return (
                  <div style={{ background: C.card, borderRadius: 16, padding: '14px 16px', marginBottom: 20, border: '1px solid ' + C.border }}>
                    <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Ajouter des joueurs</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {notInTeam.map(j => (
                        <button key={j.user_id} onClick={() => togglePlayerTeam(j.user_id, selectedAdminTeam.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, border: '1px solid ' + C.border, background: C.surface, color: C.text, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>
                            {j.photo_url ? <img src={j.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚽'}
                          </div>
                          + {j.prenom || '?'} {j.nom || ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Joueurs de l'équipe */}
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Joueurs de l'équipe</div>
              {adminError && <div style={{ background: C.red + '15', border: '1px solid ' + C.red + '40', borderRadius: 12, padding: '12px 14px', marginBottom: 14, fontSize: 12, color: C.red }}>{adminError}</div>}
              {(() => {
                const teamPlayers = adminData.filter(j => (j.teams || []).some(t => t.id === selectedAdminTeam.id))
                if (teamPlayers.length === 0) return (
                  <div style={{ background: C.card, borderRadius: 16, padding: 40, textAlign: 'center', color: C.muted }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Aucun joueur dans cette équipe</div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>Ajoutez des joueurs depuis la section ci-dessus</div>
                  </div>
                )
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                    {teamPlayers.map(j => renderPlayerCard(j, 'team_' + j.user_id, selectedAdminTeam.id))}
                  </div>
                )
              })()}
            </>
          )}

          {adminDetailTab === 'programme' && renderProgrammeCatalog(selectedAdminTeam.id)}
        </div>
      )}

      {/* ── PROFIL ── */}
      {tab === 'profil' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, paddingTop: 8 }}>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, boxShadow: '0 0 30px rgba(59,130,246,0.4)' }}>
                {profil.photo_url ? <img src={profil.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚽'}
              </div>
              <label style={{ position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', fontSize: 15 }}>
                {uploadingPhoto ? '⏳' : '📷'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadPhoto(e.target.files[0])} />
              </label>
              {profil.photo_url && (
                <button onClick={deletePhoto} disabled={uploadingPhoto} title="Supprimer la photo"
                  style={{ position: 'absolute', bottom: 0, left: 0, width: 30, height: 30, borderRadius: '50%', background: C.red, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploadingPhoto ? 'default' : 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', fontSize: 13, opacity: uploadingPhoto ? 0.6 : 1 }}>
                  🗑️
                </button>
              )}
            </div>
            {!editMode && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{profil.prenom} {profil.nom}</div>
                <div style={{ fontSize: 16, color: C.gold, fontWeight: 700, marginTop: 2 }}>"{profil.surnom || 'TxT'}"</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{profil.poste1}{profil.poste2 ? ' · ' + profil.poste2 : ''}</div>
              </div>
            )}
          </div>

          {!editMode ? (
            <div style={{ maxWidth: isMobile ? '100%' : 480, margin: '0 auto' }}>
              {[
                { label: 'Nom', value: profil.nom, icon: '👤' },
                { label: 'Prénom', value: profil.prenom, icon: '🏷️' },
                { label: 'Surnom', value: profil.surnom, icon: '⚡' },
                { label: 'Club', value: profil.club, icon: '🏟️' },
                { label: 'Division', value: profil.division, icon: '🏆' },
                { label: 'Poste 1', value: profil.poste1, icon: '📍' },
                { label: 'Poste 2', value: profil.poste2, icon: '📍' },
              ].map(f => (
                <div key={f.label} style={{ background: C.card, borderRadius: 12, padding: '12px 16px', marginBottom: 8, border: '1px solid ' + C.border, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18 }}>{f.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{f.label.toUpperCase()}</div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{f.value || '—'}</div>
                  </div>
                </div>
              ))}

              {/* Sélecteur d'équipes (multi) pour l'utilisateur */}
              {availableTeams.length > 0 && (
                <div style={{ background: C.card, borderRadius: 12, padding: '12px 16px', marginBottom: 8, border: '1px solid ' + C.border }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <span style={{ fontSize: 18 }}>🏟️</span>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>MES ÉQUIPES</div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {availableTeams.map(team => {
                      const selected = myTeamIds.has(team.id)
                      return (
                        <button key={team.id} onClick={() => toggleMyTeam(team.id)}
                          style={{ padding: '6px 14px', borderRadius: 16, border: '2px solid ' + (selected ? team.color : C.border), background: selected ? team.color + '25' : 'transparent', color: selected ? team.color : C.muted, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {team.photo_url
                            ? <img src={team.photo_url} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'cover' }} />
                            : <span style={{ width: 8, height: 8, borderRadius: '50%', background: team.color, display: 'inline-block' }} />}
                          {selected ? '✓ ' : ''}{team.name}
                        </button>
                      )
                    })}
                  </div>
                  {myTeamIds.size === 0 && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Appuie sur une équipe pour la rejoindre</div>}
                </div>
              )}

              <button onClick={() => setEditMode(true)}
                style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', marginTop: 8 }}>
                ✏️ Modifier le profil
              </button>
              {!isStandalone && (
                <button onClick={handleInstall}
                  style={{ width: '100%', padding: 14, borderRadius: 14, border: '1px solid ' + C.accent + '50', cursor: 'pointer', fontWeight: 700, fontSize: 15, background: C.accent + '15', color: C.accentGlow, marginTop: 10 }}>
                  📲 Installer l'application
                </button>
              )}
              <button onClick={onSignOut}
                style={{ width: '100%', padding: 12, borderRadius: 14, border: '1px solid ' + C.border, cursor: 'pointer', fontWeight: 600, fontSize: 14, background: 'transparent', color: C.muted, marginTop: 10 }}>
                Déconnexion
              </button>
            </div>
          ) : (
            <div style={{ maxWidth: isMobile ? '100%' : 480, margin: '0 auto' }}>
              {[
                { key: 'nom', label: 'Nom', placeholder: 'Nom de famille' },
                { key: 'prenom', label: 'Prénom', placeholder: 'Prénom' },
                { key: 'surnom', label: 'Surnom', placeholder: 'Ex: TxT' },
                { key: 'club', label: 'Club', placeholder: 'Nom du club' },
                { key: 'division', label: 'Division', placeholder: 'Ex: U17 D1' },
                { key: 'poste1', label: 'Poste 1', placeholder: 'Ex: Milieu Gauche' },
                { key: 'poste2', label: 'Poste 2', placeholder: 'Ex: Attaquant' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>{f.label.toUpperCase()}</div>
                  {f.key === 'club' ? (
                    <select value={profilEdit.club || ''} onChange={e => setProfilEdit(p => ({ ...p, club: e.target.value }))}
                      style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '12px 14px', color: C.text, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}>
                      <option value="">Sélectionne un club...</option>
                      {profilEdit.club && !clubs.some(c => c.name === profilEdit.club) && <option value={profilEdit.club}>{profilEdit.club}</option>}
                      {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  ) : (
                    <input type="text" placeholder={f.placeholder} value={profilEdit[f.key] || ''}
                      onChange={e => setProfilEdit(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '12px 14px', color: C.text, fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => { setProfilEdit(profil); setEditMode(false) }}
                  style={{ flex: 1, padding: 14, borderRadius: 14, border: '1px solid ' + C.border, cursor: 'pointer', fontWeight: 700, fontSize: 15, background: C.surface, color: C.muted }}>Annuler</button>
                <button onClick={saveProfil}
                  style={{ flex: 2, padding: 14, borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}>✓ Enregistrer</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Segoe UI', system-ui, sans-serif", color: C.text }}>

      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: C.green, color: '#fff', padding: '10px 20px', borderRadius: 20, zIndex: 999, fontSize: 14, fontWeight: 600, boxShadow: '0 4px 20px rgba(16,185,129,0.4)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '16px 20px', borderBottom: '1px solid ' + C.border, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div onClick={() => changeTab('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 0 20px rgba(59,130,246,0.4)', flexShrink: 0 }}>
              {profil.photo_url ? <img src={profil.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚽'}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>TxT Tracker</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{profil.prenom || 'Joueur'} • Talent × Travail × Temps</div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div onClick={() => changeTab('profil')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: C.muted }}>{todayStr}</div>
                <div style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>{profil.division || '—'} • {profil.club || '—'}</div>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, border: '2px solid ' + C.border }}>
                {profil.photo_url ? <img src={profil.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚽'}
              </div>
            </div>
            <button onClick={onSignOut} title="Se déconnecter"
              style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid ' + C.border, background: C.surface, color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isMobile ? (
        <>
          <div style={{ padding: '16px 16px 0' }}>{tabContent}</div>
          <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.card, borderTop: '1px solid ' + C.border, display: 'flex', padding: '8px 0 12px', zIndex: 50 }}>
            {NAV_ITEMS.map(t => (
              <button key={t.id} onClick={() => changeTab(t.id)}
                style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, opacity: tab === t.id ? 1 : 0.4, position: 'relative' }}>
                <span style={{ fontSize: 20, position: 'relative' }}>
                  {t.icon}
                  {t.id === 'chat' && totalUnread > 0 && (
                    <span style={{ position: 'absolute', top: -6, right: -10, background: C.red, color: '#fff', fontSize: 9, fontWeight: 800, borderRadius: 8, padding: '1px 5px', minWidth: 14, textAlign: 'center', lineHeight: '13px' }}>{totalUnread > 9 ? '9+' : totalUnread}</span>
                  )}
                </span>
                <span style={{ fontSize: 10, color: tab === t.id ? C.accent : C.muted, fontWeight: tab === t.id ? 700 : 400 }}>{t.label}</span>
              </button>
            ))}
          </nav>
        </>
      ) : (
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 77px)' }}>
          <nav style={{ width: 220, flexShrink: 0, background: C.card, borderRight: '1px solid ' + C.border, position: 'sticky', top: 77, height: 'calc(100vh - 77px)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 12px', flex: 1 }}>
              {NAV_ITEMS.map(t => (
                <button key={t.id} onClick={() => changeTab(t.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: tab === t.id ? C.accent + '18' : 'transparent', color: tab === t.id ? C.accent : C.muted, fontWeight: tab === t.id ? 700 : 400, fontSize: 14, marginBottom: 2, textAlign: 'left', transition: 'background 0.15s' }}>
                  <span style={{ fontSize: 18 }}>{t.icon}</span>
                  <span>{t.label}</span>
                  {t.id === 'chat' && totalUnread > 0 && (
                    <span style={{ background: C.red, color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 8, padding: '1px 6px', marginLeft: tab === t.id ? 8 : 'auto' }}>{totalUnread > 9 ? '9+' : totalUnread}</span>
                  )}
                  {tab === t.id && <div style={{ width: 3, height: 18, borderRadius: 2, background: C.accent, marginLeft: t.id === 'chat' && totalUnread > 0 ? 8 : 'auto' }} />}
                </button>
              ))}
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid ' + C.border }}>
              <button onClick={onSignOut}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                Déconnexion
              </button>
            </div>
          </nav>
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>{tabContent}</div>
          </div>
        </div>
      )}
    </div>
  )
}
