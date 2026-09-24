// Configuration et constantes partagées par les écrans de l'application.

export const C = {
  bg: '#0a0e1a', card: '#111827', border: '#1e293b',
  accent: '#3b82f6', accentGlow: '#60a5fa', gold: '#f59e0b',
  green: '#10b981', red: '#ef4444', text: '#f1f5f9',
  muted: '#64748b', surface: '#1e293b',
}

export const TEAM_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#f97316','#14b8a6','#ec4899']

export const DAY_ORDER = ['LUN','MAR','MER','JEU','VEN','SAM','DIM']

export const ROLE_CONFIG = {
  joueur: { label: 'Joueur', color: '#64748b' },
  coach: { label: 'Coach', color: '#3b82f6' },
  dirigeant: { label: 'Dirigeant', color: '#8b5cf6' },
  capitaine: { label: 'Capitaine', color: '#f59e0b' },
  invite: { label: 'Invité', color: '#14b8a6' },
}

export const KPI_CONFIG = [
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

export const SESSIONS = [
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

export const DEFAULT_PROFIL = { nom: '', prenom: '', surnom: 'TxT', club: '', division: '', poste1: '', poste2: '', photo_url: '', dashboard_kpis: null }
export const DASHBOARD_KPIS_MAX = 4
export const LEADERSHIP_ROLES = ['coach', 'dirigeant']
export const DEFAULT_TEMPLATE_BLOCS = [
  { titre: 'Mise en route & causerie', duree: '10 min', exercices: [''] },
  { titre: 'Échauffement', duree: '15 min', exercices: [''] },
  { titre: 'Jeu thème', duree: '20 min', exercices: [''] },
  { titre: 'Exercice', duree: '20 min', exercices: [''] },
  { titre: 'Jeu libre', duree: '20 min', exercices: [''] },
  { titre: 'Retour au calme', duree: '5 min', exercices: [''] },
]
export const GHOST_PREFIX = 'ghost:'

export const isGhostId = (id) => typeof id === 'string' && id.startsWith(GHOST_PREFIX)
export const ghostRealId = (id) => id.slice(GHOST_PREFIX.length)
export const seanceRowKey = (r) => r.user_id || (r.managed_player_id ? GHOST_PREFIX + r.managed_player_id : null)

export const RADAR_AXES = [
  { id: 'sprint30', label: 'Vitesse' },
  { id: 'jonglerie_g', label: 'Jonglerie' },
  { id: 'precision', label: 'Précision' },
  { id: 'scan', label: 'Vision' },
  { id: 'motivation', label: 'Mental' },
]

// Couleurs des courbes par joueur (graphiques d'équipe).
export const PLAYER_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#f97316','#14b8a6','#ec4899']

// Code jour du programme → jour de la semaine JS (Date.getDay()).
export const DAY_MAP = { LUN: 1, MAR: 2, MER: 3, JEU: 4, VEN: 5, SAM: 6, DIM: 0 }
