import { C } from '../lib/constants'

// Détail d'une séance (objectif, blocs, exercices) + bouton de validation, partagé par l'accueil et l'onglet Programme.
export const renderSessionBlocs = (s, expanded, done, onToggle) => expanded && (
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
