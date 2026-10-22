import { C } from '../lib/constants'
import { renderSessionBlocs } from './SessionBlocs'
import Icon from './Icons'

// Carte d'une entrée prévue (séance de programme, entraînement ou match du calendrier), partagée par
// l'accueil et l'onglet Programme. Un match s'affiche pour information : il ne se valide pas.
export default function PlanCard({ entry, expanded, onExpand, done, onToggle }) {
  const { kind, team, day, s, source } = entry

  if (kind === 'match') {
    const score = s.score_pour != null && s.score_contre != null ? `${s.score_pour} - ${s.score_contre}` : null
    return (
      <div style={{ marginBottom: 10, borderRadius: 14, border: '1px solid ' + C.match + '50', background: C.card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: C.match + '1f', color: C.match, display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0 }} aria-hidden="true">🏆</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{s.label}</div>
          <div style={{ fontSize: 12, color: C.muted }}>Match · <span style={{ color: C.text, fontWeight: 500 }}>{team.name}</span></div>
        </div>
        {score && <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{score}</span>}
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 10, borderRadius: 14, overflow: 'hidden', border: '1px solid ' + (done ? C.green + '50' : expanded ? C.accent + '60' : C.border) }}>
      <div onClick={onExpand} role="button" tabIndex={0} aria-expanded={expanded}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExpand() } }}
        style={{ background: done ? C.green + '14' : C.card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <div className="mono" style={{ width: 42, height: 42, borderRadius: 10, background: C.bg, border: '1px solid ' + (done ? C.green + '50' : C.border), color: done ? C.green : C.muted, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{done ? <Icon name="check" size={18} /> : day}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{s.label}</div>
          <div style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            {s.duration && <><span>{s.duration}</span><span aria-hidden="true">·</span></>}
            <span style={{ color: C.text, fontWeight: 500 }}>{team.name}</span>
            <span aria-hidden="true">·</span>
            <span>{source}</span>
          </div>
        </div>
        <Icon name="chevron" size={18} style={{ color: C.muted, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>
      {renderSessionBlocs(s, expanded, done, onToggle)}
    </div>
  )
}
