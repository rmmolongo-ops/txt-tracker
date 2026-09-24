import { useState } from 'react'
import { C, KPI_CONFIG } from '../lib/constants'

// Onglet Mesures : saisie des performances du joueur, par catégorie de KPI.

export default function KpiScreen({ isMobile, inputValues, setInputValues, getLatest, saveMesure }) {
  const [activeCategory, setActiveCategory] = useState('physique')

  return (
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
  )
}
