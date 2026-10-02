import { useState } from 'react'
import { C, KPI_CONFIG } from '../lib/constants'
import { inputPropsFor } from '../lib/kpis'

// Onglet Mesures : saisie des performances du joueur, par catégorie de KPI.

export default function KpiScreen({ isMobile, inputValues, setInputValues, getLatest, saveMesure, kpis = KPI_CONFIG, teams = [], activeTeamId = null, onSelectTeam = () => {} }) {
  const [activeCategory, setActiveCategory] = useState('physique')

  return (
    <div>
      {teams.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {teams.map(t => {
            const sel = t.id === activeTeamId
            return (
              <button key={t.id} onClick={() => onSelectTeam(t.id)}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (sel ? C.accent : C.border), background: sel ? C.accent + '22' : 'transparent', color: sel ? C.accentGlow : C.muted, fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                {t.name}
              </button>
            )
          })}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {['physique', 'technique', 'mental'].map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid ' + (activeCategory === cat ? C.accent : C.border), cursor: 'pointer', fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', background: activeCategory === cat ? C.accent + '22' : 'transparent', color: activeCategory === cat ? C.accentGlow : C.muted }}>
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        {kpis.filter(k => k.category === activeCategory).map(kpi => {
          const val = getLatest(kpi.id)
          return (
            <div key={kpi.id} style={{ background: C.card, borderRadius: 14, padding: 16, border: '1px solid ' + C.border }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{kpi.label}</div>
                <div className="mono" style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>{val !== null ? val + ' ' + kpi.unit : 'Non renseigné'}</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="number" {...inputPropsFor(kpi)} placeholder={kpi.unit ? 'Valeur en ' + kpi.unit : 'Valeur'} value={inputValues[kpi.id] || ''}
                  onChange={e => setInputValues(v => ({ ...v, [kpi.id]: e.target.value }))}
                  style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 16, outline: 'none' }} />
                <button onClick={() => inputValues[kpi.id] && saveMesure(kpi.id, inputValues[kpi.id])}
                  style={{ padding: '10px 18px', background: inputValues[kpi.id] ? C.accent : C.surface, color: inputValues[kpi.id] ? '#fff' : C.muted, border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>✓</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
