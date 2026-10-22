// Configuration et constantes partagées par les écrans de l'application.

// Deux palettes, même structure : un seul accent bleu, neutres bleu-ardoise.
// Toutes les valeurs sont des hex à 6 chiffres : le code compose des transparences
// en ajoutant un suffixe (C.accent + '22'), ce qui ne marche pas avec var() ou rgb().
// Clair : fond blanc cassé froid, texte ardoise foncé, accents assombris pour garder
// un contraste AA (texte 4.5:1) sur fond blanc.
export const PALETTES = {
  dark: {
    bg: '#0a0e1a', card: '#111827', border: '#1e293b', surface: '#1e293b',
    text: '#f1f5f9', muted: '#94a3b8',
    accent: '#3b82f6', accentGlow: '#60a5fa',
    green: '#10b981', red: '#ef4444', gold: '#f59e0b', match: '#eab308',
  },
  light: {
    bg: '#f3f5f9', card: '#ffffff', border: '#dde3ee', surface: '#e8edf5',
    text: '#0f172a', muted: '#566680',
    accent: '#2563eb', accentGlow: '#1d4ed8',
    green: '#047857', red: '#dc2626', gold: '#b45309', match: '#a16207',
  },
}

// Objet partagé et volontairement mutable : applyTheme() (lib/theme.js) en change les valeurs,
// puis l'appli se re-rend. Les écrans lisent C.* au rendu, jamais au chargement du module.
export const C = { ...PALETTES.dark }

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
  { id: 'sprint30', label: 'Sprint 30m', unit: 'sec', lower: true, category: 'physique' },
  { id: 'sprint10', label: 'Sprint 10m', unit: 'sec', lower: true, category: 'physique' },
  { id: 'jonglerie_g', label: 'Jonglerie Gauche', unit: 'touches', lower: false, category: 'technique' },
  { id: 'jonglerie_d', label: 'Jonglerie Droite', unit: 'touches', lower: false, category: 'technique' },
  { id: 'jonglerie_alt', label: 'Jonglerie Alternée', unit: 'touches', lower: false, category: 'technique' },
  { id: 'precision', label: 'Précision Frappe', unit: '/10', lower: false, category: 'technique' },
  { id: 'slalom', label: 'Slalom 20m', unit: 'sec', lower: true, category: 'technique' },
  { id: 'scan', label: 'Scan Ballon/Mvt', unit: '/10', lower: false, category: 'technique' },
  { id: 'motivation', label: 'Motivation', unit: '/10', lower: false, category: 'mental' },
  { id: 'sommeil', label: 'Qualité Sommeil', unit: '/10', lower: false, category: 'mental' },
]

// Séance type d'un nouveau programme d'équipe, que le coach adapte (jours, contenu).
export const newProgramSession = (day) => ({ day, label: 'Entraînement', duration: '1h10', icon: '⚽', color: '#3b82f6', objectif: '', blocs: [
  { titre: 'Échauffement', duree: '15 min', exercices: [''] },
  { titre: 'Corps de séance', duree: '45 min', exercices: [''] },
  { titre: 'Retour au calme', duree: '10 min', exercices: [''] },
]})
export const DEFAULT_PROGRAM_SESSIONS = () => ['LUN', 'MER', 'VEN'].map(newProgramSession)
export const DAY_LABELS = { LUN: 'Lundi', MAR: 'Mardi', MER: 'Mercredi', JEU: 'Jeudi', VEN: 'Vendredi', SAM: 'Samedi', DIM: 'Dimanche' }

export const DEFAULT_PROFIL = { nom: '', prenom: '', surnom: 'TxT', club: '', division: '', poste1: '', poste2: '', photo_url: '', dashboard_kpis: null }
export const DASHBOARD_KPIS_MAX = 4

// Formule gratuite : nombre maximum de joueurs sans compte par équipe (le super admin en est exempté).
export const MANAGED_PLAYERS_FREE_LIMIT = 12
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
