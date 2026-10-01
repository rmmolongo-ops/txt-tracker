import { C } from '../lib/constants'
import Icon from './Icons'

// Détail d'une séance (objectif, blocs, exercices) + bouton de validation, partagé par l'accueil et l'onglet Programme.
export const renderSessionBlocs = (s, expanded, done, onToggle) => expanded && (
  <div style={{ background: C.card, padding: '0 16px 16px' }}>
    <div style={{ borderTop: '1px solid ' + C.border, padding: '12px 0', display: 'flex', alignItems: 'center', gap: 8, color: C.accentGlow }}>
      <Icon name="target" size={16} />
      <span style={{ fontSize: 13, fontWeight: 500 }}>Objectif : {s.objectif}</span>
    </div>
    {s.blocs.map((bloc, bi) => (
      <div key={bi} style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{bloc.titre}</div>
          <div className="mono" style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>{bloc.duree}</div>
        </div>
        {bloc.exercices.map((ex, ei) => (
          <div key={ei} style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.muted, marginTop: 8, flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{ex}</div>
          </div>
        ))}
        {bi < s.blocs.length - 1 && <div style={{ height: 1, background: C.border, marginTop: 12 }} />}
      </div>
    ))}
    <button onClick={(e) => { e.stopPropagation(); onToggle() }}
      style={{ width: '100%', padding: 12, borderRadius: 10, border: done ? '1px solid ' + C.border : 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, marginTop: 4, background: done ? 'transparent' : C.accent, color: done ? C.muted : '#fff' }}>
      {done ? '✓ Séance validée' : 'Valider cette séance'}
    </button>
  </div>
)
