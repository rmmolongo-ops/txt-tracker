import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { C, KPI_CONFIG } from '../lib/constants'

// Onglet Stats : évolution d'un KPI (graphique), historique des mesures et suppression.

export default function StatsScreen({ isMobile, mesures, selectedKpi, setSelectedKpi, getLatest, getMesuresForKpi, getProgress, onDeleteMesure }) {
  const [confirmDelete, setConfirmDelete] = useState(null)
  const deleteMesure = async (id) => {
    await onDeleteMesure(id)
    setConfirmDelete(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {KPI_CONFIG.map(kpi => (
          <button key={kpi.id} onClick={() => setSelectedKpi(kpi.id)}
            style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', background: selectedKpi === kpi.id ? kpi.color : C.surface, color: '#fff', opacity: selectedKpi === kpi.id ? 1 : 0.6 }}>
            {kpi.icon} {kpi.label.split(' ')[0]}
          </button>
        ))}
      </div>
      {(() => {
        const kpi = KPI_CONFIG.find(k => k.id === selectedKpi)
        const arr = getMesuresForKpi(selectedKpi)
        const chartData = arr.slice(-12).map(d => ({ date: d.date.slice(5), val: d.valeur }))
        const prog = getProgress(selectedKpi); const val = getLatest(selectedKpi)
        return (
          <div>
            <div style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 14, border: '1px solid ' + C.border }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: C.muted }}>{kpi.label.toUpperCase()}</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: kpi.color }}>{val !== null ? val : '—'}<span style={{ fontSize: 16, color: C.muted }}> {kpi.unit}</span></div>
                </div>
                {prog !== null && (
                  <div style={{ background: parseFloat(prog) >= 0 ? C.green + '20' : C.red + '20', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: parseFloat(prog) >= 0 ? C.green : C.red }}>{parseFloat(prog) >= 0 ? '+' : ''}{prog}%</div>
                    <div style={{ fontSize: 10, color: C.muted }}>progression</div>
                  </div>
                )}
              </div>
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={isMobile ? 160 : 220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.muted }} />
                    <YAxis tick={{ fontSize: 10, fill: C.muted }} />
                    <Tooltip contentStyle={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 8, color: C.text }} />
                    <Line type="monotone" dataKey="val" stroke={kpi.color} strokeWidth={2.5} dot={{ fill: kpi.color, r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 13 }}>Enregistre au moins 2 mesures pour voir le graphique</div>
              )}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Historique</div>
            {arr.slice().reverse().slice(0, 10).map(entry => {
              const isConf = confirmDelete && confirmDelete.id === entry.id
              return (
                <div key={entry.id} style={{ background: isConf ? '#3f0f0f' : C.card, borderRadius: 10, padding: '10px 14px', marginBottom: 8, border: '1px solid ' + (isConf ? C.red + '60' : C.border), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: C.muted, fontSize: 13 }}>{new Date(entry.date).toLocaleDateString('fr-FR')}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: kpi.color, fontWeight: 700 }}>{entry.valeur} {kpi.unit}</span>
                    {isConf ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => deleteMesure(entry.id)} style={{ background: C.red, color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Confirmer</button>
                        <button onClick={() => setConfirmDelete(null)} style={{ background: C.surface, color: C.muted, border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Annuler</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete({ id: entry.id })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.4 }}>🗑️</button>
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
