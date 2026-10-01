import { useState, useEffect } from 'react'
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { supabase } from '../lib/supabase'
import { C, KPI_CONFIG, RADAR_AXES } from '../lib/constants'
import { buildRadarData, kpiProgression, MATCH_RESULTS, hasScore, playerMatchStats } from '../lib/stats'

// Fiche joueur façon scouting (modale) : infos, radar, matchs, KPIs, export.
// `player` porte `__pool` : les joueurs de référence pour situer le radar.
export default function FicheJoueur({ player, onClose }) {
  const [matches, setMatches] = useState([])

  useEffect(() => {
    if (!player) { setMatches([]); return }
    let active = true
    const j = player
    ;(async () => {
      let teamIds = (j.teams || []).map(t => t.id)
      if (j.team_id) teamIds.push(j.team_id)
      if (teamIds.length === 0) {
        const { data } = j.isManaged
          ? await supabase.from('managed_players').select('team_id').eq('id', j.managed_player_id)
          : await supabase.from('team_members').select('team_id').eq('user_id', j.user_id)
        teamIds = (data || []).map(r => r.team_id)
      }
      if (teamIds.length === 0) return
      const { data } = await supabase.from('team_daily_sessions').select('id, team_id, date, label, resultat, buts, presents, score_pour, score_contre').eq('type', 'match').in('team_id', [...new Set(teamIds)]).order('date', { ascending: false })
      if (active) setMatches(data || [])
    })()
    return () => { active = false }
  }, [player])

  const j = player
  const radarData = buildRadarData(j, j.__pool, RADAR_AXES, KPI_CONFIG)
  const semaine = j.seancesSemaine
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} id="fiche-joueur-print" style={{ background: C.card, borderRadius: 18, padding: 20, maxWidth: 460, width: '100%', maxHeight: '88vh', overflowY: 'auto', border: '1px solid ' + C.border }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 58, height: 58, borderRadius: 14, background: C.surface, color: C.accentGlow, fontWeight: 600, overflow: 'hidden', display: 'grid', placeItems: 'center', fontSize: 20, flexShrink: 0 }}>
              {j.photo_url ? <img src={j.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (((j.prenom || '').charAt(0) + (j.nom || '').charAt(0)).toUpperCase() || 'TxT')}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 18, letterSpacing: '-0.01em' }}>{j.prenom || '—'} {j.nom || ''}</div>
              <div style={{ fontSize: 13, color: C.muted, fontWeight: 400 }}>"{j.surnom || 'TxT'}"</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{j.poste1 || '—'}{j.poste2 ? ' / ' + j.poste2 : ''} {j.club ? '· ' + j.club : ''}</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer la fiche joueur" style={{ background: 'none', border: 'none', color: C.muted, fontSize: 20, cursor: 'pointer', padding: 0 }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <div style={{ background: C.surface, borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Séances validées</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{j.nb_seances || 0}</div>
          </div>
          <div style={{ background: C.surface, borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Dernière séance</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {(j.derniereSeance || j.derniere_seance) ? new Date(j.derniereSeance || j.derniere_seance).toLocaleDateString('fr-FR') : '—'}
            </div>
          </div>
          {semaine != null && (
            <div style={{ background: C.surface, borderRadius: 10, padding: '10px 12px', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Séances sur les 7 derniers jours</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{semaine}</div>
            </div>
          )}
        </div>

        {(() => {
          const { teamMatches, played, totalButs, bilan, butsOf, isAbsent } = playerMatchStats(matches, j.user_id)
          if (teamMatches.length === 0) return null
          return (
            <>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 8, fontWeight: 500 }}>Matchs</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div style={{ background: C.surface, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Joués</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{played.length}<span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}> / {teamMatches.length}</span></div>
                </div>
                <div style={{ background: C.surface, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Buts</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{totalButs}</div>
                </div>
                <div style={{ background: C.surface, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Bilan</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}>
                    {played.length === 0 ? <span style={{ color: C.muted }}>—</span> : MATCH_RESULTS.map((r, i) => <span key={r.id} style={{ color: r.color }}>{i > 0 ? ' · ' : ''}{bilan[r.id]}{r.short}</span>)}
                  </div>
                </div>
              </div>
              <div style={{ background: C.surface, borderRadius: 10, padding: '6px 12px', marginBottom: 16 }}>
                {teamMatches.slice(0, 8).map(m => {
                  const r = MATCH_RESULTS.find(x => x.id === m.resultat)
                  const n = butsOf(m)
                  const absent = isAbsent(m)
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 12, opacity: absent ? 0.5 : 1 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, background: r ? r.color : C.border, color: '#fff', fontWeight: 600, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{r ? r.short : '?'}</div>
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</div>
                      {hasScore(m) && <div style={{ fontWeight: 600 }}>{m.score_pour}-{m.score_contre}</div>}
                      <div style={{ color: C.muted }}>{new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
                      <div style={{ minWidth: 52, textAlign: 'right', fontWeight: 600, color: n > 0 ? C.text : C.muted }}>{absent ? 'Absent' : n > 0 ? `${n} but${n > 1 ? 's' : ''}` : '—'}</div>
                    </div>
                  )
                })}
              </div>
            </>
          )
        })()}

        <div style={{ fontSize: 13, color: C.muted, marginBottom: 8, fontWeight: 500 }}>Profil</div>
        <div style={{ background: C.surface, borderRadius: 12, padding: 8, marginBottom: 16 }}>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={C.border} />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: C.muted }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="value" stroke={C.accent} fill={C.accent} fillOpacity={0.35} />
            </RadarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 12, color: C.muted, textAlign: 'center' }}>Position relative à l'équipe (0 = plus faible, 100 = plus fort)</div>
        </div>

        <div style={{ fontSize: 13, color: C.muted, marginBottom: 8, fontWeight: 500 }}>Performances & progression</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {KPI_CONFIG.map(kpi => {
            const arr = (j.mesuresData || []).filter(m => m.kpi_id === kpi.id).sort((a, b) => a.date.localeCompare(b.date))
            const latest = arr.length > 0 ? arr[arr.length - 1].valeur : null
            const prog = kpiProgression(arr.map(m => m.valeur), kpi.lower)
            return (
              <div key={kpi.id} style={{ background: C.surface, borderRadius: 10, padding: '8px 10px' }}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>{kpi.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: latest != null ? C.text : C.muted }}>{latest != null ? latest : '—'}</div>
                  {latest != null && <div style={{ fontSize: 12, color: C.muted }}>{kpi.unit}</div>}
                  {prog != null && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: parseFloat(prog) >= 0 ? C.green : C.red, marginLeft: 'auto' }}>
                      {parseFloat(prog) >= 0 ? '▲' : '▼'}{Math.abs(prog)}%
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <button onClick={() => window.print()}
          style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: C.accent, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          Exporter / Imprimer la fiche
        </button>
      </div>
    </div>
  )
}
