// Jeu d'icônes unique : trait de 1.75, 24×24, couleur héritée (currentColor).
const PATHS = {
  dashboard: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>,
  seances: <><path d="M6.5 6.5v11M17.5 6.5v11" /><path d="M3.5 9v6M20.5 9v6" /><path d="M6.5 12h11" /></>,
  kpi: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M21 20H3" /></>,
  stats: <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  chat: <><path d="M21 12a8 8 0 0 1-11.7 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></>,
  equipe: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.2c3 0 5 2 5 5.2" /></>,
  bibliotheque: <><path d="M5 4h4v16H5z" /><path d="M11 4h4v16h-4z" /><path d="M17.5 5.5l3.5 1-3.5 13-3.5-1z" /></>,
  chevron: <><path d="M6 9l6 6 6-6" /></>,
  check: <><path d="M5 12.5l4.5 4.5L19 7.5" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.8" /></>,
  admin: <><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></>,
}

export default function Icon({ name, size = 20, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', ...style }}>
      {PATHS[name]}
    </svg>
  )
}
