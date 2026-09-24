import { Fragment, useState, useRef } from 'react'
import { C, KPI_CONFIG, DAY_MAP } from '../lib/constants'
import { toDateStr, getMonday, MATCH_RESULTS, hasScore, resultFromScore } from '../lib/stats'

// Accueil, vue coach : équipe, récap de la semaine, calendrier mensuel, séances et matchs du jour.
export default function DashboardCoach({
  activeCoachTeam, assignDailySession, assignMatchSession, changeTab, coachRosterData, dailyPickerFor,
  dailySessions, getDailySession, leadershipTeams, managedPlayers, removeDailySession, saveAnnotation,
  saveMatchResult, seanceTemplates, setCoachTeamId, setDailyPickerFor, setEquipeTab, setViewDay,
  updateDailySession, viewDay,
}) {
  const [calendarMonth, setCalendarMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [pickerMode, setPickerMode] = useState('entrainement')
  const [matchOpponent, setMatchOpponent] = useState('')
  const [annotatingId, setAnnotatingId] = useState(null)
  const [annotationDraft, setAnnotationDraft] = useState({ note_coach: '', rating_deroule: 0, rating_ressenti: 0 })
  const [editingDailySession, setEditingDailySession] = useState(false)
  const [dailySessionDraft, setDailySessionDraft] = useState(null)
  const [editingMatchId, setEditingMatchId] = useState(null)
  const [matchDraft, setMatchDraft] = useState({ resultat: null, buts: {}, presents: [], score_pour: '', score_contre: '' })
  const swipeStartX = useRef(null)

  const handleRemoveDailySession = async (id) => {
    if (await removeDailySession(id)) setEditingDailySession(false)
  }
  const handleUpdateDailySession = async (id, draft) => {
    if (await updateDailySession(id, draft)) { setEditingDailySession(false); setDailySessionDraft(null) }
  }
  const handleSaveAnnotation = async (id, draft) => {
    if (await saveAnnotation(id, draft)) setAnnotatingId(null)
  }
  const handleSaveMatchResult = async (id, draft) => {
    if (await saveMatchResult(id, draft)) setEditingMatchId(null)
  }

  return (
    <div>
      {leadershipTeams.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {leadershipTeams.map(team => {
            const sel = activeCoachTeam?.id === team.id
            return (
              <button key={team.id} onClick={() => setCoachTeamId(team.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 20, border: '2px solid ' + (sel ? team.color : C.border), background: sel ? team.color + '20' : C.card, color: sel ? team.color : C.muted, fontWeight: sel ? 700 : 500, fontSize: 13, cursor: 'pointer' }}>
                {team.name}
              </button>
            )
          })}
        </div>
      )}

      {!activeCoachTeam ? (
        <div style={{ background: C.card, borderRadius: 16, padding: 32, textAlign: 'center', color: C.muted }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🧠</div>
          Aucune équipe à suivre pour le moment
        </div>
      ) : (
        <>
          <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2a4a)', borderRadius: 16, padding: 16, marginBottom: 16, border: '1px solid ' + C.accent + '30' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: C.muted }}>ÉQUIPE SUIVIE</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: C.accentGlow }}>{activeCoachTeam.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: C.muted }}>Joueurs</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.green }}>{coachRosterData.length + managedPlayers.length}</div>
              </div>
            </div>
          </div>

          {(() => {
            const weekMonday = getMonday(new Date())
            const weekMondayStr = toDateStr(weekMonday)
            const weekSunday = new Date(weekMonday); weekSunday.setDate(weekMonday.getDate() + 6)
            const weekSundayStr = toDateStr(weekSunday)
            const todayStr = toDateStr(new Date())
            const weekPlanned = dailySessions.filter(d => d.team_id === activeCoachTeam.id && d.date >= weekMondayStr && d.date <= weekSundayStr)
            const matches = weekPlanned.filter(d => d.type === 'match')
            const realized = weekPlanned.filter(d => d.date <= todayStr)

            const allPlayers = [...coachRosterData, ...managedPlayers]
            const kpiAverages = KPI_CONFIG.map(kpi => {
              const values = []
              allPlayers.forEach(p => (p.mesuresData || []).forEach(m => {
                if (m.kpi_id === kpi.id && m.date >= weekMondayStr && m.date <= weekSundayStr) values.push(m.valeur)
              }))
              if (values.length === 0) return null
              return { kpi, avg: values.reduce((a, b) => a + b, 0) / values.length, count: values.length }
            }).filter(Boolean)

            if (weekPlanned.length === 0 && kpiAverages.length === 0) return null

            return (
              <div style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 16, border: '1px solid ' + C.border }}>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                  📊 Récap de la semaine
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: kpiAverages.length > 0 ? 14 : 0 }}>
                  <div style={{ background: C.surface, borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>PRÉVU VS RÉALISÉ</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{realized.length} / {weekPlanned.length}</div>
                  </div>
                  <div style={{ background: C.surface, borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>MATCH DE LA SEMAINE</div>
                    {matches.length > 0 ? (
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#eab308' }}>
                        🏆 {matches[0].label} · {new Date(matches[0].date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: C.muted }}>Aucun</div>
                    )}
                  </div>
                </div>
                {kpiAverages.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>MOYENNES KPI DE LA SEMAINE</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {kpiAverages.map(({ kpi, avg, count }) => (
                        <div key={kpi.id} style={{ background: kpi.color + '18', border: '1px solid ' + kpi.color + '40', borderRadius: 10, padding: '6px 10px', fontSize: 12 }}>
                          {kpi.icon} {kpi.label} : <b style={{ color: kpi.color }}>{avg.toFixed(1)}{kpi.unit === '/10' ? '/10' : ' ' + kpi.unit}</b>
                          <span style={{ color: C.muted }}> ({count})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <button onClick={() => { changeTab('equipe'); setEquipeTab('programme') }}
              style={{ background: 'none', border: 'none', color: C.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              📋 Gérer le programme
            </button>
          </div>
          {(() => {
            const monthLabel = calendarMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
            const year = calendarMonth.getFullYear(), month = calendarMonth.getMonth()
            const firstOfMonth = new Date(year, month, 1)
            const daysInMonth = new Date(year, month + 1, 0).getDate()
            const leading = (firstOfMonth.getDay() + 6) % 7 // lundi = 0
            const cells = []
            for (let i = 0; i < leading; i++) cells.push(null)
            for (let day = 1; day <= daysInMonth; day++) cells.push(day)
            const todayStr = toDateStr(new Date())
            const monthSessions = dailySessions.filter(d => d.team_id === activeCoachTeam.id && d.date.slice(0, 7) === `${year}-${String(month + 1).padStart(2, '0')}`)

            const changeMonth = (delta) => { setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() + delta, 1)); setViewDay(null) }

            return (
              <>
                <div
                  onTouchStart={e => { swipeStartX.current = e.touches[0].clientX }}
                  onTouchEnd={e => {
                    if (swipeStartX.current == null) return
                    const delta = e.changedTouches[0].clientX - swipeStartX.current
                    swipeStartX.current = null
                    if (delta > 50) changeMonth(-1)
                    else if (delta < -50) changeMonth(1)
                  }}
                  style={{ background: C.card, borderRadius: 16, border: '1px solid ' + C.border, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #4f6ef7)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', padding: 4 }}>‹</button>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>{monthLabel}</div>
                    <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', padding: 4 }}>›</button>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
                      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((c, i) => (
                        <div key={i} style={{ textAlign: 'center', fontSize: 11, color: C.muted, fontWeight: 700 }}>{c}</div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                      {cells.map((day, i) => {
                        if (!day) return <div key={i} />
                        const d = new Date(year, month, day)
                        const dateStr = toDateStr(d)
                        const dayCode = Object.keys(DAY_MAP).find(k => DAY_MAP[k] === d.getDay())
                        const s = getDailySession(activeCoachTeam.id, dateStr)
                        const planned = !!s
                        const selected = viewDay?.dateStr === dateStr
                        const isToday = dateStr === todayStr
                        return (
                          <button key={i} onClick={() => setViewDay(selected ? null : { dateStr, date: d, dayCode, s, teamId: activeCoachTeam.id })}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0', borderRadius: 10, border: selected ? '2px solid ' + C.accent : '2px solid transparent', background: isToday && !selected ? C.accent + '15' : 'transparent', cursor: 'pointer' }}>
                            <div style={{ fontSize: 14, fontWeight: isToday ? 800 : 600, color: isToday ? C.accent : C.text }}>{day}</div>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: planned ? s.color : 'transparent' }} />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {monthSessions.length > 0 && (
                    <div style={{ padding: '0 14px 12px', fontSize: 11, color: C.muted }}>
                      {monthSessions.length} séance{monthSessions.length > 1 ? 's' : ''} planifiée{monthSessions.length > 1 ? 's' : ''} ce mois-ci
                    </div>
                  )}
                </div>
                {viewDay && !viewDay.s && (
                  <div style={{ background: C.card, borderRadius: 14, padding: 20, marginBottom: 16, border: '1px solid ' + C.border, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: C.muted, textTransform: 'capitalize', marginBottom: 6 }}>
                      {viewDay.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    <div style={{ color: C.muted, fontSize: 13 }}>Aucune séance planifiée</div>
                  </div>
                )}
                {viewDay && viewDay.s && (
                  <div style={{ background: C.card, borderRadius: 14, padding: 16, marginBottom: 16, border: '1px solid ' + C.border }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: C.muted, textTransform: 'capitalize' }}>
                        {viewDay.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </div>
                      {!editingDailySession && (
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={() => { setDailySessionDraft(JSON.parse(JSON.stringify({ label: viewDay.s.label, duration: viewDay.s.duration, objectif: viewDay.s.objectif, blocs: viewDay.s.blocs || [] }))); setEditingDailySession(viewDay.s.id) }}
                            style={{ background: 'none', border: 'none', color: C.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>✏️ Modifier</button>
                          <button onClick={() => handleRemoveDailySession(viewDay.s.id)}
                            style={{ background: 'none', border: 'none', color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>🗑️ Supprimer</button>
                        </div>
                      )}
                    </div>

                    {editingDailySession === viewDay.s.id ? (
                      <div>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                          <input value={dailySessionDraft.label} placeholder="Nom de la séance"
                            onChange={e => setDailySessionDraft(d => ({ ...d, label: e.target.value }))}
                            style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 13, outline: 'none' }} />
                          <input value={dailySessionDraft.duration} placeholder="Durée"
                            onChange={e => setDailySessionDraft(d => ({ ...d, duration: e.target.value }))}
                            style={{ width: 80, background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 13, outline: 'none', textAlign: 'center' }} />
                        </div>
                        <input value={dailySessionDraft.objectif} placeholder="Objectif de la séance..."
                          onChange={e => setDailySessionDraft(d => ({ ...d, objectif: e.target.value }))}
                          style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />

                        {dailySessionDraft.blocs.map((bloc, bi) => (
                          <div key={bi} style={{ background: C.surface, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                              <input value={bloc.titre} placeholder="Titre du bloc"
                                onChange={e => { const d = JSON.parse(JSON.stringify(dailySessionDraft)); d.blocs[bi].titre = e.target.value; setDailySessionDraft(d) }}
                                style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid ' + C.border, color: C.text, fontSize: 13, fontWeight: 700, outline: 'none' }} />
                              <input value={bloc.duree} placeholder="Durée"
                                onChange={e => { const d = JSON.parse(JSON.stringify(dailySessionDraft)); d.blocs[bi].duree = e.target.value; setDailySessionDraft(d) }}
                                style={{ background: 'transparent', border: '1px solid ' + C.border, borderRadius: 6, color: viewDay.s.color, fontSize: 11, padding: '2px 6px', outline: 'none', width: 70, textAlign: 'center' }} />
                              <button onClick={() => setDailySessionDraft(d => ({ ...d, blocs: d.blocs.filter((_, i) => i !== bi) }))}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.red, fontSize: 14 }}>🗑️</button>
                            </div>
                            <textarea value={bloc.exercices.join('\n')} placeholder="Un exercice par ligne..."
                              onChange={e => { const d = JSON.parse(JSON.stringify(dailySessionDraft)); d.blocs[bi].exercices = e.target.value.split('\n'); setDailySessionDraft(d) }}
                              rows={Math.max(2, bloc.exercices.length + 1)}
                              style={{ width: '100%', background: C.card, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7, boxSizing: 'border-box' }} />
                          </div>
                        ))}
                        <button onClick={() => setDailySessionDraft(d => ({ ...d, blocs: [...d.blocs, { titre: '', duree: '', exercices: [''] }] }))}
                          style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px dashed ' + C.border, background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer', fontWeight: 600, marginBottom: 12 }}>
                          + Ajouter un bloc
                        </button>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => { setEditingDailySession(false); setDailySessionDraft(null) }}
                            style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer' }}>
                            Annuler
                          </button>
                          <button onClick={() => handleUpdateDailySession(viewDay.s.id, dailySessionDraft)}
                            style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                            ✓ Enregistrer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                          <div style={{ width: 42, height: 42, borderRadius: 12, background: viewDay.s.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{viewDay.s.icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{viewDay.s.label}</div>
                            <div style={{ fontSize: 12, color: C.muted }}>{viewDay.s.duration}{viewDay.s.objectif ? ' · ' + viewDay.s.objectif : ''}</div>
                          </div>
                        </div>
                        {(viewDay.s.blocs || []).map((bloc, bi) => (
                          <div key={bi} style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <div style={{ fontSize: 13, fontWeight: 700 }}>{bloc.titre}</div>
                              <div style={{ fontSize: 11, color: viewDay.s.color, background: viewDay.s.color + '20', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>{bloc.duree}</div>
                            </div>
                            {(bloc.exercices || []).filter(e => e.trim()).map((ex, ei) => (
                              <div key={ei} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'flex-start' }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: viewDay.s.color, marginTop: 6, flexShrink: 0 }} />
                                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.4 }}>{ex}</div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </>
                    )}

                    {!editingDailySession && viewDay.s.type === 'match' && (() => {
                      const matchPlayers = [...coachRosterData.filter(p => p.role === 'joueur'), ...managedPlayers]
                      const nameOf = (key) => { const p = matchPlayers.find(pl => pl.user_id === key); return p ? `${p.prenom || '—'} ${p.nom || ''}`.trim() : 'Joueur retiré' }
                      const savedButs = Object.entries(viewDay.s.buts || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
                      const totalButs = savedButs.reduce((a, [, n]) => a + n, 0)
                      return (
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid ' + C.border }}>
                          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Résultat du match</div>
                          {editingMatchId === viewDay.s.id ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
                                {[{ key: 'score_pour', label: 'Nous' }, { key: 'score_contre', label: 'Adversaire' }].map(({ key, label }, i) => (
                                  <Fragment key={key}>
                                    {i === 1 && <div style={{ fontSize: 20, fontWeight: 800, color: C.muted, marginTop: 14 }}>–</div>}
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
                                      <input type="number" min="0" inputMode="numeric" value={matchDraft[key]}
                                        onChange={e => setMatchDraft(d => {
                                          const next = { ...d, [key]: e.target.value }
                                          const res = resultFromScore(next.score_pour, next.score_contre)
                                          return res ? { ...next, resultat: res } : next
                                        })}
                                        style={{ width: 64, background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '8px 0', color: C.text, fontSize: 22, fontWeight: 800, outline: 'none', textAlign: 'center' }} />
                                    </div>
                                  </Fragment>
                                ))}
                              </div>
                              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                                {MATCH_RESULTS.map(r => (
                                  <button key={r.id} onClick={() => setMatchDraft(d => ({ ...d, resultat: d.resultat === r.id ? null : r.id }))}
                                    style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: matchDraft.resultat === r.id ? r.color : C.surface, color: matchDraft.resultat === r.id ? '#fff' : C.muted }}>
                                    {r.label}
                                  </button>
                                ))}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <div style={{ fontSize: 11, color: C.muted }}>✅ Présents ({matchDraft.presents.length}/{matchPlayers.length}) · ⚽ Buts</div>
                                {matchPlayers.length > 0 && (
                                  <button onClick={() => setMatchDraft(d => ({ ...d, presents: d.presents.length === matchPlayers.length ? [] : matchPlayers.map(p => p.user_id) }))}
                                    style={{ background: 'none', border: 'none', color: C.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                                    {matchDraft.presents.length === matchPlayers.length ? 'Tout décocher' : 'Tous présents'}
                                  </button>
                                )}
                              </div>
                              {matchPlayers.length === 0 && <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Aucun joueur dans l'équipe</div>}
                              {matchPlayers.map(p => {
                                const present = matchDraft.presents.includes(p.user_id)
                                const n = present ? (matchDraft.buts[p.user_id] || 0) : 0
                                const setN = (v) => setMatchDraft(d => ({ ...d, presents: d.presents.includes(p.user_id) ? d.presents : [...d.presents, p.user_id], buts: { ...d.buts, [p.user_id]: Math.max(0, v) } }))
                                const togglePresent = () => setMatchDraft(d => ({ ...d, presents: present ? d.presents.filter(k => k !== p.user_id) : [...d.presents, p.user_id] }))
                                return (
                                  <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid ' + C.border }}>
                                    <button onClick={togglePresent} title={present ? 'Présent' : 'Absent'}
                                      style={{ width: 26, height: 26, borderRadius: 7, border: '2px solid ' + (present ? C.green : C.border), background: present ? C.green : 'transparent', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', padding: 0, flexShrink: 0 }}>{present ? '✓' : ''}</button>
                                    <div onClick={togglePresent} style={{ flex: 1, fontSize: 13, fontWeight: n > 0 ? 700 : 400, color: present ? C.text : C.muted, cursor: 'pointer' }}>{p.prenom || '—'} {p.nom || ''}</div>
                                    <button onClick={() => setN(n - 1)} disabled={n === 0}
                                      style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid ' + C.border, background: C.surface, color: C.text, fontSize: 16, cursor: n === 0 ? 'default' : 'pointer', opacity: n === 0 ? 0.4 : 1 }}>−</button>
                                    <div style={{ width: 22, textAlign: 'center', fontWeight: 800, fontSize: 15, color: n > 0 ? '#eab308' : C.muted }}>{n}</div>
                                    <button onClick={() => setN(n + 1)}
                                      style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid ' + C.border, background: C.surface, color: C.text, fontSize: 16, cursor: 'pointer' }}>+</button>
                                  </div>
                                )
                              })}
                              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                <button onClick={() => setEditingMatchId(null)}
                                  style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer' }}>
                                  Annuler
                                </button>
                                <button onClick={() => handleSaveMatchResult(viewDay.s.id, matchDraft)}
                                  style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                                  ✓ Enregistrer
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              {(viewDay.s.resultat || hasScore(viewDay.s)) && (() => {
                                const r = MATCH_RESULTS.find(x => x.id === viewDay.s.resultat)
                                return (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                    {r && <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', background: r.color, borderRadius: 8, padding: '4px 12px' }}>{r.label}</div>}
                                    {hasScore(viewDay.s) && <div style={{ fontSize: 20, fontWeight: 900 }}>{viewDay.s.score_pour} – {viewDay.s.score_contre}</div>}
                                  </div>
                                )
                              })()}
                              {(viewDay.s.presents || []).length > 0 && (
                                <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, lineHeight: 1.5 }}>
                                  ✅ {viewDay.s.presents.length} présent{viewDay.s.presents.length > 1 ? 's' : ''} : <span style={{ color: C.text }}>{viewDay.s.presents.map(nameOf).join(', ')}</span>
                                </div>
                              )}
                              {savedButs.length > 0 && (
                                <div style={{ marginBottom: 8 }}>
                                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>⚽ {totalButs} but{totalButs > 1 ? 's' : ''}</div>
                                  {savedButs.map(([k, n]) => (
                                    <div key={k} style={{ fontSize: 13, marginBottom: 2 }}>{nameOf(k)} <b style={{ color: '#eab308' }}>× {n}</b></div>
                                  ))}
                                </div>
                              )}
                              <button onClick={() => { setMatchDraft({ resultat: viewDay.s.resultat || null, buts: { ...(viewDay.s.buts || {}) }, presents: [...(viewDay.s.presents || [])], score_pour: viewDay.s.score_pour ?? '', score_contre: viewDay.s.score_contre ?? '' }); setEditingMatchId(viewDay.s.id) }}
                                style={{ background: 'none', border: 'none', color: C.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                                🏆 {viewDay.s.resultat || hasScore(viewDay.s) || savedButs.length > 0 || (viewDay.s.presents || []).length > 0 ? 'Modifier le match (score, présents, buteurs)' : 'Saisir le score, les présents et les buteurs'}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {!editingDailySession && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid ' + C.border }}>
                        {annotatingId === viewDay.s.id ? (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
                              {[{ key: 'rating_deroule', label: 'Prévu vs déroulé' }, { key: 'rating_ressenti', label: 'Ressenti des joueurs' }].map(({ key, label }) => (
                                <div key={key} style={{ flex: 1 }}>
                                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
                                  <div style={{ display: 'flex', gap: 2 }}>
                                    {[1, 2, 3, 4, 5].map(n => (
                                      <button key={n} onClick={() => setAnnotationDraft(d => ({ ...d, [key]: d[key] === n ? 0 : n }))}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 0, opacity: n <= annotationDraft[key] ? 1 : 0.25 }}>⭐</button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <textarea value={annotationDraft.note_coach} placeholder="Note du coach sur cette séance..."
                              onChange={e => setAnnotationDraft(d => ({ ...d, note_coach: e.target.value }))}
                              rows={3}
                              style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10 }} />
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => setAnnotatingId(null)}
                                style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer' }}>
                                Annuler
                              </button>
                              <button onClick={() => handleSaveAnnotation(viewDay.s.id, annotationDraft)}
                                style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                                ✓ Enregistrer
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {(viewDay.s.rating_deroule || viewDay.s.rating_ressenti) && (
                              <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                                {viewDay.s.rating_deroule ? <div style={{ fontSize: 12, color: C.muted }}>Prévu/déroulé : <b style={{ color: C.text }}>{viewDay.s.rating_deroule}/5</b></div> : null}
                                {viewDay.s.rating_ressenti ? <div style={{ fontSize: 12, color: C.muted }}>Ressenti : <b style={{ color: C.text }}>{viewDay.s.rating_ressenti}/5</b></div> : null}
                              </div>
                            )}
                            {viewDay.s.note_coach && (
                              <div style={{ fontSize: 13, color: C.text, background: C.surface, borderRadius: 8, padding: 10, marginBottom: 8, lineHeight: 1.4 }}>{viewDay.s.note_coach}</div>
                            )}
                            <button onClick={() => { setAnnotationDraft({ note_coach: viewDay.s.note_coach || '', rating_deroule: viewDay.s.rating_deroule || 0, rating_ressenti: viewDay.s.rating_ressenti || 0 }); setAnnotatingId(viewDay.s.id) }}
                              style={{ background: 'none', border: 'none', color: C.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                              📝 {viewDay.s.note_coach || viewDay.s.rating_deroule || viewDay.s.rating_ressenti ? 'Modifier les notes' : 'Ajouter une note / noter la séance'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )
          })()}
        </>
      )}

      {dailyPickerFor && (
        <div onClick={() => { setDailyPickerFor(null); setPickerMode('entrainement'); setMatchOpponent('') }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: 16, padding: 20, maxWidth: 420, width: '100%', maxHeight: '80vh', overflowY: 'auto', border: '1px solid ' + C.border }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={() => setPickerMode('entrainement')}
                style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: pickerMode === 'entrainement' ? C.accent : C.surface, color: pickerMode === 'entrainement' ? '#fff' : C.muted }}>
                🏃 Entraînement
              </button>
              <button onClick={() => setPickerMode('match')}
                style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: pickerMode === 'match' ? '#eab308' : C.surface, color: pickerMode === 'match' ? '#fff' : C.muted }}>
                🏆 Match
              </button>
            </div>

            {pickerMode === 'entrainement' ? (
              <>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Choisir une séance de la bibliothèque</div>
                {seanceTemplates.length === 0 ? (
                  <div style={{ textAlign: 'center', color: C.muted, padding: '16px 0' }}>
                    Ta bibliothèque est vide — crée une séance dans l'onglet Bibliothèque
                  </div>
                ) : seanceTemplates.map(t => (
                  <button key={t.id} onClick={() => assignDailySession(dailyPickerFor.teamId, dailyPickerFor.dateStr, t)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: '1px solid ' + C.border, background: C.surface, color: C.text, cursor: 'pointer', marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{t.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{t.duration}{t.objectif ? ' · ' + t.objectif : ''}</div>
                    </div>
                  </button>
                ))}
              </>
            ) : (
              <>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Planifier un match</div>
                <input value={matchOpponent} placeholder="Adversaire (optionnel)"
                  onChange={e => setMatchOpponent(e.target.value)}
                  style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
                <button onClick={() => { assignMatchSession(dailyPickerFor.teamId, dailyPickerFor.dateStr, matchOpponent.trim()); setMatchOpponent('') }}
                  style={{ width: '100%', padding: 10, borderRadius: 10, border: 'none', background: '#eab308', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 8 }}>
                  🏆 Planifier ce match
                </button>
              </>
            )}

            <button onClick={() => { setDailyPickerFor(null); setPickerMode('entrainement'); setMatchOpponent('') }}
              style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
