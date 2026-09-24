import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { C, KPI_CONFIG, ROLE_CONFIG, GHOST_PREFIX } from '../lib/constants'

// Onglet Admin : vue d'ensemble (stats, inscriptions, équipes, clubs, joueurs sans équipe)
// et détail d'une équipe (joueurs, programmes). Les actions en base restent dans App ;
// l'écran gère l'état d'interface (saisies, dépliages, confirmations).
export default function AdminScreen({
  addManagedPlayer, addingManagedPlayer, adminData, adminDeleteMesure, adminError, adminLoading,
  adminManagedPlayers, adminView, clubs, coachRosterData, createClub, createTeam,
  deleteClub, deleteManagedPlayer, deleteTeam, deleteUserAccount, isAdmin, isMobile,
  loadAdminData, managedPlayerDraft, managedPlayers, openFiche, renderProgrammeCatalog, resendConfirmation,
  selectedAdminTeam, setAddingManagedPlayer, setAdminView, setEditingProg, setEditingProgramId, setManagedPlayerDraft,
  setPlayerRole, setProgDraft, setSelectedAdminTeam, shareInviteLink, teams, togglePlayerTeam,
  unconfirmedSignups, uploadTeamPhoto, uploadingTeamPhoto,
}) {
  const [adminDetailTab, setAdminDetailTab] = useState('joueurs')
  const [expandedAdmin, setExpandedAdmin] = useState(null)
  const [adminChartKpi, setAdminChartKpi] = useState('sprint30')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [mesureToDelete, setMesureToDelete] = useState(null)
  const [newTeamName, setNewTeamName] = useState('')
  const [newClubName, setNewClubName] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [creatingClub, setCreatingClub] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(null)

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return
    setCreatingTeam(true)
    if (await createTeam(newTeamName.trim())) setNewTeamName('')
    setCreatingTeam(false)
  }

  const handleCreateClub = async () => {
    if (!newClubName.trim()) return
    setCreatingClub(true)
    if (await createClub(newClubName.trim())) setNewClubName('')
    setCreatingClub(false)
  }

  const handleResend = async (email) => {
    setResendingEmail(email)
    await resendConfirmation(email)
    setResendingEmail(null)
  }

  const handleDeleteUser = async (userId) => {
    if (await deleteUserAccount(userId)) { setExpandedAdmin(null); setDeleteConfirm(null) }
  }

  const handleDeleteMesure = async (target, mesureId) => {
    if (await adminDeleteMesure(target, mesureId)) setMesureToDelete(null)
  }

  const renderPlayerCard = (j, cardKey, teamContextId) => {
    const expanded = expandedAdmin === cardKey
    const currentRole = teamContextId && !j.isManaged ? ((j.teams || []).find(t => t.id === teamContextId)?.role || 'joueur') : null
    return (
      <div key={cardKey} style={{ background: C.card, borderRadius: 16, border: '1px solid ' + (expanded ? C.accent + '60' : C.border), overflow: 'hidden' }}>
        <div onClick={() => setExpandedAdmin(expanded ? null : cardKey)} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
            {j.photo_url ? <img src={j.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚽'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {j.prenom || '—'} {j.nom || ''} <span style={{ color: C.gold }}>"{j.surnom || 'TxT'}"</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 11, color: C.muted }}>{j.poste1 || '—'} • {j.club || '—'}</div>
              {(j.teams || []).map(t => (
                <span key={t.id} style={{ fontSize: 10, fontWeight: 700, color: t.color, background: t.color + '20', padding: '1px 7px', borderRadius: 10 }}>{t.name}</span>
              ))}
            </div>
            {currentRole && (
              <select value={currentRole} onClick={e => e.stopPropagation()}
                onChange={e => setPlayerRole(j.user_id, teamContextId, e.target.value)}
                style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: ROLE_CONFIG[currentRole].color, background: ROLE_CONFIG[currentRole].color + '18', border: '1px solid ' + ROLE_CONFIG[currentRole].color + '50', borderRadius: 8, padding: '2px 6px', cursor: 'pointer', outline: 'none' }}>
                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
              </select>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>{j.nb_seances || 0} séances</div>
            <div style={{ fontSize: 11, color: C.muted }}>{j.nb_mesures || 0} mesures</div>
            <button onClick={e => { e.stopPropagation(); openFiche(j, [...(isAdmin ? adminData : coachRosterData), ...(isAdmin ? adminManagedPlayers : managedPlayers)]) }}
              style={{ background: 'none', border: 'none', color: C.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              📋 Fiche
            </button>
          </div>
          <div style={{ fontSize: 16, color: C.muted, marginLeft: 4, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>⌄</div>
        </div>

        {expanded && (
          <div style={{ borderTop: '1px solid ' + C.border, padding: '14px 16px' }}>
            {j.isManaged && (
              <div style={{ background: C.surface, borderRadius: 10, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: C.muted }}>
                👻 Joueur sans compte — géré par le coach/admin, pas d'accès à l'application
              </div>
            )}
            {j.email && (
              <div style={{ background: C.surface, borderRadius: 10, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>✉️</span>
                <div>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 1 }}>EMAIL</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{j.email}</div>
                </div>
              </div>
            )}

            {!j.isManaged && (
              <div style={{ background: C.surface, borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 8, fontWeight: 600 }}>ÉQUIPES</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {teams.map(t => {
                    const inTeam = (j.teams || []).some(jt => jt.id === t.id)
                    return (
                      <button key={t.id} onClick={() => togglePlayerTeam(j.user_id, t.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 16, border: '2px solid ' + (inTeam ? t.color : C.border), background: inTeam ? t.color + '20' : 'transparent', color: inTeam ? t.color : C.muted, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        {inTeam ? '✓ ' : '+ '}{t.name}
                      </button>
                    )
                  })}
                  {teams.length === 0 && <span style={{ fontSize: 12, color: C.muted }}>Aucune équipe créée</span>}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <div style={{ background: C.surface, borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>DERNIÈRE SÉANCE</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: j.derniere_seance ? C.green : C.muted }}>
                  {j.derniere_seance ? new Date(j.derniere_seance).toLocaleDateString('fr-FR') : '—'}
                </div>
              </div>
              <div style={{ background: C.surface, borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>DERNIÈRE MESURE</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: j.derniere_mesure ? C.accent : C.muted }}>
                  {j.derniere_mesure ? new Date(j.derniere_mesure).toLocaleDateString('fr-FR') : '—'}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Performances</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
              {KPI_CONFIG.map(kpi => (
                <div key={kpi.id} onClick={() => setAdminChartKpi(kpi.id)}
                  style={{ background: adminChartKpi === kpi.id ? kpi.color + '20' : C.bg, borderRadius: 8, padding: '8px 10px', textAlign: 'center', cursor: 'pointer', border: '1px solid ' + (adminChartKpi === kpi.id ? kpi.color + '60' : 'transparent'), transition: 'all 0.15s' }}>
                  <div style={{ fontSize: 14, marginBottom: 2 }}>{kpi.icon}</div>
                  <div style={{ fontSize: 9, color: C.muted, marginBottom: 2, lineHeight: 1.2 }}>{kpi.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: j.kpis?.[kpi.id] != null ? kpi.color : C.muted }}>
                    {j.kpis?.[kpi.id] != null ? j.kpis[kpi.id] : '—'}
                  </div>
                  {j.kpis?.[kpi.id] != null && <div style={{ fontSize: 9, color: C.muted }}>{kpi.unit}</div>}
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid ' + C.border, paddingTop: 14 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
                Graphique — {KPI_CONFIG.find(k => k.id === adminChartKpi)?.label}
              </div>
              {(() => {
                const kpi = KPI_CONFIG.find(k => k.id === adminChartKpi)
                const arr = (j.mesuresData || []).filter(m => m.kpi_id === adminChartKpi).sort((a, b) => a.date.localeCompare(b.date))
                const chartData = arr.slice(-12).map(d => ({ date: d.date.slice(5), val: d.valeur }))
                if (chartData.length < 2) return (
                  <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.surface, borderRadius: 10, color: C.muted, fontSize: 12 }}>
                    Moins de 2 mesures pour ce KPI
                  </div>
                )
                return (
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: C.muted }} />
                      <YAxis tick={{ fontSize: 9, fill: C.muted }} />
                      <Tooltip contentStyle={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 8, color: C.text, fontSize: 11 }} />
                      <Line type="monotone" dataKey="val" stroke={kpi.color} strokeWidth={2} dot={{ fill: kpi.color, r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )
              })()}
              <div style={{ fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 6 }}>Cliquez sur un KPI pour changer le graphique</div>
            </div>

            {isAdmin && (() => {
              const kpi = KPI_CONFIG.find(k => k.id === adminChartKpi)
              const entries = (j.mesuresData || []).filter(m => m.kpi_id === adminChartKpi && m.id).sort((a, b) => b.date.localeCompare(a.date))
              return (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid ' + C.border }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
                    Saisies — {kpi?.label} ({entries.length})
                  </div>
                  {entries.length === 0 ? (
                    <div style={{ fontSize: 12, color: C.muted }}>Aucune saisie pour ce KPI</div>
                  ) : (
                    <div style={{ background: C.surface, borderRadius: 10, padding: '4px 12px', maxHeight: 220, overflowY: 'auto' }}>
                      {entries.map(m => (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid ' + C.border, fontSize: 13 }}>
                          <div style={{ color: C.muted, width: 80 }}>{new Date(m.date).toLocaleDateString('fr-FR')}</div>
                          <div style={{ flex: 1, fontWeight: 700, color: kpi?.color }}>{m.valeur} <span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>{kpi?.unit}</span></div>
                          {mesureToDelete === m.id ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => setMesureToDelete(null)}
                                style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: 12, cursor: 'pointer' }}>Annuler</button>
                              <button onClick={() => handleDeleteMesure(j, m.id)}
                                style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: C.red, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Supprimer</button>
                            </div>
                          ) : (
                            <button onClick={() => setMesureToDelete(m.id)} title="Supprimer cette saisie"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 0 }}>🗑️</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid ' + C.border }}>
              {deleteConfirm?.userId === j.user_id ? (
                deleteConfirm.step === 1 ? (
                  <div style={{ background: C.red + '12', border: '1px solid ' + C.red + '40', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 4 }}>Supprimer {j.isManaged ? 'le joueur' : 'le compte de'} {j.prenom || '—'} {j.nom || ''} ?</div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>Toutes ses séances et performances seront supprimées.</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid ' + C.border, background: C.surface, color: C.muted, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
                      <button onClick={() => setDeleteConfirm({ userId: j.user_id, step: 2 })} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: C.red + '25', color: C.red, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>Continuer →</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: C.red + '20', border: '2px solid ' + C.red + '70', borderRadius: 12, padding: '14px' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.red, marginBottom: 6 }}>⚠️ Action irréversible</div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>
                      Le compte de <strong style={{ color: C.text }}>{j.prenom} {j.nom}</strong> et <strong style={{ color: C.text }}>toutes ses données</strong> seront définitivement supprimés.<br />
                      Cette action est <strong style={{ color: C.red }}>impossible à annuler</strong>.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid ' + C.border, background: C.surface, color: C.muted, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
                      <button onClick={() => j.isManaged ? deleteManagedPlayer(j.managed_player_id) : handleDeleteUser(j.user_id)} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: C.red, color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 800 }}>🗑️ Supprimer définitivement</button>
                    </div>
                  </div>
                )
              ) : (
                <button onClick={() => setDeleteConfirm({ userId: j.user_id, step: 1 })}
                  style={{ width: '100%', padding: '9px', borderRadius: 10, border: '1px solid ' + C.red + '35', background: 'transparent', color: C.red, fontSize: 12, cursor: 'pointer', fontWeight: 600, opacity: 0.75 }}>
                  {j.isManaged ? 'Supprimer ce joueur' : 'Supprimer ce compte'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
    {adminView === 'overview' && (
      <div>
        {adminLoading && <div style={{ background: C.card, borderRadius: 14, padding: 16, textAlign: 'center', color: C.muted, marginBottom: 16 }}>Chargement...</div>}
        {adminError && <div style={{ background: C.red + '15', border: '1px solid ' + C.red + '40', borderRadius: 12, padding: '12px 14px', marginBottom: 14, fontSize: 12, color: C.red }}>{adminError}</div>}

        {/* Stats globales */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { val: adminData.length + adminManagedPlayers.length, label: 'JOUEURS', color: C.accent },
            { val: teams.length, label: 'ÉQUIPES', color: C.green },
            { val: adminData.filter(j => !j.teams || j.teams.length === 0).length, label: 'SANS ÉQUIPE', color: C.gold },
          ].map(s => (
            <div key={s.label} style={{ background: C.card, borderRadius: 14, padding: '14px 10px', border: '1px solid ' + C.border, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Inscriptions non confirmées */}
        {unconfirmedSignups.length > 0 && (
          <div style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 20, border: '1px solid ' + C.gold + '40' }}>
            <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
              ⏳ Inscriptions non confirmées ({unconfirmedSignups.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {unconfirmedSignups.map(u => (
                <div key={u.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.surface, borderRadius: 10, padding: '8px 12px', gap: 10 }}>
                  <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{u.email}</span>
                  <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{new Date(u.created_at).toLocaleDateString('fr-FR')}</span>
                  <button onClick={() => handleResend(u.email)} disabled={resendingEmail === u.email}
                    style={{ flexShrink: 0, padding: '5px 10px', background: C.gold + '20', color: C.gold, border: '1px solid ' + C.gold + '40', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: resendingEmail === u.email ? 'default' : 'pointer', opacity: resendingEmail === u.email ? 0.6 : 1 }}>
                    {resendingEmail === u.email ? '...' : '✉️ Relancer'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Créer une équipe */}
        <div style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 20, border: '1px solid ' + C.border }}>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Nouvelle équipe</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" placeholder="Nom de l'équipe..." value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
              style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none' }} />
            <button onClick={handleCreateTeam} disabled={creatingTeam || !newTeamName.trim()}
              style={{ padding: '10px 18px', background: newTeamName.trim() ? C.accent : C.surface, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap', opacity: creatingTeam ? 0.6 : 1 }}>
              + Créer
            </button>
          </div>
        </div>

        {/* Gérer les clubs (liste proposée à l'inscription) */}
        <div style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 20, border: '1px solid ' + C.border }}>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Clubs proposés à l'inscription</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: clubs.length > 0 ? 12 : 0 }}>
            <input type="text" placeholder="Nom du club..." value={newClubName}
              onChange={e => setNewClubName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateClub()}
              style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none' }} />
            <button onClick={handleCreateClub} disabled={creatingClub || !newClubName.trim()}
              style={{ padding: '10px 18px', background: newClubName.trim() ? C.accent : C.surface, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap', opacity: creatingClub ? 0.6 : 1 }}>
              + Ajouter
            </button>
          </div>
          {clubs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {clubs.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 6px 6px 12px', borderRadius: 16, background: C.surface, border: '1px solid ' + C.border, fontSize: 13 }}>
                  {c.name}
                  <button onClick={() => deleteClub(c.id)}
                    style={{ width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'transparent', color: C.red, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grille des équipes */}
        {teams.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Mes équipes</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {teams.map(team => {
                const teamRealPlayers = adminData.filter(j => (j.teams || []).some(t => t.id === team.id))
                const teamManaged = adminManagedPlayers.filter(mp => mp.team_id === team.id)
                const teamPlayers = [...teamRealPlayers, ...teamManaged.map(mp => ({ user_id: GHOST_PREFIX + mp.id, photo_url: mp.photo_url }))]
                const lastActivity = teamRealPlayers.reduce((acc, j) => {
                  const d = j.derniere_seance || j.derniere_mesure
                  return d && (!acc || d > acc) ? d : acc
                }, null)
                return (
                  <div key={team.id}
                    onClick={() => { setSelectedAdminTeam(team); setAdminView('team_detail'); setExpandedAdmin(null); setAdminDetailTab('joueurs'); setEditingProg(false); setProgDraft(null); setEditingProgramId(null) }}
                    style={{ background: C.card, borderRadius: 16, border: '1px solid ' + team.color + '40', overflow: 'hidden', cursor: 'pointer' }}>
                    <div style={{ height: 4, background: 'linear-gradient(90deg, ' + team.color + ', ' + team.color + '50)' }} />
                    <div style={{ padding: '16px 16px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 56, height: 56, borderRadius: 14, background: team.color + '25', border: '2px solid ' + team.color + '50', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {team.photo_url
                            ? <img src={team.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 28 }}>🏟️</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 16 }}>{team.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                            <div style={{ fontSize: 13, color: team.color, fontWeight: 700 }}>{teamPlayers.length} joueur{teamPlayers.length > 1 ? 's' : ''}</div>
                            {lastActivity && <div style={{ fontSize: 11, color: C.muted }}>Actif {new Date(lastActivity).toLocaleDateString('fr-FR')}</div>}
                          </div>
                        </div>
                        <div style={{ fontSize: 18, color: C.muted }}>→</div>
                      </div>
                      {teamPlayers.length > 0 && (
                        <div style={{ display: 'flex', marginTop: 12 }}>
                          {teamPlayers.slice(0, 6).map((j, idx) => (
                            <div key={j.user_id} style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: '2px solid ' + C.card, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginLeft: idx > 0 ? -8 : 0 }}>
                              {j.photo_url ? <img src={j.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚽'}
                            </div>
                          ))}
                          {teamPlayers.length > 6 && (
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.surface, border: '2px solid ' + C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: C.muted, marginLeft: -8, fontWeight: 700 }}>
                              +{teamPlayers.length - 6}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Joueurs sans équipe */}
        {(() => {
          const unassigned = adminData.filter(j => !j.teams || j.teams.length === 0)
          if (unassigned.length === 0) return null
          return (
            <div>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Sans équipe ({unassigned.length})</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                {unassigned.map(j => renderPlayerCard(j, 'unassigned_' + j.user_id))}
              </div>
            </div>
          )
        })()}

        {teams.length === 0 && adminData.length === 0 && !adminLoading && (
          <div style={{ background: C.card, borderRadius: 16, padding: 40, textAlign: 'center', color: C.muted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚽</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Aucun joueur inscrit</div>
            <div style={{ fontSize: 13 }}>Créez une équipe et invitez vos joueurs</div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={loadAdminData} disabled={adminLoading}
            style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '6px 14px', fontSize: 13, color: C.muted, cursor: 'pointer', fontWeight: 600 }}>
            {adminLoading ? '...' : '↻ Actualiser'}
          </button>
        </div>
      </div>
    )}

    {/* ── ADMIN : VUE ÉQUIPE ── */}
    {adminView === 'team_detail' && selectedAdminTeam && (
      <div>
        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button onClick={() => { setAdminView('overview'); setSelectedAdminTeam(null); setExpandedAdmin(null); setEditingProg(false); setProgDraft(null); setEditingProgramId(null) }}
            style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '8px 14px', color: C.muted, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            ← Retour
          </button>
          <div style={{ fontSize: 12, color: C.muted }}>Équipes</div>
          <div style={{ fontSize: 12, color: C.muted }}>›</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: selectedAdminTeam.color }}>{selectedAdminTeam.name}</div>
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={loadAdminData} disabled={adminLoading}
              style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '6px 12px', fontSize: 13, color: C.muted, cursor: 'pointer' }}>
              {adminLoading ? '...' : '↻'}
            </button>
          </div>
        </div>

        {/* Carte équipe */}
        <div style={{ background: C.card, borderRadius: 20, border: '2px solid ' + selectedAdminTeam.color + '40', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ height: 6, background: 'linear-gradient(90deg, ' + selectedAdminTeam.color + ', ' + selectedAdminTeam.color + '40)' }} />
          <div style={{ padding: '20px 20px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <label style={{ position: 'relative', cursor: uploadingTeamPhoto === selectedAdminTeam.id ? 'wait' : 'pointer', flexShrink: 0 }}>
                <div style={{ width: 72, height: 72, borderRadius: 18, background: selectedAdminTeam.color + '25', border: '3px solid ' + selectedAdminTeam.color + '50', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: uploadingTeamPhoto === selectedAdminTeam.id ? 0.6 : 1 }}>
                  {uploadingTeamPhoto === selectedAdminTeam.id
                    ? <span style={{ fontSize: 28 }}>⏳</span>
                    : selectedAdminTeam.photo_url
                      ? <img src={selectedAdminTeam.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 36 }}>🏟️</span>}
                </div>
                <div style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>📷</div>
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingTeamPhoto !== null}
                  onChange={e => e.target.files[0] && uploadTeamPhoto(selectedAdminTeam.id, e.target.files[0])} />
              </label>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{selectedAdminTeam.name}</div>
                <div style={{ fontSize: 14, color: selectedAdminTeam.color, fontWeight: 700, marginTop: 4 }}>
                  {adminData.filter(j => (j.teams || []).some(t => t.id === selectedAdminTeam.id)).length} joueur{adminData.filter(j => (j.teams || []).some(t => t.id === selectedAdminTeam.id)).length !== 1 ? 's' : ''}
                </div>
              </div>
              <button onClick={() => shareInviteLink(selectedAdminTeam.id, selectedAdminTeam.name)} title="Partager le lien d'invitation"
                style={{ width: 38, height: 38, borderRadius: 10, background: C.accent + '15', border: '1px solid ' + C.accent + '30', color: C.accent, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                🔗
              </button>
              <button onClick={() => deleteTeam(selectedAdminTeam.id)}
                style={{ width: 38, height: 38, borderRadius: 10, background: C.red + '15', border: '1px solid ' + C.red + '30', color: C.red, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                🗑️
              </button>
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', background: C.surface, borderRadius: 12, padding: 4, marginBottom: 20, gap: 2 }}>
          {[{ id: 'joueurs', icon: '👥', label: 'Joueurs' }, { id: 'programme', icon: '📋', label: 'Programme' }].map(t => (
            <button key={t.id} onClick={() => { setAdminDetailTab(t.id); setEditingProg(false); setProgDraft(null); setEditingProgramId(null) }}
              style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: adminDetailTab === t.id ? C.accent : 'transparent', color: adminDetailTab === t.id ? '#fff' : C.muted, transition: 'all 0.2s' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {adminDetailTab === 'joueurs' && (
          <>
            {/* Ajouter des joueurs */}
            {(() => {
              const notInTeam = adminData.filter(j => !(j.teams || []).some(t => t.id === selectedAdminTeam.id))
              if (notInTeam.length === 0) return null
              return (
                <div style={{ background: C.card, borderRadius: 16, padding: '14px 16px', marginBottom: 20, border: '1px solid ' + C.border }}>
                  <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Ajouter des joueurs</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {notInTeam.map(j => (
                      <button key={j.user_id} onClick={() => togglePlayerTeam(j.user_id, selectedAdminTeam.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, border: '1px solid ' + C.border, background: C.surface, color: C.text, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>
                          {j.photo_url ? <img src={j.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚽'}
                        </div>
                        + {j.prenom || '?'} {j.nom || ''}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Joueurs sans compte */}
            <div style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 20, border: '1px solid ' + C.border }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: addingManagedPlayer ? 12 : 0 }}>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Joueurs sans compte</div>
                {!addingManagedPlayer && (
                  <button onClick={() => setAddingManagedPlayer(true)}
                    style={{ background: 'none', border: 'none', color: C.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                    + Ajouter un joueur
                  </button>
                )}
              </div>
              {addingManagedPlayer && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input placeholder="Prénom" value={managedPlayerDraft.prenom} onChange={e => setManagedPlayerDraft(d => ({ ...d, prenom: e.target.value }))}
                    style={{ flex: 1, minWidth: 100, background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 13, outline: 'none' }} />
                  <input placeholder="Nom" value={managedPlayerDraft.nom} onChange={e => setManagedPlayerDraft(d => ({ ...d, nom: e.target.value }))}
                    style={{ flex: 1, minWidth: 100, background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 13, outline: 'none' }} />
                  <input placeholder="Poste (optionnel)" value={managedPlayerDraft.poste1} onChange={e => setManagedPlayerDraft(d => ({ ...d, poste1: e.target.value }))}
                    style={{ flex: 1, minWidth: 100, background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 13, outline: 'none' }} />
                  <button onClick={() => { setAddingManagedPlayer(false); setManagedPlayerDraft({ prenom: '', nom: '', poste1: '' }) }}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
                  <button onClick={() => addManagedPlayer(selectedAdminTeam.id)}
                    style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: C.accent, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>✓ Ajouter</button>
                </div>
              )}
            </div>

            {/* Joueurs de l'équipe */}
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Joueurs de l'équipe</div>
            {adminError && <div style={{ background: C.red + '15', border: '1px solid ' + C.red + '40', borderRadius: 12, padding: '12px 14px', marginBottom: 14, fontSize: 12, color: C.red }}>{adminError}</div>}
            {(() => {
              const teamPlayers = [
                ...adminData.filter(j => (j.teams || []).some(t => t.id === selectedAdminTeam.id)),
                ...adminManagedPlayers.filter(mp => mp.team_id === selectedAdminTeam.id),
              ]
              if (teamPlayers.length === 0) return (
                <div style={{ background: C.card, borderRadius: 16, padding: 40, textAlign: 'center', color: C.muted }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Aucun joueur dans cette équipe</div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>Ajoutez des joueurs depuis la section ci-dessus</div>
                </div>
              )
              return (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                  {teamPlayers.map(j => renderPlayerCard(j, 'team_' + j.user_id, selectedAdminTeam.id))}
                </div>
              )
            })()}
          </>
        )}

        {adminDetailTab === 'programme' && renderProgrammeCatalog(selectedAdminTeam.id)}
      </div>
    )}
    </>
  )
}
