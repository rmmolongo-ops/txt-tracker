import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { C, KPI_CONFIG } from '../lib/constants'
import Icon from './Icons'
import { inputPropsFor } from '../lib/kpis'

// Onglet Stats : évolution d'un KPI (graphique), historique des mesures et suppression.

export default function StatsScreen({ isMobile, mesures, selectedKpi, setSelectedKpi, getLatest, getMesuresForKpi, getProgress, onDeleteMesure, kpis = KPI_CONFIG, teams = [], activeTeamId = null, onSelectTeam = () => {}, inputValues = {}, setInputValues = () => {}, saveMesure = () => {} }) {
  const [confirmDelete, setConfirmDelete] = useState(null)
  const deleteMesure = async (id) => {
    await onDeleteMesure(id)
    setConfirmDelete(null)
  }

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
        {kpis.map(kpi => (
          <button key={kpi.id} onClick={() => setSelectedKpi(kpi.id)}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid ' + (selectedKpi === kpi.id ? C.accent : C.border), cursor: 'pointer', fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', background: selectedKpi === kpi.id ? C.accent + '22' : 'transparent', color: selectedKpi === kpi.id ? C.accentGlow : C.muted }}>
            {kpi.label}
          </button>
        ))}
      </div>
      {(() => {
        const kpi = kpis.find(k => k.id === selectedKpi) || kpis[0]
        const arr = getMesuresForKpi(kpi.id)
        const chartData = arr.slice(-12).map(d => ({ date: d.date.slice(5), val: d.valeur }))
        const prog = getProgress(kpi.id); const val = getLatest(kpi.id)
        return (
          <div>
            <div style={{ background: C.card, borderRadius: 14, padding: 16, marginBottom: 20, border: '1px solid ' + C.border }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, color: C.muted }}>{kpi.label}</div>
                  <div className="mono" style={{ fontSize: 36, fontWeight: 600, color: C.text, letterSpacing: '-0.02em' }}>{val !== null ? val : '—'}<span style={{ fontSize: 16, color: C.muted }}> {kpi.unit}</span></div>
                </div>
                {prog !== null && (
                  <div style={{ background: parseFloat(prog) >= 0 ? C.green + '18' : C.red + '18', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: parseFloat(prog) >= 0 ? C.green : C.red }}>{parseFloat(prog) >= 0 ? '+' : ''}{prog}%</div>
                    <div style={{ fontSize: 12, color: C.muted }}>progression</div>
                  </div>
                )}
              </div>
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={isMobile ? 160 : 220}>
                  <LineChart data={chartData}>
                    <CartesianGrid vertical={false} stroke={C.border} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip contentStyle={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 8, color: C.text }} />
                    <Line type="monotone" dataKey="val" stroke={C.accentGlow} strokeWidth={2} dot={{ fill: C.accentGlow, r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 13 }}>Enregistre au moins 2 mesures pour voir le graphique</div>
              )}
            </div>
            <div style={{ background: C.card, borderRadius: 14, padding: 14, marginBottom: 20, border: '1px solid ' + C.border }}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 8, fontWeight: 500 }}>Ajouter une mesure · {kpi.label}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="number" {...inputPropsFor(kpi)} placeholder={kpi.unit ? 'Valeur en ' + kpi.unit : 'Valeur'} value={inputValues[kpi.id] || ''}
                  onChange={e => setInputValues(v => ({ ...v, [kpi.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter' && inputValues[kpi.id]) saveMesure(kpi.id, inputValues[kpi.id]) }}
                  style={{ flex: 1, minWidth: 0, background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 16, outline: 'none' }} />
                <button onClick={() => inputValues[kpi.id] && saveMesure(kpi.id, inputValues[kpi.id])} aria-label="Enregistrer la mesure"
                  style={{ padding: '10px 18px', background: inputValues[kpi.id] ? C.accent : C.surface, color: inputValues[kpi.id] ? '#fff' : C.muted, border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>✓</button>
              </div>
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 8, fontWeight: 500 }}>Historique</div>
            {arr.slice().reverse().slice(0, 10).map(entry => {
              const isConf = confirmDelete && confirmDelete.id === entry.id
              return (
                <div key={entry.id} style={{ background: isConf ? C.red + '14' : 'transparent', borderRadius: isConf ? 10 : 0, padding: '10px 4px', borderBottom: '1px solid ' + (isConf ? C.red + '60' : C.border), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: C.muted, fontSize: 13 }}>{new Date(entry.date).toLocaleDateString('fr-FR')}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="mono" style={{ color: C.text, fontWeight: 600 }}>{entry.valeur} {kpi.unit}</span>
                    {isConf ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => deleteMesure(entry.id)} style={{ background: C.red, color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Confirmer</button>
                        <button onClick={() => setConfirmDelete(null)} style={{ background: C.surface, color: C.muted, border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Annuler</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete({ id: entry.id })} aria-label="Supprimer cette mesure" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 2, display: 'grid', placeItems: 'center' }}><Icon name="trash" size={16} /></button>
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
  )
}
