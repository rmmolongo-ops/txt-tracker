import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/constants'
import { Section, Chip, StatTile, Loading, ErrorBox } from './ui'

// Statistiques d'usage calculées depuis la base (aucun traceur externe, pas de cookie).
// Un indicateur par graphique (petits multiples), une seule couleur : pas de légende nécessaire,
// le titre nomme la série. Survol = valeur exacte de la semaine ; tableau disponible.
const METRICS = [
  { id: 'inscriptions', label: 'Inscriptions' },
  // Les mêmes personnes sont actives plusieurs semaines : on affiche une moyenne, pas une somme.
  { id: 'actifs', label: 'Utilisateurs actifs', hint: 'mesure, séance ou message dans la semaine', average: true },
  { id: 'mesures', label: 'Mesures saisies' },
  { id: 'seances', label: 'Séances réalisées' },
  { id: 'evenements', label: 'Événements au calendrier' },
  { id: 'messages', label: 'Messages de chat' },
]

const PERIODS = [{ weeks: 12, label: '12 semaines' }, { weeks: 26, label: '6 mois' }, { weeks: 52, label: '1 an' }]

const weekLabel = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

const ChartTooltip = ({ active, payload, metric }) => {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 10px', fontSize: 12, color: C.text }}>
      <div style={{ color: C.muted, marginBottom: 2 }}>Semaine du {weekLabel(p.debut)}</div>
      <div><span className="mono" style={{ fontWeight: 600 }}>{p[metric.id]}</span> {metric.label.toLowerCase()}</div>
    </div>
  )
}

export default function BackofficeStats() {
  const [weeks, setWeeks] = useState(12)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [showTable, setShowTable] = useState(false)

  useEffect(() => {
    setData(null)
    supabase.rpc('backoffice_stats', { p_weeks: weeks }).then(({ data: d, error: e }) => { if (e) setError(e.message); else setData(d) })
  }, [weeks])

  if (error) return <ErrorBox message={error} />

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
        {PERIODS.map(p => <Chip key={p.weeks} active={weeks === p.weeks} onClick={() => setWeeks(p.weeks)}>{p.label}</Chip>)}
        <div style={{ flex: 1 }} />
        <Chip active={showTable} onClick={() => setShowTable(v => !v)}>{showTable ? 'Voir les graphiques' : 'Voir le tableau'}</Chip>
      </div>

      {!data ? <Loading /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 24 }}>
            <StatTile label="Comptes" value={data.totaux.comptes} />
            <StatTile label="Actifs (30 j)" value={data.totaux.actifs_30j} />
            <StatTile label="Mesures (total)" value={data.totaux.mesures} />
            <StatTile label="Événements (total)" value={data.totaux.evenements} />
          </div>

          {showTable ? (
            <Section title="Activité par semaine">
              <div style={{ overflowX: 'auto', background: C.card, border: '1px solid ' + C.border, borderRadius: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: C.muted, textAlign: 'left' }}>
                      <th scope="col" style={{ padding: '10px 14px', fontWeight: 500 }}>Semaine du</th>
                      {METRICS.map(m => <th key={m.id} scope="col" style={{ padding: '10px 14px', fontWeight: 500, whiteSpace: 'nowrap' }}>{m.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {data.semaines.slice().reverse().map(s => (
                      <tr key={s.debut} style={{ borderTop: '1px solid ' + C.border }}>
                        <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>{weekLabel(s.debut)}</td>
                        {METRICS.map(m => <td key={m.id} className="mono" style={{ padding: '8px 14px' }}>{s[m.id]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {METRICS.map(m => {
                const sum = data.semaines.reduce((acc, s) => acc + s[m.id], 0)
                const total = m.average ? Math.round((sum / Math.max(data.semaines.length, 1)) * 10) / 10 : sum
                return (
                  <figure key={m.id} style={{ margin: 0, background: C.card, border: '1px solid ' + C.border, borderRadius: 12, padding: '14px 14px 6px' }}>
                    <figcaption style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{m.label}</div>
                        {m.hint && <div style={{ fontSize: 11, color: C.muted }}>{m.hint}</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{total}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{m.average ? 'par semaine en moyenne' : 'sur la période'}</div>
                      </div>
                    </figcaption>
                    <div role="img" aria-label={`${m.label} par semaine, ${m.average ? 'moyenne ' + total + ' par semaine' : 'total ' + total + ' sur la période'}`}>
                      <ResponsiveContainer width="100%" height={150}>
                        <BarChart data={data.semaines} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                          <CartesianGrid vertical={false} stroke={C.border} />
                          <XAxis dataKey="debut" tickFormatter={weekLabel} tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} minTickGap={16} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} width={40} />
                          <Tooltip cursor={{ fill: C.surface }} content={<ChartTooltip metric={m} />} />
                          <Bar dataKey={m.id} fill={C.accent} radius={[4, 4, 0, 0]} maxBarSize={22} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </figure>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
