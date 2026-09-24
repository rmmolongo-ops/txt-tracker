import { useState } from 'react'
import { LineChart, Line, BarChart, Bar, Cell, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { C, KPI_CONFIG, PLAYER_COLORS, DAY_ORDER, LEADERSHIP_ROLES, seanceRowKey } from '../lib/constants'
import { toDateStr, getMonday } from '../lib/stats'

// Onglet Équipe, vue coach / admin : effectif, performances, suivi des séances, programmes.

export default function EquipeCoachScreen({
  addManagedPlayer, addingManagedPlayer, adminData, coachRosterData, coachTeamId, deleteManagedPlayer,
  entryValue, equipeTab, equipeTeamId, getProgramForDate, getProgramsForTeam, isAdmin,
  isMobile, leadershipTeams, managedPlayerDraft, managedPlayers, myTeamRoles, openFiche,
  renderProgrammeCatalog, saveMesureForPlayer, setAddingManagedPlayer, setCoachTeamId, setEditingProg, setEditingProgramId,
  setEntryValue, setEquipeTab, setEquipeTeamId, setManagedPlayerDraft, setProgDraft, setSuiviSelected,
  suiviSelected, teamSeances, teams, unvalidateSeance, validateSeances,
}) {
  const [entryTarget, setEntryTarget] = useState(null)
  const [entryKpi, setEntryKpi] = useState('sprint30')
  const [equipeKpi, setEquipeKpi] = useState('sprint30')
  const [suiviWeekOffset, setSuiviWeekOffset] = useState(0)

  const equipeViewTeams = isAdmin ? teams : leadershipTeams
  const activeEquipeTeamId = isAdmin ? equipeTeamId : coachTeamId
  const selectEquipeTeam = (id) => {
    if (isAdmin) setEquipeTeamId(id); else setCoachTeamId(id)
    setEditingProg(false); setProgDraft(null); setEditingProgramId(null); setSuiviWeekOffset(0)
  }
  return (
  <div>
    {/* Sélecteur d'équipe */}
    {equipeViewTeams.length === 0 ? (
      <div style={{ background: C.card, borderRadius: 16, padding: 32, textAlign: 'center', color: C.muted }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🏟️</div>
        <div style={{ fontWeight: 700 }}>Aucune équipe créée</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>{isAdmin ? "Créez des équipes depuis l'onglet Admin" : "Tu ne diriges aucune équipe pour le moment"}</div>
      </div>
    ) : (
      <>
        {equipeViewTeams.length > 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {equipeViewTeams.map(team => {
              const sel = activeEquipeTeamId === team.id
              return (
                <button key={team.id} onClick={() => selectEquipeTeam(team.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 20, border: '2px solid ' + (sel ? team.color : C.border), background: sel ? team.color + '20' : C.card, color: sel ? team.color : C.muted, fontWeight: sel ? 700 : 500, fontSize: 14, cursor: 'pointer' }}>
                  {team.photo_url
                    ? <img src={team.photo_url} alt="" style={{ width: 22, height: 22, borderRadius: 6, objectFit: 'cover' }} />
                    : <span style={{ width: 10, height: 10, borderRadius: '50%', background: team.color, display: 'inline-block' }} />}
                  {team.name}
                </button>
              )
            })}
          </div>
        )}

        {!activeEquipeTeamId && (
          <div style={{ background: C.card, borderRadius: 16, padding: 32, textAlign: 'center', color: C.muted }}>
            Sélectionne une équipe ci-dessus
          </div>
        )}

        {activeEquipeTeamId && (() => {
          const equipeTeamId = activeEquipeTeamId
          const realPlayers = isAdmin ? adminData.filter(j => (j.teams || []).some(t => t.id === equipeTeamId)) : coachRosterData
          const teamPlayers = [...realPlayers, ...managedPlayers]
          const canManagePlayers = isAdmin || LEADERSHIP_ROLES.includes(myTeamRoles[equipeTeamId])
          return (
            <>
              {canManagePlayers && (
                <div style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 20, border: '1px solid ' + C.border }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: managedPlayers.length > 0 || addingManagedPlayer ? 12 : 0 }}>
                    <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Joueurs sans compte</div>
                    {!addingManagedPlayer && (
                      <button onClick={() => setAddingManagedPlayer(true)}
                        style={{ background: 'none', border: 'none', color: C.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                        + Ajouter un joueur
                      </button>
                    )}
                  </div>
                  {addingManagedPlayer && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                      <input placeholder="Prénom" value={managedPlayerDraft.prenom} onChange={e => setManagedPlayerDraft(d => ({ ...d, prenom: e.target.value }))}
                        style={{ flex: 1, minWidth: 100, background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 13, outline: 'none' }} />
                      <input placeholder="Nom" value={managedPlayerDraft.nom} onChange={e => setManagedPlayerDraft(d => ({ ...d, nom: e.target.value }))}
                        style={{ flex: 1, minWidth: 100, background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 13, outline: 'none' }} />
                      <input placeholder="Poste (optionnel)" value={managedPlayerDraft.poste1} onChange={e => setManagedPlayerDraft(d => ({ ...d, poste1: e.target.value }))}
                        style={{ flex: 1, minWidth: 100, background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 13, outline: 'none' }} />
                      <button onClick={() => { setAddingManagedPlayer(false); setManagedPlayerDraft({ prenom: '', nom: '', poste1: '' }) }}
                        style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
                      <button onClick={() => addManagedPlayer(equipeTeamId)}
                        style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: C.accent, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>✓ Ajouter</button>
                    </div>
                  )}
                  {managedPlayers.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {managedPlayers.map(p => (
                        <div key={p.managed_player_id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 16, background: C.surface, fontSize: 12 }}>
                          <span>{p.prenom || '—'} {p.nom || ''}</span>
                          <button onClick={() => deleteManagedPlayer(p.managed_player_id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.5, padding: 0 }}>🗑️</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {canManagePlayers && teamPlayers.length > 0 && (
                <div style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 20, border: '1px solid ' + C.border }}>
                  <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Saisir une performance</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <select value={entryTarget || ''} onChange={e => setEntryTarget(e.target.value)}
                      style={{ flex: '1 1 160px', background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 13, outline: 'none' }}>
                      <option value="">Joueur...</option>
                      {teamPlayers.map(p => <option key={p.user_id} value={p.user_id}>{p.prenom || '—'} {p.nom || ''}</option>)}
                    </select>
                    <select value={entryKpi} onChange={e => setEntryKpi(e.target.value)}
                      style={{ flex: '1 1 160px', background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 13, outline: 'none' }}>
                      {KPI_CONFIG.map(k => <option key={k.id} value={k.id}>{k.icon} {k.label}</option>)}
                    </select>
                    <input type="number" placeholder="Valeur" value={entryValue} onChange={e => setEntryValue(e.target.value)}
                      style={{ flex: '0 1 100px', background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 13, outline: 'none' }} />
                    <button disabled={!entryTarget || !entryValue}
                      onClick={() => saveMesureForPlayer(teamPlayers.find(p => p.user_id === entryTarget), entryKpi, entryValue)}
                      style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: entryTarget && entryValue ? C.accent : C.surface, color: entryTarget && entryValue ? '#fff' : C.muted, fontWeight: 700, fontSize: 13, cursor: entryTarget && entryValue ? 'pointer' : 'not-allowed' }}>
                      ✓ Enregistrer
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-tabs */}
              <div style={{ display: 'flex', background: C.surface, borderRadius: 12, padding: 4, marginBottom: 20, gap: 2 }}>
                {[{ id: 'perf', icon: '📊', label: 'Performances' }, { id: 'programme', icon: '📋', label: 'Programme' }, { id: 'suivi', icon: '✅', label: 'Suivi' }].map(t => (
                  <button key={t.id} onClick={() => { setEquipeTab(t.id); setEditingProg(false); setProgDraft(null); setEditingProgramId(null) }}
                    style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: equipeTab === t.id ? C.accent : 'transparent', color: equipeTab === t.id ? '#fff' : C.muted, transition: 'all 0.2s' }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* ── PERFORMANCES ── */}
              {equipeTab === 'perf' && (
                <div>
                  {teamPlayers.length === 0 ? (
                    <div style={{ background: C.card, borderRadius: 14, padding: 32, textAlign: 'center', color: C.muted }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
                      Aucun joueur dans cette équipe
                    </div>
                  ) : (
                    <>
                      {/* KPI selector */}
                      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
                        {KPI_CONFIG.map(kpi => (
                          <button key={kpi.id} onClick={() => setEquipeKpi(kpi.id)}
                            style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', background: equipeKpi === kpi.id ? kpi.color : C.surface, color: '#fff', opacity: equipeKpi === kpi.id ? 1 : 0.55, flexShrink: 0 }}>
                            {kpi.icon} {kpi.label.split(' ')[0]}
                          </button>
                        ))}
                      </div>

                      {(() => {
                        const kpi = KPI_CONFIG.find(k => k.id === equipeKpi)

                        /* Graphique comparatif en barres — valeurs actuelles */
                        const barData = teamPlayers
                          .filter(j => j.kpis?.[equipeKpi] != null)
                          .map((j, idx) => ({
                            name: (j.prenom || '?') + ' ' + (j.nom?.[0] || '') + '.',
                            val: j.kpis[equipeKpi],
                            color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
                          }))
                          .sort((a, b) => kpi.lower ? a.val - b.val : b.val - a.val)

                        /* Données timeline pour chaque joueur */
                        const playerCharts = teamPlayers.map((j, idx) => {
                          const arr = (j.mesuresData || [])
                            .filter(m => m.kpi_id === equipeKpi)
                            .sort((a, b) => a.date.localeCompare(b.date))
                          return {
                            player: j,
                            color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
                            chartData: arr.slice(-10).map(d => ({ date: d.date.slice(5), val: d.valeur })),
                            latest: arr.length > 0 ? arr[arr.length - 1].valeur : null,
                            prog: arr.length >= 2 ? (kpi.lower
                              ? ((arr[0].valeur - arr[arr.length-1].valeur) / arr[0].valeur * 100).toFixed(1)
                              : ((arr[arr.length-1].valeur - arr[0].valeur) / arr[0].valeur * 100).toFixed(1)
                            ) : null,
                          }
                        })

                        return (
                          <>
                            {/* Podium - vue comparative */}
                            {barData.length > 0 && (
                              <div style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 20, border: '1px solid ' + C.border }}>
                                <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                                  Comparaison — {kpi.label} {kpi.lower ? '(moins = mieux)' : ''}
                                </div>
                                <ResponsiveContainer width="100%" height={Math.max(180, barData.length * 56)}>
                                  <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 60, top: 4, bottom: 4 }} barCategoryGap="30%">
                                    <CartesianGrid stroke={C.border} horizontal={false} />
                                    <XAxis type="number" domain={[0, dataMax => Math.ceil(dataMax * 1.25)]} tick={{ fontSize: 11, fill: '#cbd5e1' }} axisLine={{ stroke: C.border }} tickLine={{ stroke: C.border }} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fontWeight: 600, fill: '#e2e8f0' }} axisLine={{ stroke: C.border }} tickLine={false} width={80} />
                                    <Tooltip
                                      cursor={{ fill: '#ffffff', opacity: 0.04 }}
                                      contentStyle={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 8, color: C.text, fontSize: 12 }}
                                      formatter={v => [v + ' ' + kpi.unit, kpi.label]} />
                                    <Bar dataKey="val" radius={[0, 6, 6, 0]} maxBarSize={28}>
                                      {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                      <LabelList dataKey="val" position="right" fill="#e2e8f0" fontSize={12} fontWeight={700}
                                        formatter={v => v + ' ' + kpi.unit} />
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            )}

                            {/* Graphiques individuels */}
                            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                              Courbe de progression par joueur
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                              {playerCharts.map(({ player: j, color, chartData, latest, prog }) => (
                                <div key={j.user_id} style={{ background: C.card, borderRadius: 14, border: '1px solid ' + C.border, overflow: 'hidden' }}>
                                  <div style={{ height: 3, background: color }} />
                                  <div style={{ padding: '12px 14px 8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                                        {j.photo_url ? <img src={j.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚽'}
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 13 }}>{j.prenom} {j.nom}</div>
                                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{j.poste1 || '—'}</div>
                                        <button onClick={() => openFiche(j, teamPlayers)}
                                          style={{ background: 'none', border: 'none', color: C.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                                          📋 Fiche joueur
                                        </button>
                                      </div>
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 20, fontWeight: 900, color: latest != null ? kpi.color : C.muted }}>
                                          {latest != null ? latest : '—'}
                                          <span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}> {kpi.unit}</span>
                                        </div>
                                        {prog != null && (
                                          <div style={{ fontSize: 11, fontWeight: 700, color: parseFloat(prog) >= 0 ? C.green : C.red }}>
                                            {parseFloat(prog) >= 0 ? '▲' : '▼'} {Math.abs(prog)}%
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {chartData.length >= 2 ? (
                                      <ResponsiveContainer width="100%" height={100}>
                                        <LineChart data={chartData}>
                                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: C.muted }} />
                                          <YAxis tick={{ fontSize: 9, fill: C.muted }} width={28} />
                                          <Tooltip contentStyle={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 6, color: C.text, fontSize: 11 }} formatter={v => [v + ' ' + kpi.unit]} />
                                          <Line type="monotone" dataKey="val" stroke={color} strokeWidth={2} dot={{ fill: color, r: 3 }} activeDot={{ r: 5 }} />
                                        </LineChart>
                                      </ResponsiveContainer>
                                    ) : (
                                      <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 12 }}>
                                        Pas assez de données
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )
                      })()}
                    </>
                  )}
                </div>
              )}

              {/* ── PROGRAMME (CATALOGUE) ── */}
              {equipeTab === 'programme' && renderProgrammeCatalog(equipeTeamId)}

              {/* ── SUIVI (PRÉSENCE / VALIDATION) ── */}
              {equipeTab === 'suivi' && (() => {
                const progs = getProgramsForTeam(equipeTeamId)
                if (progs.length === 0) {
                  return (
                    <div style={{ background: C.card, borderRadius: 16, padding: 32, textAlign: 'center', color: C.muted }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
                      Aucun programme planifié pour cette équipe
                    </div>
                  )
                }
                const minDate = progs.reduce((acc, p) => p.start_date < acc ? p.start_date : acc, progs[0].start_date)
                const maxDate = progs.reduce((acc, p) => p.end_date > acc ? p.end_date : acc, progs[0].end_date)
                const weekMonday = getMonday(new Date())
                weekMonday.setDate(weekMonday.getDate() + suiviWeekOffset * 7)
                const weekDates = DAY_ORDER.map((day, i) => {
                  const d = new Date(weekMonday); d.setDate(d.getDate() + i)
                  return { day, date: d, dateStr: toDateStr(d) }
                })
                const firstWeekMondayStr = toDateStr(getMonday(new Date(minDate + 'T00:00:00')))
                const lastWeekMondayStr = toDateStr(getMonday(new Date(maxDate + 'T00:00:00')))
                const currentWeekMondayStr = toDateStr(weekMonday)
                const canGoPrev = currentWeekMondayStr > firstWeekMondayStr
                const canGoNext = currentWeekMondayStr < lastWeekMondayStr

                return (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <button onClick={() => canGoPrev && setSuiviWeekOffset(o => o - 1)} disabled={!canGoPrev}
                        style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid ' + C.border, background: C.card, color: canGoPrev ? C.text : C.border, fontSize: 16, cursor: canGoPrev ? 'pointer' : 'default' }}>‹</button>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>
                          {weekDates[0].date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {weekDates[6].date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </div>
                        {suiviWeekOffset !== 0 && (
                          <button onClick={() => setSuiviWeekOffset(0)} style={{ background: 'none', border: 'none', color: C.accent, fontSize: 11, cursor: 'pointer', padding: 0, marginTop: 2 }}>Revenir à aujourd'hui</button>
                        )}
                      </div>
                      <button onClick={() => canGoNext && setSuiviWeekOffset(o => o + 1)} disabled={!canGoNext}
                        style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid ' + C.border, background: C.card, color: canGoNext ? C.text : C.border, fontSize: 16, cursor: canGoNext ? 'pointer' : 'default' }}>›</button>
                    </div>

                    {weekDates.map(({ day, date, dateStr }) => {
                      const program = getProgramForDate(equipeTeamId, dateStr)
                      const s = program?.sessions.find(x => x.day === day)
                      if (!s) return null
                      const dateLabel = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
                      const cardKey = dateStr
                      const doneRows = teamSeances.filter(se => se.jour === day && se.date === dateStr)
                      const doneUserIds = new Set(doneRows.map(seanceRowKey))
                      const selected = suiviSelected[cardKey] || new Set()
                      const pending = teamPlayers.filter(p => selected.has(p.user_id) && !doneUserIds.has(p.user_id))

                      const toggleSelect = (uid) => {
                        setSuiviSelected(prev => {
                          const next = new Set(prev[cardKey] || [])
                          if (next.has(uid)) next.delete(uid); else next.add(uid)
                          return { ...prev, [cardKey]: next }
                        })
                      }

                      return (
                        <div key={cardKey} style={{ marginBottom: 14, borderRadius: 16, overflow: 'hidden', border: '1px solid ' + C.border }}>
                          <div style={{ background: C.card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 42, height: 42, borderRadius: 12, background: s.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>{dateLabel}</div>
                              <div style={{ fontSize: 12, color: C.muted }}>{s.label} · {doneUserIds.size}/{teamPlayers.length} fait{doneUserIds.size !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                          <div style={{ padding: '10px 16px 14px' }}>
                            {teamPlayers.length === 0 ? (
                              <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 10 }}>Aucun joueur dans cette équipe</div>
                            ) : teamPlayers.map(p => {
                              const row = doneRows.find(r => seanceRowKey(r) === p.user_id)
                              const isDone = !!row
                              const isSelected = selected.has(p.user_id)
                              return (
                                <div key={p.user_id} onClick={() => !isDone && toggleSelect(p.user_id)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', borderRadius: 10, cursor: isDone ? 'default' : 'pointer', background: isSelected && !isDone ? C.accent + '15' : 'transparent' }}>
                                  <div style={{ width: 22, height: 22, borderRadius: 6, border: '2px solid ' + (isDone ? C.green : isSelected ? C.accent : C.border), background: isDone ? C.green : isSelected ? C.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', flexShrink: 0 }}>
                                    {(isDone || isSelected) && '✓'}
                                  </div>
                                  <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                                    {p.photo_url ? <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚽'}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {p.prenom || '—'} {p.nom || ''}
                                  </div>
                                  {isDone && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                      <span style={{ fontSize: 10, fontWeight: 700, color: row.validated_by ? C.gold : C.green, background: (row.validated_by ? C.gold : C.green) + '18', padding: '2px 7px', borderRadius: 8 }}>
                                        {row.validated_by ? '✓ Validé' : '✓ Fait'}
                                      </span>
                                      <button onClick={(e) => { e.stopPropagation(); unvalidateSeance(row.id, cardKey, p.user_id) }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, opacity: 0.4 }}>🗑️</button>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                            {pending.length > 0 && (
                              <button onClick={() => validateSeances(pending.map(p => p.user_id), day, dateStr, equipeTeamId, cardKey)}
                                style={{ marginTop: 10, width: '100%', padding: '10px', background: C.accent, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                                Valider pour {pending.length} joueur{pending.length !== 1 ? 's' : ''}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </>
          )
        })()}
      </>
    )}
  </div>
  )
}
