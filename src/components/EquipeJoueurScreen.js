import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C, ROLE_CONFIG } from '../lib/constants'
import { toDateStr } from '../lib/stats'

// Onglet Équipe, vue joueur : effectif de ses équipes et programmes d'entraînement de l'équipe.

export default function EquipeJoueurScreen({ myTeams, getProgramsForTeam, isMobile }) {
  const [rosterTeamId, setRosterTeamId] = useState(null)
  const [equipePlayerTab, setEquipePlayerTab] = useState('joueurs')
  const [expandedPlayerProgramId, setExpandedPlayerProgramId] = useState(null)
  const [rosterPlayers, setRosterPlayers] = useState([])

  useEffect(() => {
    if (rosterTeamId) return
    if (myTeams.length > 0) setRosterTeamId(myTeams[0].id)
  }, [myTeams, rosterTeamId])

  useEffect(() => {
    if (!rosterTeamId) return
    let active = true
    ;(async () => {
      const { data: members } = await supabase.from('team_members').select('user_id, role').eq('team_id', rosterTeamId)
      const roleMap = {}
      ;(members || []).forEach(m => { roleMap[m.user_id] = m.role })
      const ids = (members || []).map(m => m.user_id)
      if (ids.length === 0) { if (active) setRosterPlayers([]); return }
      const { data: players } = await supabase.from('profils').select('user_id, nom, prenom, surnom, photo_url, poste1, poste2').in('user_id', ids)
      if (active) setRosterPlayers((players || []).map(p => ({ ...p, role: roleMap[p.user_id] || 'joueur' })))
    })()
    return () => { active = false }
  }, [rosterTeamId])

  if (myTeams.length === 0) {
    return (
      <div style={{ background: C.card, borderRadius: 16, padding: 32, textAlign: 'center', color: C.muted }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
        Rejoins une équipe pour voir tes coéquipiers
      </div>
    )
  }
  const activeTeamId = myTeams.some(t => t.id === rosterTeamId) ? rosterTeamId : myTeams[0].id
  const activeTeam = myTeams.find(t => t.id === activeTeamId)
  const sortedPlayers = rosterPlayers.slice().sort((a, b) => (a.prenom || '').localeCompare(b.prenom || ''))
  const teamPrograms = getProgramsForTeam(activeTeamId)
  return (
    <div>
      {myTeams.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {myTeams.map(team => {
            const sel = activeTeamId === team.id
            return (
              <button key={team.id} onClick={() => { setRosterTeamId(team.id); setExpandedPlayerProgramId(null) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 20, border: '2px solid ' + (sel ? team.color : C.border), background: sel ? team.color + '20' : C.card, color: sel ? team.color : C.muted, fontWeight: sel ? 700 : 500, fontSize: 13, cursor: 'pointer' }}>
                {team.name}
              </button>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', background: C.surface, borderRadius: 12, padding: 4, marginBottom: 16, gap: 2 }}>
        {[{ id: 'joueurs', icon: '👥', label: 'Joueurs' }, { id: 'programme', icon: '📋', label: 'Programme' }].map(t => (
          <button key={t.id} onClick={() => setEquipePlayerTab(t.id)}
            style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: equipePlayerTab === t.id ? C.accent : 'transparent', color: equipePlayerTab === t.id ? '#fff' : C.muted, transition: 'all 0.2s' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {equipePlayerTab === 'joueurs' && (
        <>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
            {sortedPlayers.length} joueur{sortedPlayers.length !== 1 ? 's' : ''} · {activeTeam?.name}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
            {sortedPlayers.map(p => (
              <div key={p.user_id} style={{ background: C.card, borderRadius: 14, padding: 14, border: '1px solid ' + C.border, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {p.photo_url ? <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚽'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.prenom || '—'} {p.nom || ''}{p.surnom && <span style={{ color: C.gold }}> "{p.surnom}"</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{p.poste1 || '—'}{p.poste2 ? ' · ' + p.poste2 : ''}</div>
                  {p.role !== 'joueur' && (
                    <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 700, color: ROLE_CONFIG[p.role].color, background: ROLE_CONFIG[p.role].color + '18', padding: '2px 7px', borderRadius: 8 }}>
                      {ROLE_CONFIG[p.role].label}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {equipePlayerTab === 'programme' && (
        <div>
          {teamPrograms.length === 0 ? (
            <div style={{ background: C.card, borderRadius: 16, padding: 32, textAlign: 'center', color: C.muted }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
              Aucun programme planifié pour cette équipe
            </div>
          ) : teamPrograms.map(prog => {
            const today = toDateStr(new Date())
            const status = today < prog.start_date ? { label: 'À venir', color: C.gold } : today > prog.end_date ? { label: 'Terminé', color: C.muted } : { label: 'En cours', color: C.green }
            const expanded = expandedPlayerProgramId === prog.id
            return (
              <div key={prog.id} style={{ background: C.card, borderRadius: 14, marginBottom: 10, border: '1px solid ' + (expanded ? C.accent + '60' : C.border), overflow: 'hidden' }}>
                <div onClick={() => setExpandedPlayerProgramId(expanded ? null : prog.id)}
                  style={{ padding: 16, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{prog.name}</div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: status.color, background: status.color + '20', padding: '2px 8px', borderRadius: 8 }}>{status.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>
                      Du {new Date(prog.start_date).toLocaleDateString('fr-FR')} au {new Date(prog.end_date).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <div style={{ fontSize: 18, color: C.muted, flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>⌄</div>
                </div>
                {expanded && (
                  <div style={{ borderTop: '1px solid ' + C.border, padding: '14px 16px' }}>
                    {prog.sessions.map((s, si) => (
                      <div key={s.day} style={{ marginBottom: si < prog.sessions.length - 1 ? 16 : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 16 }}>{s.icon}</span>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{s.day} — {s.label}</span>
                          <span style={{ fontSize: 11, color: s.color, background: s.color + '20', padding: '2px 8px', borderRadius: 8, marginLeft: 'auto', flexShrink: 0 }}>{s.duration}</span>
                        </div>
                        <div style={{ fontSize: 12, color: s.color, marginBottom: 8, marginLeft: 24 }}>🎯 {s.objectif}</div>
                        {s.blocs.map((bloc, bi) => (
                          <div key={bi} style={{ marginBottom: 8, marginLeft: 24 }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{bloc.titre} <span style={{ color: C.muted, fontWeight: 400 }}>({bloc.duree})</span></div>
                            {bloc.exercices.map((ex, ei) => (
                              <div key={ei} style={{ fontSize: 12, color: C.muted, marginTop: 3, display: 'flex', gap: 6 }}>
                                <span>•</span><span>{ex}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
