import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C, ROLE_CONFIG } from '../lib/constants'
import { toDateStr } from '../lib/stats'
import Icon from './Icons'

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
      <div style={{ border: '1px dashed ' + C.border, borderRadius: 14, padding: '32px 20px', textAlign: 'center', color: C.muted, fontSize: 14 }}>
        <Icon name="equipe" size={28} style={{ margin: '0 auto 12px' }} />
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
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 8, border: '1px solid ' + (sel ? C.accent : C.border), background: sel ? C.accent + '22' : 'transparent', color: sel ? C.accentGlow : C.muted, fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                {team.name}
              </button>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', borderRadius: 10, padding: 3, marginBottom: 20, gap: 2, border: '1px solid ' + C.border }}>
        {[{ id: 'joueurs', label: 'Joueurs' }, { id: 'programme', label: 'Programme' }].map(t => (
          <button key={t.id} onClick={() => setEquipePlayerTab(t.id)}
            style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 14, background: equipePlayerTab === t.id ? C.surface : 'transparent', color: equipePlayerTab === t.id ? C.text : C.muted }}>
            {t.label}
          </button>
        ))}
      </div>

      {equipePlayerTab === 'joueurs' && (
        <>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 8, fontWeight: 500 }}>
            {sortedPlayers.length} joueur{sortedPlayers.length !== 1 ? 's' : ''} · {activeTeam?.name}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', columnGap: 24 }}>
            {sortedPlayers.map(p => (
              <div key={p.user_id} style={{ padding: '12px 0', borderBottom: '1px solid ' + C.border, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', background: C.card, border: '1px solid ' + C.border, color: C.accentGlow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                  {p.photo_url ? <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : ((p.prenom || '?').charAt(0) + (p.nom || '').charAt(0)).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.prenom || '—'} {p.nom || ''}{p.surnom && <span style={{ color: C.muted, fontWeight: 400 }}> « {p.surnom} »</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{p.poste1 || '—'}{p.poste2 ? ' · ' + p.poste2 : ''}</div>
                  {p.role !== 'joueur' && (
                    <span style={{ display: 'inline-block', marginTop: 4, fontSize: 12, fontWeight: 500, color: C.accentGlow }}>
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
            <div style={{ border: '1px dashed ' + C.border, borderRadius: 14, padding: '32px 20px', textAlign: 'center', color: C.muted, fontSize: 14 }}>
              <Icon name="seances" size={28} style={{ margin: '0 auto 12px' }} />
              Aucun programme planifié pour cette équipe
            </div>
          ) : teamPrograms.map(prog => {
            const today = toDateStr(new Date())
            const status = today < prog.start_date ? { label: 'À venir', color: C.accentGlow } : today > prog.end_date ? { label: 'Terminé', color: C.muted } : { label: 'En cours', color: C.green }
            const expanded = expandedPlayerProgramId === prog.id
            return (
              <div key={prog.id} style={{ background: C.card, borderRadius: 14, marginBottom: 10, border: '1px solid ' + (expanded ? C.accent + '60' : C.border), overflow: 'hidden' }}>
                <div onClick={() => setExpandedPlayerProgramId(expanded ? null : prog.id)} role="button" tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedPlayerProgramId(expanded ? null : prog.id) } }}
                  style={{ padding: 16, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{prog.name}</div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: status.color }}>{status.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>
                      Du {new Date(prog.start_date).toLocaleDateString('fr-FR')} au {new Date(prog.end_date).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <Icon name="chevron" size={18} style={{ color: C.muted, flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                </div>
                {expanded && (
                  <div style={{ borderTop: '1px solid ' + C.border, padding: '14px 16px' }}>
                    {prog.sessions.map((s, si) => (
                      <div key={s.day} style={{ marginBottom: si < prog.sessions.length - 1 ? 16 : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span className="mono" style={{ fontSize: 12, color: C.muted, width: 32 }}>{s.day}</span>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</span>
                          <span className="mono" style={{ fontSize: 12, color: C.muted, marginLeft: 'auto', flexShrink: 0 }}>{s.duration}</span>
                        </div>
                        <div style={{ fontSize: 12, color: C.accentGlow, marginBottom: 8, marginLeft: 40 }}>Objectif : {s.objectif}</div>
                        {s.blocs.map((bloc, bi) => (
                          <div key={bi} style={{ marginBottom: 8, marginLeft: 40 }}>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{bloc.titre} <span style={{ color: C.muted, fontWeight: 400 }}>({bloc.duree})</span></div>
                            {bloc.exercices.map((ex, ei) => (
                              <div key={ei} style={{ fontSize: 12, color: C.muted, marginTop: 3, display: 'flex', gap: 6 }}>
                                <span aria-hidden="true">·</span><span>{ex}</span>
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
