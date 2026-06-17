import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const C = {
  bg: '#0a0e1a', card: '#111827', border: '#1e293b',
  accent: '#3b82f6', accentGlow: '#60a5fa', gold: '#f59e0b',
  green: '#10b981', red: '#ef4444', text: '#f1f5f9',
  muted: '#64748b', surface: '#1e293b',
}

const TEAM_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#f97316','#14b8a6','#ec4899']

const KPI_CONFIG = [
  { id: 'sprint30', label: 'Sprint 30m', unit: 'sec', icon: '⚡', color: '#f59e0b', lower: true, category: 'physique' },
  { id: 'sprint10', label: 'Sprint 10m', unit: 'sec', icon: '💥', color: '#ef4444', lower: true, category: 'physique' },
  { id: 'jonglerie_g', label: 'Jonglerie Gauche', unit: 'touches', icon: '🦶', color: '#3b82f6', lower: false, category: 'technique' },
  { id: 'jonglerie_d', label: 'Jonglerie Droite', unit: 'touches', icon: '👟', color: '#8b5cf6', lower: false, category: 'technique' },
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

export default function App({ user, onSignOut }) {
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
  const [expandedAdmin, setExpandedAdmin] = useState(null)
  const [adminError, setAdminError] = useState(null)
  const [adminLoading, setAdminLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [teams, setTeams] = useState([])
  const [teamFilter, setTeamFilter] = useState('all')
  const [newTeamName, setNewTeamName] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [uploadingTeamPhoto, setUploadingTeamPhoto] = useState(null)
  const [availableTeams, setAvailableTeams] = useState([])
  const [adminChartKpi, setAdminChartKpi] = useState('sprint30')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

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
      ] = await Promise.all([
        supabase.from('profils').select('*'),
        supabase.from('mesures').select('user_id, kpi_id, valeur, date'),
        supabase.from('seances').select('user_id, date, jour'),
        supabase.rpc('get_user_emails_for_admins'),
        supabase.from('teams').select('*').order('created_at'),
      ])
      if (errP) { setAdminError('Erreur lecture profils : ' + errP.message); setAdminLoading(false); return }
      setTeams(allTeams || [])
      const emailMap = {}
      ;(allEmails || []).forEach(e => { emailMap[e.user_id] = e.email })
      const teamMap = {}
      ;(allTeams || []).forEach(t => { teamMap[t.id] = t })
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
        return { ...p, email: emailMap[p.user_id] || null, team: teamMap[p.team_id] || null, mesuresData: mes, nb_mesures: mes.length, nb_seances: sea.length, derniere_seance: derniereSeance, derniere_mesure: derniereMesure, kpis }
      })
      setAdminData(enriched)
    } catch (e) { setAdminError('Erreur inattendue : ' + e.message) }
    setAdminLoading(false)
  }

  const loadAll = useCallback(async () => {
    const [{ data: m }, { data: s }, { data: p }, { data: t }] = await Promise.all([
      supabase.from('mesures').select('*').eq('user_id', user.id).order('date', { ascending: true }),
      supabase.from('seances').select('*').eq('user_id', user.id),
      supabase.from('profils').select('*').eq('user_id', user.id).single(),
      supabase.from('teams').select('id, name, color, photo_url').order('created_at'),
    ])
    if (m) setMesures(m)
    if (s) setSeances(s)
    if (t) setAvailableTeams(t)
    if (p) { setProfil(p); setProfilEdit(p) }
    else {
      const { data: newP } = await supabase.from('profils').insert({ user_id: user.id, ...DEFAULT_PROFIL }).select().single()
      if (newP) { setProfil(newP); setProfilEdit(newP) }
    }
    try {
      const { data: adminCheck } = await supabase.from('admins').select('user_id').eq('user_id', user.id).single()
      if (adminCheck) { setIsAdmin(true); await loadAdminData() }
    } catch (e) {}
    setLoading(false)
  }, [user.id])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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

  const toggleSeance = async (day) => {
    const today = new Date().toISOString().split('T')[0]
    const existing = seances.find(s => s.jour === day && s.date === today)
    if (existing) {
      await supabase.from('seances').delete().eq('id', existing.id)
      setSeances(prev => prev.filter(s => s.id !== existing.id))
    } else {
      const { data } = await supabase.from('seances').insert({ user_id: user.id, jour: day, date: today }).select().single()
      if (data) { setSeances(prev => [...prev, data]); showToast('💪 Séance validée !') }
    }
  }

  const saveProfil = async () => {
    await supabase.from('profils').update({ ...profilEdit, updated_at: new Date().toISOString() }).eq('user_id', user.id)
    setProfil(profilEdit)
    setEditMode(false)
    showToast('✅ Profil mis à jour !')
  }

  const saveProfilTeam = async (teamId) => {
    const value = teamId || null
    await supabase.from('profils').update({ team_id: value }).eq('user_id', user.id)
    setProfil(p => ({ ...p, team_id: value }))
    setProfilEdit(p => ({ ...p, team_id: value }))
    const team = availableTeams.find(t => t.id === teamId)
    showToast(team ? `✅ Équipe "${team.name}" sélectionnée !` : '✅ Équipe retirée')
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
    setAdminData(prev => prev.map(p => p.team_id === teamId ? { ...p, team_id: null, team: null } : p))
    if (teamFilter === teamId) setTeamFilter('all')
    showToast('🗑️ Équipe supprimée')
  }

  const assignPlayerToTeam = async (playerUserId, teamId) => {
    const value = teamId || null
    await supabase.from('profils').update({ team_id: value }).eq('user_id', playerUserId)
    setAdminData(prev => prev.map(p => {
      if (p.user_id !== playerUserId) return p
      const team = teams.find(t => t.id === teamId) || null
      return { ...p, team_id: value, team }
    }))
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
  const isSeanceDone = (day) => { const today = new Date().toISOString().split('T')[0]; return seances.some(s => s.jour === day && s.date === today) }
  const getWeekCompliance = () => {
    let done = 0, total = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      SESSIONS.forEach(s => { total++; if (seances.some(x => x.jour === s.day && x.date === dateStr)) done++ })
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

  const NAV_ITEMS = [
    { id: 'dashboard', icon: '🏠', label: 'Accueil' },
    { id: 'seances', icon: '💪', label: 'Séances' },
    { id: 'kpi', icon: '📊', label: 'Mesures' },
    { id: 'stats', icon: '📈', label: 'Stats' },
    { id: 'profil', icon: '👤', label: 'Profil' },
    ...(isAdmin ? [{ id: 'admin', icon: '🛡️', label: 'Admin' }] : []),
  ]

  const filteredAdminData = teamFilter === 'all' ? adminData : adminData.filter(j => j.team_id === teamFilter)

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

          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Performances clés</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            {KPI_CONFIG.filter(k => ['sprint30', 'jonglerie_g', 'precision', 'scan'].includes(k.id)).map(kpi => {
              const val = getLatest(kpi.id); const prog = getProgress(kpi.id)
              return (
                <div key={kpi.id} onClick={() => { setSelectedKpi(kpi.id); changeTab('stats') }}
                  style={{ background: C.card, borderRadius: 14, padding: 14, border: '1px solid ' + C.border, cursor: 'pointer' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{kpi.icon}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{kpi.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color }}>
                    {val !== null ? val : '—'}<span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}> {kpi.unit}</span>
                  </div>
                  {prog !== null && <div style={{ fontSize: 11, color: parseFloat(prog) >= 0 ? C.green : C.red, marginTop: 4, fontWeight: 600 }}>{parseFloat(prog) >= 0 ? '▲' : '▼'} {Math.abs(prog)}%</div>}
                </div>
              )
            })}
          </div>

          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Mental du jour</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {KPI_CONFIG.filter(k => ['motivation', 'sommeil'].includes(k.id)).map(kpi => {
              const val = getLatest(kpi.id)
              return (
                <div key={kpi.id} style={{ background: C.card, borderRadius: 14, padding: 14, border: '1px solid ' + C.border }}>
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
                      style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '7px 8px', color: C.text, fontSize: 14, outline: 'none', minWidth: 0 }} />
                    <button onClick={() => inputValues[kpi.id] && saveMesure(kpi.id, inputValues[kpi.id])}
                      style={{ padding: '7px 10px', background: inputValues[kpi.id] ? kpi.color : C.surface, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>✓</button>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Programme du jour</div>
          {SESSIONS.filter(s => dayMap[s.day] === todayDow).map(s => {
            const done = isSeanceDone(s.day); const expanded = expandedDayDashboard === s.day
            return (
              <div key={s.day} style={{ marginBottom: 10, borderRadius: 14, overflow: 'hidden', border: '1px solid ' + (done ? C.green + '60' : expanded ? s.color + '50' : C.border) }}>
                <div onClick={() => setExpandedDayDashboard(expanded ? null : s.day)}
                  style={{ background: done ? 'linear-gradient(135deg, #064e3b, #065f46)' : expanded ? s.color + '15' : C.card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <div style={{ fontSize: 24 }}>{s.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{s.label}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{s.duration} • {s.blocs.length} blocs</div>
                  </div>
                  <div style={{ fontSize: 18, color: C.muted, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>⌄</div>
                </div>
                {renderSessionBlocs(s, expanded, done, () => toggleSeance(s.day))}
              </div>
            )
          })}
          {!SESSIONS.some(s => dayMap[s.day] === todayDow) && (
            <div style={{ background: C.card, borderRadius: 14, padding: 16, textAlign: 'center', color: C.muted, fontSize: 14 }}>Va dans "Séances" pour valider ton entraînement</div>
          )}
        </div>
      )}

      {/* ── SEANCES ── */}
      {tab === 'seances' && (
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
      )}

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

      {/* ── ADMIN ── */}
      {tab === 'admin' && isAdmin && (
        <div>
          {/* En-tête */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Tableau de bord coach</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ background: C.accent + '20', borderRadius: 8, padding: '4px 10px', fontSize: 13, fontWeight: 700, color: C.accent }}>{adminData.length} joueur{adminData.length > 1 ? 's' : ''}</div>
              <button onClick={loadAdminData} disabled={adminLoading}
                style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '4px 10px', fontSize: 13, color: C.muted, cursor: 'pointer', fontWeight: 600 }}>
                {adminLoading ? '...' : '↻'}
              </button>
            </div>
          </div>

          {/* ── Gestion des équipes ── */}
          <div style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 16, border: '1px solid ' + C.border }}>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Gestion des équipes</div>

            {/* Créer une équipe */}
            <div style={{ display: 'flex', gap: 8, marginBottom: teams.length > 0 ? 14 : 0 }}>
              <input type="text" placeholder="Nom de la nouvelle équipe..." value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createTeam()}
                style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '9px 12px', color: C.text, fontSize: 14, outline: 'none' }} />
              <button onClick={createTeam} disabled={creatingTeam || !newTeamName.trim()}
                style={{ padding: '9px 16px', background: newTeamName.trim() ? C.accent : C.surface, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap', opacity: creatingTeam ? 0.6 : 1 }}>
                + Créer
              </button>
            </div>

            {/* Liste des équipes avec photo */}
            {teams.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {teams.map(team => (
                  <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.surface, borderRadius: 12, padding: '10px 12px', border: '1px solid ' + C.border }}>
                    {/* Photo de l'équipe */}
                    <label style={{ position: 'relative', cursor: uploadingTeamPhoto === team.id ? 'wait' : 'pointer', flexShrink: 0 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: team.color + '30', border: '2px solid ' + team.color + '60', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: uploadingTeamPhoto === team.id ? 0.6 : 1 }}>
                        {uploadingTeamPhoto === team.id
                          ? <span style={{ fontSize: 16 }}>⏳</span>
                          : team.photo_url
                            ? <img src={team.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 20 }}>🏟️</span>}
                      </div>
                      <div style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>📷</div>
                      <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingTeamPhoto !== null}
                        onChange={e => e.target.files[0] && uploadTeamPhoto(team.id, e.target.files[0])} />
                    </label>

                    {/* Infos équipe */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: team.color, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{team.name}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                        {adminData.filter(j => j.team_id === team.id).length} joueur{adminData.filter(j => j.team_id === team.id).length > 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Bouton supprimer */}
                    <button onClick={() => deleteTeam(team.id)}
                      style={{ width: 32, height: 32, borderRadius: 8, background: C.red + '15', border: '1px solid ' + C.red + '30', color: C.red, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {teams.length === 0 && (
              <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '8px 0' }}>
                Aucune équipe — créez-en une pour organiser vos joueurs
              </div>
            )}

            {/* Filtre par équipe */}
            {teams.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid ' + C.border }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 600 }}>FILTRER PAR ÉQUIPE</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <button onClick={() => setTeamFilter('all')}
                    style={{ padding: '4px 12px', borderRadius: 16, border: '2px solid ' + (teamFilter === 'all' ? C.accent : C.border), background: teamFilter === 'all' ? C.accent + '20' : 'transparent', color: teamFilter === 'all' ? C.accent : C.muted, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    Tous ({adminData.length})
                  </button>
                  {teams.map(team => (
                    <button key={team.id} onClick={() => setTeamFilter(teamFilter === team.id ? 'all' : team.id)}
                      style={{ padding: '4px 12px', borderRadius: 16, border: '2px solid ' + (teamFilter === team.id ? team.color : C.border), background: teamFilter === team.id ? team.color + '20' : 'transparent', color: teamFilter === team.id ? team.color : C.muted, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      {team.name} ({adminData.filter(j => j.team_id === team.id).length})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {adminError && (
            <div style={{ background: C.red + '15', border: '1px solid ' + C.red + '40', borderRadius: 12, padding: '12px 14px', marginBottom: 14, fontSize: 12, color: C.red }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Erreur de chargement</div>
              <div>{adminError}</div>
            </div>
          )}
          {!adminError && adminData.length === 0 && !adminLoading && (
            <div style={{ background: C.card, borderRadius: 14, padding: 20, textAlign: 'center', color: C.muted }}>Aucun joueur inscrit pour l'instant</div>
          )}
          {adminLoading && (
            <div style={{ background: C.card, borderRadius: 14, padding: 20, textAlign: 'center', color: C.muted }}>Chargement...</div>
          )}

          {/* Liste des joueurs */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
            {filteredAdminData.map((j, i) => {
              const expanded = expandedAdmin === i
              return (
                <div key={i} style={{ background: C.card, borderRadius: 16, border: '1px solid ' + (expanded ? C.accent + '60' : C.border), overflow: 'hidden' }}>
                  {/* Ligne résumé */}
                  <div onClick={() => setExpandedAdmin(expanded ? null : i)} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                      {j.photo_url ? <img src={j.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚽'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {j.prenom || '—'} {j.nom || ''} <span style={{ color: C.gold }}>"{j.surnom || 'TxT'}"</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <div style={{ fontSize: 11, color: C.muted }}>{j.poste1 || '—'} • {j.club || '—'}</div>
                        {j.team && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: j.team.color, background: j.team.color + '20', padding: '1px 7px', borderRadius: 10 }}>
                            {j.team.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>{j.nb_seances || 0} séances</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{j.nb_mesures || 0} mesures</div>
                    </div>
                    <div style={{ fontSize: 16, color: C.muted, marginLeft: 4, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>⌄</div>
                  </div>

                  {/* Détails dépliés */}
                  {expanded && (
                    <div style={{ borderTop: '1px solid ' + C.border, padding: '14px 16px' }}>

                      {/* Email */}
                      {j.email && (
                        <div style={{ background: C.surface, borderRadius: 10, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>✉️</span>
                          <div>
                            <div style={{ fontSize: 10, color: C.muted, marginBottom: 1 }}>EMAIL</div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{j.email}</div>
                          </div>
                        </div>
                      )}

                      {/* Sélecteur d'équipe */}
                      <div style={{ background: C.surface, borderRadius: 10, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>🏟️</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>ÉQUIPE</div>
                          <select value={j.team_id || ''} onChange={e => assignPlayerToTeam(j.user_id, e.target.value || null)}
                            style={{ width: '100%', background: C.bg, border: '1px solid ' + C.border, borderRadius: 8, padding: '6px 10px', color: C.text, fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                            <option value="">— Aucune équipe —</option>
                            {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Dates */}
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

                      {/* KPI Grid */}
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

                      {/* Graphique KPI du joueur */}
                      <div style={{ borderTop: '1px solid ' + C.border, paddingTop: 14 }}>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
                          Graphique — {KPI_CONFIG.find(k => k.id === adminChartKpi)?.label}
                        </div>
                        {(() => {
                          const kpi = KPI_CONFIG.find(k => k.id === adminChartKpi)
                          const arr = (j.mesuresData || [])
                            .filter(m => m.kpi_id === adminChartKpi)
                            .sort((a, b) => a.date.localeCompare(b.date))
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
                        <div style={{ fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 6 }}>
                          Cliquez sur un KPI pour changer le graphique
                        </div>
                      </div>

                      {/* ── Suppression du compte ── */}
                      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid ' + C.border }}>
                        {deleteConfirm?.userId === j.user_id ? (
                          deleteConfirm.step === 1 ? (
                            /* Étape 1 : première alerte */
                            <div style={{ background: C.red + '12', border: '1px solid ' + C.red + '40', borderRadius: 12, padding: '12px 14px' }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 4 }}>
                                Supprimer le compte de {j.prenom || '—'} {j.nom || ''} ?
                              </div>
                              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
                                Toutes ses séances et performances seront supprimées.
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setDeleteConfirm(null)}
                                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid ' + C.border, background: C.surface, color: C.muted, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                                  Annuler
                                </button>
                                <button onClick={() => setDeleteConfirm({ userId: j.user_id, step: 2 })}
                                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: C.red + '25', color: C.red, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
                                  Continuer →
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Étape 2 : confirmation finale */
                            <div style={{ background: C.red + '20', border: '2px solid ' + C.red + '70', borderRadius: 12, padding: '14px' }}>
                              <div style={{ fontSize: 14, fontWeight: 800, color: C.red, marginBottom: 6 }}>
                                ⚠️ Action irréversible
                              </div>
                              <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>
                                Le compte de <strong style={{ color: C.text }}>{j.prenom} {j.nom}</strong> et <strong style={{ color: C.text }}>toutes ses données</strong> seront définitivement supprimés.<br />
                                Cette action est <strong style={{ color: C.red }}>impossible à annuler</strong>.
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setDeleteConfirm(null)}
                                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid ' + C.border, background: C.surface, color: C.muted, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                                  Annuler
                                </button>
                                <button onClick={() => deleteUserAccount(j.user_id)}
                                  style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: C.red, color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 800 }}>
                                  🗑️ Supprimer définitivement
                                </button>
                              </div>
                            </div>
                          )
                        ) : (
                          /* Bouton initial */
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
            })}
          </div>
          {filteredAdminData.length === 0 && !adminLoading && adminData.length > 0 && (
            <div style={{ background: C.card, borderRadius: 14, padding: 20, textAlign: 'center', color: C.muted }}>
              Aucun joueur dans cette équipe
            </div>
          )}
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

              {/* Sélecteur d'équipe pour l'utilisateur */}
              {availableTeams.length > 0 && (
                <div style={{ background: C.card, borderRadius: 12, padding: '12px 16px', marginBottom: 8, border: '1px solid ' + C.border }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <span style={{ fontSize: 18 }}>🏟️</span>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>MON ÉQUIPE</div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button onClick={() => saveProfilTeam(null)}
                      style={{ padding: '6px 14px', borderRadius: 16, border: '2px solid ' + (!profil.team_id ? C.accent : C.border), background: !profil.team_id ? C.accent + '20' : 'transparent', color: !profil.team_id ? C.accent : C.muted, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      Aucune
                    </button>
                    {availableTeams.map(team => {
                      const selected = profil.team_id === team.id
                      return (
                        <button key={team.id} onClick={() => saveProfilTeam(team.id)}
                          style={{ padding: '6px 14px', borderRadius: 16, border: '2px solid ' + (selected ? team.color : C.border), background: selected ? team.color + '25' : 'transparent', color: selected ? team.color : C.muted, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {team.photo_url
                            ? <img src={team.photo_url} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'cover' }} />
                            : <span style={{ width: 8, height: 8, borderRadius: '50%', background: team.color, display: 'inline-block' }} />}
                          {team.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <button onClick={() => setEditMode(true)}
                style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', marginTop: 8 }}>
                ✏️ Modifier le profil
              </button>
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
                  <input type="text" placeholder={f.placeholder} value={profilEdit[f.key] || ''}
                    onChange={e => setProfilEdit(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '12px 14px', color: C.text, fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
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
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: C.muted }}>{todayStr}</div>
            <div style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>{profil.division || '—'} • {profil.club || '—'}</div>
          </div>
        </div>
      </div>

      {isMobile ? (
        <>
          <div style={{ padding: '16px 16px 0' }}>{tabContent}</div>
          <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.card, borderTop: '1px solid ' + C.border, display: 'flex', padding: '8px 0 12px', zIndex: 50 }}>
            {NAV_ITEMS.map(t => (
              <button key={t.id} onClick={() => changeTab(t.id)}
                style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, opacity: tab === t.id ? 1 : 0.4 }}>
                <span style={{ fontSize: 20 }}>{t.icon}</span>
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
                  {tab === t.id && <div style={{ width: 3, height: 18, borderRadius: 2, background: C.accent, marginLeft: 'auto' }} />}
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
