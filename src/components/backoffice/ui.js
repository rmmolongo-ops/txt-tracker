import { C } from '../../lib/constants'

// Petits éléments partagés par les écrans du back-office.

export const formatDate = (value, withTime = false) => {
  if (!value) return '—'
  const d = new Date(value)
  return withTime
    ? d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const StatTile = ({ label, value, hint }) => (
  <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 12, padding: '14px 16px', minWidth: 0 }}>
    <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{label}</div>
    <div className="mono" style={{ fontSize: 24, fontWeight: 600, color: C.text, letterSpacing: '-0.02em' }}>{value ?? '—'}</div>
    {hint && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{hint}</div>}
  </div>
)

export const Section = ({ title, actions, children }) => (
  <section style={{ marginBottom: 24 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{title}</h2>
      {actions}
    </div>
    {children}
  </section>
)

export const Chip = ({ active, onClick, children }) => (
  <button onClick={onClick} aria-pressed={active}
    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? C.accent : C.border), background: active ? C.accent + '22' : 'transparent', color: active ? C.text : C.muted, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
    {children}
  </button>
)

export const Badge = ({ color = C.muted, children }) => (
  <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: C.text, border: '1px solid ' + color + '80', background: color + '1f', borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap' }}>{children}</span>
)

export const searchInputStyle = {
  flex: 1, minWidth: 200, background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none',
}

export const Loading = () => <div style={{ color: C.muted, padding: 20, fontSize: 14 }}>Chargement…</div>
export const ErrorBox = ({ message }) => (
  <div role="alert" style={{ background: C.red + '15', border: '1px solid ' + C.red + '50', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>{message}</div>
)
