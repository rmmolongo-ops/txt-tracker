import { Fragment, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { getDeferredPrompt } from '../lib/installPrompt'
import { toDateStr, latestKpis } from '../lib/stats'
import { C, TEAM_COLORS, KPI_CONFIG, SESSIONS, DEFAULT_PROFIL, LEADERSHIP_ROLES, GHOST_PREFIX, isGhostId, ghostRealId, seanceRowKey } from '../lib/constants'
import FicheJoueur from './FicheJoueur'
import ChatScreen from './ChatScreen'
import BibliothequeScreen from './BibliothequeScreen'
import ProfilScreen from './ProfilScreen'
import KpiScreen from './KpiScreen'
import StatsScreen from './StatsScreen'
import SeancesScreen from './SeancesScreen'
import EquipeJoueurScreen from './EquipeJoueurScreen'
import EquipeCoachScreen from './EquipeCoachScreen'
import AdminScreen from './AdminScreen'
import DashboardCoach from './DashboardCoach'
import DashboardJoueur from './DashboardJoueur'
import useChatUnread from '../hooks/useChatUnread'

export default function App({ user, onSignOut, inviteTeamId }) {
  const [tab, setTab] = useState(() => localStorage.getItem('txt_tab') || 'dashboard')
  const [mesures, setMesures] = useState([])
  const [seances, setSeances] = useState([])
  const [profil, setProfil] = useState(DEFAULT_PROFIL)
  const [inputValues, setInputValues] = useState({})
  const [selectedKpi, setSelectedKpi] = useState('sprint30')
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminData, setAdminData] = useState([])
  const [unconfirmedSignups, setUnconfirmedSignups] = useState([])
  const [ficheJoueur, setFicheJoueur] = useState(null)
  const [adminError, setAdminError] = useState(null)
  const [adminLoading, setAdminLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [teams, setTeams] = useState([])
  const [clubs, setClubs] = useState([])
  const [uploadingTeamPhoto, setUploadingTeamPhoto] = useState(null)
  const [availableTeams, setAvailableTeams] = useState([])
  const [myTeamIds, setMyTeamIds] = useState(new Set())
  const [myTeamRoles, setMyTeamRoles] = useState({})
  const [homeViewMode, setHomeViewMode] = useState(() => localStorage.getItem('txt_home_view') || 'joueur')
  const [coachTeamId, setCoachTeamId] = useState(null)
  const [coachRosterData, setCoachRosterData] = useState([])
  const [managedPlayers, setManagedPlayers] = useState([])
  const [adminManagedPlayers, setAdminManagedPlayers] = useState([])
  const [addingManagedPlayer, setAddingManagedPlayer] = useState(false)
  const [managedPlayerDraft, setManagedPlayerDraft] = useState({ prenom: '', nom: '', poste1: '' })
  const [entryValue, setEntryValue] = useState('')
  const [adminView, setAdminView] = useState('overview')
  const [selectedAdminTeam, setSelectedAdminTeam] = useState(null)
  const [equipeTab, setEquipeTab] = useState('perf')
  const [equipeTeamId, setEquipeTeamId] = useState(null)
  const [programsCatalog, setProgramsCatalog] = useState([])
  const [editingProg, setEditingProg] = useState(false)
  const [progDraft, setProgDraft] = useState(null)
  const [editingProgramId, setEditingProgramId] = useState(null)
  const [isStandalone] = useState(() => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true)
  const [isIOS] = useState(() => /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream)
  const [chatTeamId, setChatTeamId] = useState(null)
  const myTeams = useMemo(() => availableTeams.filter(t => myTeamIds.has(t.id)), [availableTeams, myTeamIds])
  const { unreadCounts, totalUnread, markChatRead } = useChatUnread({ userId: user.id, availableTeams, myTeamIds, openTeamId: tab === 'chat' ? chatTeamId : null })
  const [seanceTemplates, setSeanceTemplates] = useState([])
  const [seanceTemplatesLoading, setSeanceTemplatesLoading] = useState(false)
  const [libraryPickerFor, setLibraryPickerFor] = useState(null)
  const [viewDay, setViewDay] = useState(null)
  const [dailySessions, setDailySessions] = useState([])
  const [dailyPickerFor, setDailyPickerFor] = useState(null)
  const [teamSeances, setTeamSeances] = useState([])
  const [suiviSelected, setSuiviSelected] = useState({})

  const showToast = (msg, duration = 2500) => { setToast(msg); setTimeout(() => setToast(null), duration) }

  const handleInstall = async () => {
    const prompt = getDeferredPrompt()
    if (prompt) {
      prompt.prompt()
      const choice = await prompt.userChoice
      if (choice.outcome === 'accepted') showToast('📲 Application installée !')
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

  const loadAdminOverview = async () => {
    setAdminLoading(true)
    setAdminError(null)
    try {
      const [
        { data: allProfils, error: errP },
        { data: allEmails },
        { data: allTeams },
        { data: allTeamMembers },
        { data: unconfirmed },
        { data: allManagedPlayers },
      ] = await Promise.all([
        supabase.from('profils').select('*'),
        supabase.rpc('get_user_emails_for_admins'),
        supabase.from('teams').select('*').order('created_at'),
        supabase.from('team_members').select('user_id, team_id, role'),
        supabase.rpc('get_unconfirmed_signups_for_admins'),
        supabase.from('managed_players').select('*'),
      ])
      if (errP) { setAdminError('Erreur lecture profils : ' + errP.message); setAdminLoading(false); return }
      setTeams(allTeams || [])
      setUnconfirmedSignups(unconfirmed || [])
      const emailMap = {}
      ;(allEmails || []).forEach(e => { emailMap[e.user_id] = e.email })
      const teamMap = {}
      ;(allTeams || []).forEach(t => { teamMap[t.id] = t })
      const enrichedManaged = (allManagedPlayers || []).map(mp => ({
        user_id: GHOST_PREFIX + mp.id, managed_player_id: mp.id, isManaged: true, team_id: mp.team_id,
        nom: mp.nom, prenom: mp.prenom, surnom: mp.surnom, poste1: mp.poste1, poste2: mp.poste2, photo_url: mp.photo_url,
        teams: teamMap[mp.team_id] ? [{ ...teamMap[mp.team_id], role: 'joueur' }] : [],
        mesuresData: [], nb_mesures: 0, nb_seances: 0, derniere_seance: null, derniere_mesure: null, kpis: {},
      }))
      setAdminManagedPlayers(enrichedManaged)
      const playerTeamsMap = {}
      ;(allTeamMembers || []).forEach(tm => {
        if (!playerTeamsMap[tm.user_id]) playerTeamsMap[tm.user_id] = []
        if (teamMap[tm.team_id]) playerTeamsMap[tm.user_id].push({ ...teamMap[tm.team_id], role: tm.role })
      })
      const enriched = (allProfils || []).map(p => ({
        ...p, email: emailMap[p.user_id] || null, teams: playerTeamsMap[p.user_id] || [],
        mesuresData: [], nb_mesures: 0, nb_seances: 0, derniere_seance: null, derniere_mesure: null, kpis: {},
      }))
      setAdminData(enriched)
    } catch (e) { setAdminError('Erreur inattendue : ' + e.message) }
    setAdminLoading(false)
  }

  const loadAdminTeamDetail = async (teamId) => {
    setAdminLoading(true)
    setAdminError(null)
    try {
      const { data: members } = await supabase.from('team_members').select('user_id').eq('team_id', teamId)
      const userIds = (members || []).map(m => m.user_id)
      const { data: managedForTeam } = await supabase.from('managed_players').select('*').eq('team_id', teamId)
      const managedIds = (managedForTeam || []).map(mp => mp.id)
      const [
        { data: playerMesures },
        { data: playerSeances },
        { data: managedMesures },
        { data: managedSeances },
      ] = await Promise.all([
        userIds.length > 0 ? supabase.from('mesures').select('id, user_id, kpi_id, valeur, date').in('user_id', userIds) : Promise.resolve({ data: [] }),
        userIds.length > 0 ? supabase.from('seances').select('user_id, date, jour').in('user_id', userIds) : Promise.resolve({ data: [] }),
        managedIds.length > 0 ? supabase.from('mesures').select('id, managed_player_id, kpi_id, valeur, date').in('managed_player_id', managedIds) : Promise.resolve({ data: [] }),
        managedIds.length > 0 ? supabase.from('seances').select('managed_player_id, date').in('managed_player_id', managedIds) : Promise.resolve({ data: [] }),
      ])
      const userIdSet = new Set(userIds)
      setAdminData(prev => prev.map(p => {
        if (!userIdSet.has(p.user_id)) return p
        const mes = (playerMesures || []).filter(m => m.user_id === p.user_id)
        const sea = (playerSeances || []).filter(s => s.user_id === p.user_id)
        return {
          ...p,
          mesuresData: mes, nb_mesures: mes.length, nb_seances: sea.length,
          derniere_seance: sea.slice().sort((a, b) => b.date.localeCompare(a.date))[0]?.date || null,
          derniere_mesure: mes.slice().sort((a, b) => b.date.localeCompare(a.date))[0]?.date || null,
          kpis: latestKpis(mes, KPI_CONFIG),
        }
      }))
      const currentTeamMap = {}
      teams.forEach(t => { currentTeamMap[t.id] = t })
      const enrichedManaged = (managedForTeam || []).map(mp => {
        const mes = (managedMesures || []).filter(m => m.managed_player_id === mp.id)
        const sea = (managedSeances || []).filter(s => s.managed_player_id === mp.id)
        return {
          user_id: GHOST_PREFIX + mp.id, managed_player_id: mp.id, isManaged: true, team_id: mp.team_id,
          nom: mp.nom, prenom: mp.prenom, surnom: mp.surnom, poste1: mp.poste1, poste2: mp.poste2, photo_url: mp.photo_url,
          teams: currentTeamMap[mp.team_id] ? [{ ...currentTeamMap[mp.team_id], role: 'joueur' }] : [],
          mesuresData: mes, nb_mesures: mes.length, nb_seances: sea.length,
          derniere_seance: sea.slice().sort((a, b) => b.date.localeCompare(a.date))[0]?.date || null,
          derniere_mesure: mes.slice().sort((a, b) => b.date.localeCompare(a.date))[0]?.date || null,
          kpis: latestKpis(mes, KPI_CONFIG),
        }
      })
      setAdminManagedPlayers(prev => [...prev.filter(mp => mp.team_id !== teamId), ...enrichedManaged])
    } catch (e) { setAdminError('Erreur inattendue : ' + e.message) }
    setAdminLoading(false)
  }

  // Métadonnées d'inscription lues via une ref : loadAll ne doit dépendre que de user.id,
  // sinon chaque rafraîchissement de session (nouvel objet user) rechargerait toutes les données.
  const userRef = useRef(user)
  userRef.current = user

  const loadAll = useCallback(async () => {
    const [{ data: m }, { data: s }, { data: p }, { data: t }, { data: myMemberships }, { data: progs }, { data: cl }] = await Promise.all([
      supabase.from('mesures').select('*').eq('user_id', user.id).order('date', { ascending: true }),
      supabase.from('seances').select('*').eq('user_id', user.id),
      supabase.from('profils').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('teams').select('id, name, color, photo_url, dashboard_kpis').order('created_at'),
      supabase.from('team_members').select('team_id, role').eq('user_id', user.id),
      supabase.from('team_programs').select('*').order('start_date'),
      supabase.from('clubs').select('*').order('name'),
    ])
    if (m) setMesures(m)
    if (s) setSeances(s)
    if (t) setAvailableTeams(t)
    if (myMemberships) {
      setMyTeamIds(new Set(myMemberships.map(tm => tm.team_id)))
      const roleMap = {}
      myMemberships.forEach(tm => { roleMap[tm.team_id] = tm.role })
      setMyTeamRoles(roleMap)
    }
    if (progs) setProgramsCatalog(progs)
    if (cl) setClubs(cl)
    if (p) setProfil(p)
    else {
      const meta = userRef.current.user_metadata || {}
      const initial = { ...DEFAULT_PROFIL, nom: meta.nom || '', prenom: meta.prenom || '', club: meta.club || '', poste1: meta.poste1 || '', poste2: meta.poste2 || '' }
      const { data: newP } = await supabase.from('profils').upsert({ user_id: user.id, ...initial }, { onConflict: 'user_id' }).select().single()
      if (newP) setProfil(newP)
      if (meta.equipe) {
        const { error: joinError } = await supabase.from('team_members').insert({ user_id: user.id, team_id: meta.equipe })
        if (!joinError) setMyTeamIds(prev => new Set([...prev, meta.equipe]))
      }
    }
    try {
      const { data: adminCheck } = await supabase.from('admins').select('user_id').eq('user_id', user.id).single()
      if (adminCheck) { setIsAdmin(true); await loadAdminOverview() }
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
          setMyTeamRoles(prev => ({ ...prev, [inviteTeamId]: 'joueur' }))
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

  const setHomeView = (mode) => { localStorage.setItem('txt_home_view', mode); setHomeViewMode(mode) }

  const loadCoachRoster = async (teamId) => {
    const { data: members } = await supabase.from('team_members').select('user_id, role').eq('team_id', teamId)
    const ids = (members || []).map(m => m.user_id)
    if (ids.length === 0) { setCoachRosterData([]); return }
    const [{ data: profs }, { data: mes }, { data: sea }] = await Promise.all([
      supabase.from('profils').select('user_id, nom, prenom, surnom, photo_url, poste1').in('user_id', ids),
      supabase.from('mesures').select('user_id, kpi_id, valeur, date').in('user_id', ids),
      supabase.from('seances').select('user_id, date').eq('team_id', teamId).in('user_id', ids),
    ])
    const roleMap = {}
    members.forEach(m => { roleMap[m.user_id] = m.role })
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoStr = toDateStr(weekAgo)
    const roster = ids.map(uid => {
      const prof = (profs || []).find(p => p.user_id === uid) || {}
      const mySeances = (sea || []).filter(s => s.user_id === uid)
      const derniereSeance = mySeances.slice().sort((a, b) => b.date.localeCompare(a.date))[0]?.date || null
      const seancesSemaine = mySeances.filter(s => s.date >= weekAgoStr).length
      const myMesures = (mes || []).filter(m => m.user_id === uid)
      const derniereMesure = myMesures.slice().sort((a, b) => b.date.localeCompare(a.date))[0]?.date || null
      const kpis = latestKpis(myMesures, KPI_CONFIG)
      return { user_id: uid, ...prof, role: roleMap[uid] || 'joueur', derniereSeance, seancesSemaine, derniereMesure, mesuresData: myMesures, nb_mesures: myMesures.length, nb_seances: mySeances.length, kpis }
    })
    setCoachRosterData(roster)
  }

  useEffect(() => {
    const leadershipTeamIds = availableTeams.filter(t => myTeamIds.has(t.id) && LEADERSHIP_ROLES.includes(myTeamRoles[t.id])).map(t => t.id)
    if (leadershipTeamIds.length === 0) return
    if (!coachTeamId || !leadershipTeamIds.includes(coachTeamId)) setCoachTeamId(leadershipTeamIds[0])
  }, [availableTeams, myTeamIds, myTeamRoles, coachTeamId])

  useEffect(() => {
    if ((tab !== 'dashboard' && tab !== 'equipe') || !coachTeamId) return
    if (!LEADERSHIP_ROLES.includes(myTeamRoles[coachTeamId])) return
    loadCoachRoster(coachTeamId)
  }, [tab, coachTeamId, myTeamRoles, availableTeams, myTeamIds, homeViewMode])

  const loadEquipeManagedPlayers = async (teamId) => {
    const { data: mp } = await supabase.from('managed_players').select('*').eq('team_id', teamId).order('created_at')
    const ids = (mp || []).map(p => p.id)
    if (ids.length === 0) { setManagedPlayers([]); return }
    const [{ data: mes }, { data: sea }] = await Promise.all([
      supabase.from('mesures').select('managed_player_id, kpi_id, valeur, date').in('managed_player_id', ids),
      supabase.from('seances').select('managed_player_id, date').eq('team_id', teamId).in('managed_player_id', ids),
    ])
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoStr = toDateStr(weekAgo)
    const enriched = mp.map(p => {
      const myMesures = (mes || []).filter(m => m.managed_player_id === p.id)
      const mySeances = (sea || []).filter(s => s.managed_player_id === p.id)
      const derniereSeance = mySeances.slice().sort((a, b) => b.date.localeCompare(a.date))[0]?.date || null
      const seancesSemaine = mySeances.filter(s => s.date >= weekAgoStr).length
      const derniereMesure = myMesures.slice().sort((a, b) => b.date.localeCompare(a.date))[0]?.date || null
      const kpis = latestKpis(myMesures, KPI_CONFIG)
      return { user_id: GHOST_PREFIX + p.id, managed_player_id: p.id, isManaged: true, nom: p.nom, prenom: p.prenom, surnom: p.surnom, photo_url: p.photo_url, poste1: p.poste1, poste2: p.poste2, role: 'joueur', mesuresData: myMesures, nb_mesures: myMesures.length, nb_seances: mySeances.length, kpis, derniereSeance, seancesSemaine, derniereMesure }
    })
    setManagedPlayers(enriched)
  }

  useEffect(() => {
    const activeTeamId = tab === 'equipe' ? (isAdmin ? equipeTeamId : coachTeamId) : coachTeamId
    if ((tab !== 'equipe' && tab !== 'dashboard') || !activeTeamId) return
    loadEquipeManagedPlayers(activeTeamId)
  }, [tab, isAdmin, equipeTeamId, coachTeamId])

  const addManagedPlayer = async (teamId) => {
    if (!managedPlayerDraft.prenom.trim() && !managedPlayerDraft.nom.trim()) { showToast('❌ Donne au moins un prénom ou un nom'); return }
    const { data, error } = await supabase.from('managed_players').insert({
      team_id: teamId, prenom: managedPlayerDraft.prenom.trim(), nom: managedPlayerDraft.nom.trim(), poste1: managedPlayerDraft.poste1.trim(), created_by: user.id,
    }).select().single()
    if (error) { showToast('❌ ' + error.message); return }
    const team = teams.find(t => t.id === teamId) || availableTeams.find(t => t.id === teamId)
    const entry = { user_id: GHOST_PREFIX + data.id, managed_player_id: data.id, isManaged: true, team_id: teamId, nom: data.nom, prenom: data.prenom, surnom: data.surnom, photo_url: data.photo_url, poste1: data.poste1, poste2: data.poste2, role: 'joueur', teams: team ? [{ ...team, role: 'joueur' }] : [], mesuresData: [], nb_mesures: 0, nb_seances: 0, kpis: {}, derniereSeance: null, seancesSemaine: 0, derniereMesure: null, derniere_seance: null, derniere_mesure: null }
    setManagedPlayers(prev => [...prev, entry])
    setAdminManagedPlayers(prev => [...prev, entry])
    setManagedPlayerDraft({ prenom: '', nom: '', poste1: '' })
    setAddingManagedPlayer(false)
    showToast('✅ Joueur ajouté !')
  }

  const deleteManagedPlayer = async (id) => {
    await supabase.from('managed_players').delete().eq('id', id)
    setManagedPlayers(prev => prev.filter(p => p.managed_player_id !== id))
    setAdminManagedPlayers(prev => prev.filter(p => p.managed_player_id !== id))
    showToast('🗑️ Joueur supprimé')
  }

  const saveMesureForPlayer = async (target, kpiId, value) => {
    const today = new Date().toISOString().split('T')[0]
    const payload = isGhostId(target.user_id)
      ? { managed_player_id: target.managed_player_id, kpi_id: kpiId, valeur: parseFloat(value), date: today }
      : { user_id: target.user_id, kpi_id: kpiId, valeur: parseFloat(value), date: today }
    const { data, error } = await supabase.from('mesures').insert(payload).select().single()
    if (error) { showToast('❌ ' + error.message); return }
    if (isGhostId(target.user_id)) {
      setManagedPlayers(prev => prev.map(p => p.user_id !== target.user_id ? p : { ...p, mesuresData: [...p.mesuresData, data], kpis: { ...p.kpis, [kpiId]: data.valeur } }))
      setAdminManagedPlayers(prev => prev.map(p => p.user_id !== target.user_id ? p : { ...p, mesuresData: [...p.mesuresData, data], kpis: { ...p.kpis, [kpiId]: data.valeur } }))
    } else {
      setCoachRosterData(prev => prev.map(p => p.user_id !== target.user_id ? p : { ...p, mesuresData: [...p.mesuresData, data], kpis: { ...p.kpis, [kpiId]: data.valeur } }))
      setAdminData(prev => prev.map(p => p.user_id !== target.user_id ? p : { ...p, mesuresData: [...(p.mesuresData || []), data], kpis: { ...p.kpis, [kpiId]: data.valeur } }))
    }
    setEntryValue('')
    showToast('✅ Performance enregistrée pour ' + (target.prenom || 'ce joueur') + ' !')
  }

  const loadSeanceTemplates = useCallback(async () => {
    setSeanceTemplatesLoading(true)
    const { data } = await supabase.from('seance_templates').select('*').eq('created_by', user.id).order('created_at', { ascending: false })
    setSeanceTemplates(data || [])
    setSeanceTemplatesLoading(false)
  }, [user.id])

  useEffect(() => {
    if (tab !== 'bibliotheque' && tab !== 'equipe' && tab !== 'dashboard') return
    const isLeadershipNow = availableTeams.some(t => myTeamIds.has(t.id) && LEADERSHIP_ROLES.includes(myTeamRoles[t.id]))
    if (!isLeadershipNow) return
    loadSeanceTemplates()
  }, [tab, availableTeams, myTeamIds, myTeamRoles, loadSeanceTemplates])

  const applyTemplateToDay = (template) => {
    const { si } = libraryPickerFor
    setProgDraft(d => {
      const next = JSON.parse(JSON.stringify(d))
      next.sessions[si] = { ...next.sessions[si], label: template.label, icon: template.icon, color: template.color, duration: template.duration, objectif: template.objectif, blocs: JSON.parse(JSON.stringify(template.blocs)) }
      return next
    })
    setLibraryPickerFor(null)
    showToast('📚 Séance chargée depuis la bibliothèque')
  }

  const loadTeamSeances = async (teamId) => {
    const { data } = await supabase.from('seances').select('*').eq('team_id', teamId)
    setTeamSeances(data || [])
  }

  useEffect(() => {
    if (tab !== 'equipe' || equipeTab !== 'suivi') return
    const isLeadershipNow = availableTeams.some(t => myTeamIds.has(t.id) && LEADERSHIP_ROLES.includes(myTeamRoles[t.id]))
    if (!isAdmin && !isLeadershipNow) return
    const activeEquipeTeamId = isAdmin ? equipeTeamId : coachTeamId
    if (!activeEquipeTeamId) return
    loadTeamSeances(activeEquipeTeamId)
    setSuiviSelected({})
  }, [tab, isAdmin, equipeTab, equipeTeamId, coachTeamId, availableTeams, myTeamIds, myTeamRoles])

  const validateSeances = async (userIds, day, dateStr, teamId, cardKey) => {
    const toInsert = userIds
      .filter(uid => !teamSeances.some(s => seanceRowKey(s) === uid && s.jour === day && s.date === dateStr && s.team_id === teamId))
      .map(uid => isGhostId(uid)
        ? { managed_player_id: ghostRealId(uid), jour: day, date: dateStr, team_id: teamId, validated_by: user.id }
        : { user_id: uid, jour: day, date: dateStr, team_id: teamId, validated_by: user.id })
    if (toInsert.length > 0) {
      const { data, error } = await supabase.from('seances').insert(toInsert).select()
      if (error) { showToast('❌ ' + error.message); return }
      setTeamSeances(prev => [...prev, ...(data || [])])
    }
    setSuiviSelected(prev => ({ ...prev, [cardKey]: new Set() }))
    showToast('✅ Séance validée pour ' + toInsert.length + ' joueur' + (toInsert.length !== 1 ? 's' : ''))
  }

  const unvalidateSeance = async (seanceId, cardKey, userId) => {
    const { error } = await supabase.from('seances').delete().eq('id', seanceId)
    if (error) { showToast('❌ ' + error.message); return }
    setTeamSeances(prev => prev.filter(s => s.id !== seanceId))
    setSuiviSelected(prev => {
      const next = new Set(prev[cardKey] || [])
      next.delete(userId)
      return { ...prev, [cardKey]: next }
    })
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

  const saveDashboardKpis = async (ids) => {
    await supabase.from('profils').update({ dashboard_kpis: ids }).eq('user_id', user.id)
    setProfil(p => ({ ...p, dashboard_kpis: ids }))
    showToast('✅ Performances clés mises à jour !')
    return true
  }

  const toggleMyTeam = async (teamId) => {
    const isIn = myTeamIds.has(teamId)
    if (isIn) {
      await supabase.from('team_members').delete().eq('user_id', user.id).eq('team_id', teamId)
      setMyTeamIds(prev => { const next = new Set(prev); next.delete(teamId); return next })
      setMyTeamRoles(prev => { const next = { ...prev }; delete next[teamId]; return next })
    } else {
      await supabase.from('team_members').insert({ user_id: user.id, team_id: teamId })
      setMyTeamIds(prev => new Set([...prev, teamId]))
      setMyTeamRoles(prev => ({ ...prev, [teamId]: 'joueur' }))
    }
    const team = availableTeams.find(t => t.id === teamId)
    showToast(isIn ? `Retiré de "${team?.name}"` : `✅ Ajouté à "${team?.name}" !`)
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

  const createTeam = async (name) => {
    const color = TEAM_COLORS[teams.length % TEAM_COLORS.length]
    const { data, error } = await supabase.from('teams').insert({ name, admin_id: user.id, color }).select().single()
    if (data) { setTeams(prev => [...prev, data]); setAvailableTeams(prev => [...prev, data]); showToast('✅ Équipe créée !'); return true }
    if (error) showToast('❌ ' + error.message)
    return false
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

  const resendConfirmation = async (email) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: window.location.origin } })
    if (error) showToast('❌ ' + error.message)
    else showToast('✉️ Email de confirmation renvoyé !')
  }

  const createClub = async (name) => {
    const { data, error } = await supabase.from('clubs').insert({ name }).select().single()
    if (data) { setClubs(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name))); showToast('✅ Club ajouté !'); return true }
    if (error) showToast('❌ ' + error.message)
    return false
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

  const getProgramsForTeam = useCallback((teamId) => programsCatalog.filter(p => p.team_id === teamId).sort((a, b) => a.start_date.localeCompare(b.start_date)), [programsCatalog])

  const getProgramForDate = useCallback((teamId, dateStr) => programsCatalog.find(p => p.team_id === teamId && dateStr >= p.start_date && dateStr <= p.end_date), [programsCatalog])

  const loadDailySessions = async (teamId) => {
    const { data } = await supabase.from('team_daily_sessions').select('*').eq('team_id', teamId)
    setDailySessions(data || [])
  }

  useEffect(() => {
    if (tab !== 'dashboard' || !coachTeamId) return
    loadDailySessions(coachTeamId)
  }, [tab, coachTeamId])

  const getDailySession = (teamId, dateStr) => dailySessions.find(d => d.team_id === teamId && d.date === dateStr)

  const assignDailySession = async (teamId, dateStr, template) => {
    const payload = {
      team_id: teamId, date: dateStr, template_id: template.id,
      label: template.label, icon: template.icon, color: template.color, duration: template.duration, objectif: template.objectif, blocs: template.blocs,
      created_by: user.id, type: 'entrainement',
    }
    const { data, error } = await supabase.from('team_daily_sessions').upsert(payload, { onConflict: 'team_id,date' }).select().single()
    if (error) { showToast('❌ ' + error.message); return }
    setDailySessions(prev => [...prev.filter(d => !(d.team_id === teamId && d.date === dateStr)), data])
    setDailyPickerFor(null)
    setViewDay(v => v && v.dateStr === dateStr ? { ...v, s: data } : v)
    showToast('✅ Séance planifiée !')
  }

  const assignMatchSession = async (teamId, dateStr, opponent) => {
    const payload = {
      team_id: teamId, date: dateStr, template_id: null,
      label: opponent ? `Match vs ${opponent}` : 'Match', icon: '🏆', color: '#eab308', duration: '', objectif: '', blocs: [],
      created_by: user.id, type: 'match',
    }
    const { data, error } = await supabase.from('team_daily_sessions').upsert(payload, { onConflict: 'team_id,date' }).select().single()
    if (error) { showToast('❌ ' + error.message); return }
    setDailySessions(prev => [...prev.filter(d => !(d.team_id === teamId && d.date === dateStr)), data])
    setDailyPickerFor(null)
    setViewDay(v => v && v.dateStr === dateStr ? { ...v, s: data } : v)
    showToast('✅ Séance planifiée !')
  }

  const removeDailySession = async (id) => {
    await supabase.from('team_daily_sessions').delete().eq('id', id)
    setDailySessions(prev => prev.filter(d => d.id !== id))
    setViewDay(v => v ? { ...v, s: null } : v)
    showToast('🗑️ Séance retirée')
    return true
  }

  const updateDailySession = async (id, draft) => {
    const clean = {
      label: draft.label.trim(), duration: draft.duration.trim(), objectif: draft.objectif.trim(),
      blocs: draft.blocs.map(b => ({ ...b, exercices: b.exercices.filter(e => e.trim() !== '') })),
    }
    const { data, error } = await supabase.from('team_daily_sessions').update(clean).eq('id', id).select().single()
    if (error) { showToast('❌ ' + error.message); return }
    setDailySessions(prev => prev.map(d => d.id === id ? data : d))
    setViewDay(v => v ? { ...v, s: data } : v)
    showToast('✅ Séance mise à jour !')
    return true
  }

  const saveAnnotation = async (id, draft) => {
    const clean = {
      note_coach: draft.note_coach.trim() || null,
      rating_deroule: draft.rating_deroule || null,
      rating_ressenti: draft.rating_ressenti || null,
    }
    const { data, error } = await supabase.from('team_daily_sessions').update(clean).eq('id', id).select().single()
    if (error) { showToast('❌ ' + error.message); return }
    setDailySessions(prev => prev.map(d => d.id === id ? data : d))
    setViewDay(v => v ? { ...v, s: data } : v)
    showToast('✅ Notes enregistrées')
    return true
  }

  const saveMatchResult = async (id, draft) => {
    const buts = {}
    Object.entries(draft.buts).forEach(([k, n]) => { if (n > 0 && draft.presents.includes(k)) buts[k] = n })
    const toScore = (v) => v === '' || v == null ? null : Math.max(0, parseInt(v, 10) || 0)
    const { data, error } = await supabase.from('team_daily_sessions').update({
      resultat: draft.resultat || null, buts, presents: draft.presents,
      score_pour: toScore(draft.score_pour), score_contre: toScore(draft.score_contre),
    }).eq('id', id).select().single()
    if (error) { showToast('❌ ' + error.message); return }
    setDailySessions(prev => prev.map(d => d.id === id ? data : d))
    setViewDay(v => v ? { ...v, s: data } : v)
    showToast('✅ Résultat enregistré')
    return true
  }

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
      showToast('🗑️ Compte supprimé définitivement')
      return true
    }
    return false
  }

  const getMesuresForKpi = useCallback((kpiId) => mesures.filter(m => m.kpi_id === kpiId).sort((a, b) => a.date.localeCompare(b.date)), [mesures])
  const getLatest = useCallback((kpiId) => { const arr = mesures.filter(m => m.kpi_id === kpiId).sort((a, b) => a.date.localeCompare(b.date)); return arr.length > 0 ? arr[arr.length - 1].valeur : null }, [mesures])
  const getProgress = useCallback((kpiId) => {
    const arr = mesures.filter(m => m.kpi_id === kpiId).sort((a, b) => a.date.localeCompare(b.date))
    if (arr.length < 2) return null
    const cfg = KPI_CONFIG.find(k => k.id === kpiId)
    const diff = cfg.lower ? ((arr[0].valeur - arr[arr.length-1].valeur) / arr[0].valeur) * 100 : ((arr[arr.length-1].valeur - arr[0].valeur) / arr[0].valeur) * 100
    return diff.toFixed(1)
  }, [mesures])
  const getDashboardKpiIds = useCallback(() => {
    if (profil.dashboard_kpis && profil.dashboard_kpis.length > 0) return profil.dashboard_kpis
    const myTeams = availableTeams.filter(t => myTeamIds.has(t.id))
    const withConfig = myTeams.find(t => t.dashboard_kpis && t.dashboard_kpis.length > 0)
    return withConfig ? withConfig.dashboard_kpis : ['sprint30', 'jonglerie_g', 'precision', 'scan']
  }, [profil.dashboard_kpis, availableTeams, myTeamIds])
  const isSeanceDone = useCallback((day, dateStr, teamId) => { const targetDate = dateStr || new Date().toISOString().split('T')[0]; const targetTeamId = teamId || null; return seances.some(s => s.jour === day && s.date === targetDate && s.team_id === targetTeamId) }, [seances])
  const getWeekCompliance = useCallback(() => {
    let done = 0, total = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      for (const s of SESSIONS) {
        total++
        if (seances.some(x => x.jour === s.day && x.date === dateStr && x.team_id === null)) done++
      }
    }
    return Math.round((done / total) * 100)
  }, [seances])
  const todayStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const leadershipTeams = useMemo(() => {
    const withRole = availableTeams.filter(t => myTeamIds.has(t.id)).map(t => ({ ...t, myRole: myTeamRoles[t.id] || 'joueur' }))
    return withRole.filter(t => LEADERSHIP_ROLES.includes(t.myRole))
  }, [availableTeams, myTeamIds, myTeamRoles])
  const hasLeadership = leadershipTeams.length > 0
  const hasPlayerRole = useMemo(() => {
    const withRole = availableTeams.filter(t => myTeamIds.has(t.id)).map(t => ({ ...t, myRole: myTeamRoles[t.id] || 'joueur' }))
    return withRole.some(t => !LEADERSHIP_ROLES.includes(t.myRole)) || withRole.length === 0
  }, [availableTeams, myTeamIds, myTeamRoles])
  const effectiveHomeView = !hasLeadership ? 'joueur' : (!hasPlayerRole ? 'coach' : homeViewMode)
  const activeCoachTeam = useMemo(() => leadershipTeams.find(t => t.id === coachTeamId) || leadershipTeams[0], [leadershipTeams, coachTeamId])
  const NAV_ITEMS = useMemo(() => [
    { id: 'dashboard', icon: '🏠', label: 'Accueil' },
    { id: 'seances', icon: '💪', label: 'Programme' },
    { id: 'kpi', icon: '📊', label: 'Mesures' },
    { id: 'stats', icon: '📈', label: 'Stats' },
    { id: 'chat', icon: '💬', label: 'Chat' },
    { id: 'equipe', icon: '⚽', label: 'Équipe' },
    ...(hasLeadership ? [{ id: 'bibliotheque', icon: '📚', label: 'Bibliothèque' }] : []),
    ...(isAdmin ? [{ id: 'admin', icon: '🛡️', label: 'Admin' }] : []),
  ], [hasLeadership, isAdmin])

  if (loading) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.accent, fontSize: 40 }}>⚽</div>
    </div>
  )


  const openFiche = (j, pool) => setFicheJoueur({ ...j, __pool: pool || [] })

  const adminDeleteMesure = async (target, mesureId) => {
    const { error } = await supabase.from('mesures').delete().eq('id', mesureId)
    if (error) { showToast('❌ ' + error.message); return false }
    const strip = (p) => {
      if (p.user_id !== target.user_id) return p
      const mes = (p.mesuresData || []).filter(m => m.id !== mesureId)
      const kpis = latestKpis(mes, KPI_CONFIG)
      const derniere_mesure = mes.slice().sort((a, b) => b.date.localeCompare(a.date))[0]?.date || null
      return { ...p, mesuresData: mes, nb_mesures: mes.length, kpis, derniere_mesure }
    }
    if (target.isManaged) { setAdminManagedPlayers(prev => prev.map(strip)); setManagedPlayers(prev => prev.map(strip)) }
    else { setAdminData(prev => prev.map(strip)); setCoachRosterData(prev => prev.map(strip)) }
    showToast('🗑️ Mesure supprimée')
    return true
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
                {seanceTemplates.length > 0 && (
                  <button onClick={() => setLibraryPickerFor({ si })}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid ' + s.color + '40', background: 'transparent', color: s.color, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    📚 Charger depuis la bibliothèque
                  </button>
                )}
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

          {libraryPickerFor && (
            <div onClick={() => setLibraryPickerFor(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
              <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: 16, padding: 20, maxWidth: 420, width: '100%', maxHeight: '80vh', overflowY: 'auto', border: '1px solid ' + C.border }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Choisir une séance de la bibliothèque</div>
                {seanceTemplates.map(t => (
                  <button key={t.id} onClick={() => applyTemplateToDay(t)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: '1px solid ' + C.border, background: C.surface, color: C.text, cursor: 'pointer', marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{t.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{t.duration}{t.objectif ? ' · ' + t.objectif : ''}</div>
                    </div>
                  </button>
                ))}
                <button onClick={() => setLibraryPickerFor(null)}
                  style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  const tabContent = (
    <div style={{ paddingBottom: isMobile ? 80 : 24 }}>

      {/* ── DASHBOARD ── */}
      {tab === 'dashboard' && (
        <div>
          {hasLeadership && hasPlayerRole && (
            <div style={{ display: 'flex', background: C.surface, borderRadius: 12, padding: 4, marginBottom: 16, gap: 2 }}>
              {[{ id: 'joueur', icon: '⚽', label: 'Vue Joueur' }, { id: 'coach', icon: '🧠', label: 'Vue Coach' }].map(v => (
                <button key={v.id} onClick={() => setHomeView(v.id)}
                  style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: homeViewMode === v.id ? C.accent : 'transparent', color: homeViewMode === v.id ? '#fff' : C.muted, transition: 'all 0.2s' }}>
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
          )}

          {effectiveHomeView === 'coach' ? (
            <DashboardCoach
              activeCoachTeam={activeCoachTeam} assignDailySession={assignDailySession} assignMatchSession={assignMatchSession} changeTab={changeTab} coachRosterData={coachRosterData}
              dailyPickerFor={dailyPickerFor} dailySessions={dailySessions} getDailySession={getDailySession} leadershipTeams={leadershipTeams} managedPlayers={managedPlayers}
              removeDailySession={removeDailySession} saveAnnotation={saveAnnotation} saveMatchResult={saveMatchResult} seanceTemplates={seanceTemplates} setCoachTeamId={setCoachTeamId}
              setDailyPickerFor={setDailyPickerFor} setEquipeTab={setEquipeTab} setViewDay={setViewDay} updateDailySession={updateDailySession} viewDay={viewDay} />
          ) : (
            <DashboardJoueur
              availableTeams={availableTeams} changeTab={changeTab} getDashboardKpiIds={getDashboardKpiIds} getLatest={getLatest} getProgramForDate={getProgramForDate}
              getProgramsForTeam={getProgramsForTeam} getProgress={getProgress} getWeekCompliance={getWeekCompliance} inputValues={inputValues} isMobile={isMobile}
              isSeanceDone={isSeanceDone} myTeamIds={myTeamIds} saveDashboardKpis={saveDashboardKpis} saveMesure={saveMesure} setInputValues={setInputValues}
              setSelectedKpi={setSelectedKpi} toggleSeance={toggleSeance} />
          )}
        </div>
      )}

      {/* ── SEANCES ── */}
      {tab === 'seances' && (
        <SeancesScreen myTeams={myTeams} getProgramForDate={getProgramForDate} getProgramsForTeam={getProgramsForTeam}
          isSeanceDone={isSeanceDone} toggleSeance={toggleSeance} />
      )}

      {/* ── KPI ── */}
      {tab === 'kpi' && (
        <KpiScreen isMobile={isMobile} inputValues={inputValues} setInputValues={setInputValues} getLatest={getLatest} saveMesure={saveMesure} />
      )}

      {/* ── STATS ── */}
      {tab === 'stats' && (
        <StatsScreen isMobile={isMobile} mesures={mesures} selectedKpi={selectedKpi} setSelectedKpi={setSelectedKpi}
          getLatest={getLatest} getMesuresForKpi={getMesuresForKpi} getProgress={getProgress} onDeleteMesure={deleteMesure} />
      )}

      {/* ── CHAT ── */}
      {tab === 'chat' && (
        <ChatScreen user={user} profil={profil} isAdmin={isAdmin} isMobile={isMobile} myTeams={myTeams}
          chatTeamId={chatTeamId} onSelectTeam={setChatTeamId} unreadCounts={unreadCounts} markChatRead={markChatRead} showToast={showToast} />
      )}

      {/* ── ÉQUIPE (ADMIN / COACH) ── */}
      {tab === 'equipe' && (isAdmin || hasLeadership) && (
        <EquipeCoachScreen
          addManagedPlayer={addManagedPlayer} addingManagedPlayer={addingManagedPlayer} adminData={adminData} coachRosterData={coachRosterData} coachTeamId={coachTeamId}
          deleteManagedPlayer={deleteManagedPlayer} entryValue={entryValue} equipeTab={equipeTab} equipeTeamId={equipeTeamId} getProgramForDate={getProgramForDate}
          getProgramsForTeam={getProgramsForTeam} isAdmin={isAdmin} isMobile={isMobile} leadershipTeams={leadershipTeams} managedPlayerDraft={managedPlayerDraft}
          managedPlayers={managedPlayers} myTeamRoles={myTeamRoles} openFiche={openFiche} renderProgrammeCatalog={renderProgrammeCatalog} saveMesureForPlayer={saveMesureForPlayer}
          setAddingManagedPlayer={setAddingManagedPlayer} setCoachTeamId={setCoachTeamId} setEditingProg={setEditingProg} setEditingProgramId={setEditingProgramId} setEntryValue={setEntryValue}
          setEquipeTab={setEquipeTab} setEquipeTeamId={setEquipeTeamId} setManagedPlayerDraft={setManagedPlayerDraft} setProgDraft={setProgDraft} setSuiviSelected={setSuiviSelected}
          suiviSelected={suiviSelected} teamSeances={teamSeances} teams={teams} unvalidateSeance={unvalidateSeance} validateSeances={validateSeances} />
      )}

      {/* ── ÉQUIPE (JOUEUR) ── */}
      {tab === 'equipe' && !isAdmin && !hasLeadership && (
        <EquipeJoueurScreen myTeams={myTeams} getProgramsForTeam={getProgramsForTeam} isMobile={isMobile} />
      )}

      {/* ── BIBLIOTHÈQUE DE SÉANCES ── */}
      {tab === 'bibliotheque' && hasLeadership && (
        <BibliothequeScreen user={user} templates={seanceTemplates} loading={seanceTemplatesLoading} setTemplates={setSeanceTemplates} showToast={showToast} />
      )}

      {/* ── ADMIN : VUE OVERVIEW ── */}
      {tab === 'admin' && isAdmin && (
        <AdminScreen
          addManagedPlayer={addManagedPlayer} addingManagedPlayer={addingManagedPlayer} adminData={adminData} adminDeleteMesure={adminDeleteMesure} adminError={adminError}
          adminLoading={adminLoading} adminManagedPlayers={adminManagedPlayers} adminView={adminView} clubs={clubs} coachRosterData={coachRosterData}
          createClub={createClub} createTeam={createTeam} deleteClub={deleteClub} deleteManagedPlayer={deleteManagedPlayer} deleteTeam={deleteTeam}
          deleteUserAccount={deleteUserAccount} isAdmin={isAdmin} isMobile={isMobile} loadAdminOverview={loadAdminOverview} loadAdminTeamDetail={loadAdminTeamDetail} managedPlayerDraft={managedPlayerDraft}
          managedPlayers={managedPlayers} openFiche={openFiche} renderProgrammeCatalog={renderProgrammeCatalog} resendConfirmation={resendConfirmation} selectedAdminTeam={selectedAdminTeam}
          setAddingManagedPlayer={setAddingManagedPlayer} setAdminView={setAdminView} setEditingProg={setEditingProg} setEditingProgramId={setEditingProgramId} setManagedPlayerDraft={setManagedPlayerDraft}
          setPlayerRole={setPlayerRole} setProgDraft={setProgDraft} setSelectedAdminTeam={setSelectedAdminTeam} shareInviteLink={shareInviteLink} teams={teams}
          togglePlayerTeam={togglePlayerTeam} unconfirmedSignups={unconfirmedSignups} uploadTeamPhoto={uploadTeamPhoto} uploadingTeamPhoto={uploadingTeamPhoto} />
      )}

      {/* ── PROFIL ── */}
      {tab === 'profil' && (
        <ProfilScreen user={user} onSignOut={onSignOut} profil={profil} setProfil={setProfil} clubs={clubs} availableTeams={availableTeams} myTeamIds={myTeamIds}
          toggleMyTeam={toggleMyTeam} isStandalone={isStandalone} handleInstall={handleInstall} isMobile={isMobile} showToast={showToast} />
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

      {ficheJoueur && <FicheJoueur player={ficheJoueur} onClose={() => setFicheJoueur(null)} />}

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

      {tab === 'dashboard' && effectiveHomeView === 'coach' && activeCoachTeam && (
        <button onClick={() => setDailyPickerFor({ teamId: viewDay?.teamId || activeCoachTeam.id, dateStr: viewDay?.dateStr || toDateStr(new Date()) })}
          title={viewDay ? 'Ajouter une séance à ce jour' : "Ajouter une séance à ma journée"}
          style={{ position: 'fixed', right: 20, bottom: isMobile ? 84 : 24, width: 56, height: 56, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 16px rgba(59,130,246,0.5)', zIndex: 60 }}>
          +
        </button>
      )}
    </div>
  )
}
