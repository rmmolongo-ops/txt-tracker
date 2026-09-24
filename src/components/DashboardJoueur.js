import { Fragment, useState } from 'react'
import { C, KPI_CONFIG, SESSIONS, DASHBOARD_KPIS_MAX, DAY_MAP } from '../lib/constants'
import { toDateStr } from '../lib/stats'
import { renderSessionBlocs } from './SessionBlocs'

// Accueil, vue joueur : séance du jour, KPIs clés, régularité, saisie rapide.
export default function DashboardJoueur({
  availableTeams, changeTab, getDashboardKpiIds, getLatest, getProgramForDate, getProgramsForTeam,
  getProgress, getWeekCompliance, inputValues, isMobile, isSeanceDone, myTeamIds,
  saveDashboardKpis, saveMesure, setInputValues, setSelectedKpi, toggleSeance,
}) {
  const [expandedDayDashboard, setExpandedDayDashboard] = useState(null)
  const [editingDashboardKpis, setEditingDashboardKpis] = useState(false)
  const [dashboardKpisDraft, setDashboardKpisDraft] = useState([])
  const todayDow = new Date().getDay()

  const handleSaveDashboardKpis = async (ids) => {
    if (await saveDashboardKpis(ids)) setEditingDashboardKpis(false)
  }

  return (
  <>
  <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2a4a)', borderRadius: 16, padding: 16, marginBottom: 16, border: '1px solid ' + C.accent + '30' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <div>
        <div style={{ fontSize: 12, color: C.muted }}>ASSIDUITÉ 7 JOURS</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: C.accentGlow }}>{getWeekCompliance()}%</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 12, color: C.muted }}>Séances aujourd'hui</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.green }}>{SESSIONS.filter(s => isSeanceDone(s.day)).length}</div>
      </div>
    </div>
    <div style={{ background: C.surface, borderRadius: 8, height: 8, overflow: 'hidden' }}>
      <div style={{ width: getWeekCompliance() + '%', height: '100%', background: 'linear-gradient(90deg, ' + C.accent + ', ' + C.green + ')', borderRadius: 8, transition: 'width 0.5s' }} />
    </div>
  </div>

  <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Mes équipes</div>
  {(() => {
    const myTeams = availableTeams.filter(t => myTeamIds.has(t.id))
    if (myTeams.length === 0) return (
      <div style={{ background: C.card, borderRadius: 14, padding: 16, textAlign: 'center', color: C.muted, fontSize: 13, marginBottom: 16, border: '1px solid ' + C.border }}>
        Tu n'as pas encore rejoint d'équipe. Rends-toi dans l'onglet Profil pour en rejoindre une.
      </div>
    )
    return (
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {myTeams.map(team => (
          <div key={team.id} style={{ background: C.card, borderRadius: 14, border: '1px solid ' + team.color + '40', overflow: 'hidden' }}>
            <div style={{ height: 3, background: team.color }} />
            <div style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: team.color + '20', border: '1px solid ' + team.color + '50', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {team.photo_url ? <img src={team.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 18 }}>🏟️</span>}
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: team.color, background: team.color + '20', padding: '2px 8px', borderRadius: 8, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>ÉQUIPE</span>
              </div>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.name}</div>
              <div style={{ fontSize: 11, color: C.muted }}>⚽ Football</div>
            </div>
          </div>
        ))}
      </div>
    )
  })()}

  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
    <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Performances clés</div>
    {!editingDashboardKpis && (
      <button onClick={() => { setDashboardKpisDraft(getDashboardKpiIds()); setEditingDashboardKpis(true) }}
        style={{ background: 'none', border: 'none', color: C.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
        ✏️ Personnaliser
      </button>
    )}
  </div>

  {editingDashboardKpis && (
    <div style={{ background: C.card, borderRadius: 14, padding: 14, marginBottom: 16, border: '1px solid ' + C.accent + '40' }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
        Choisis jusqu'à {DASHBOARD_KPIS_MAX} performances à afficher sur ton accueil ({dashboardKpisDraft.length}/{DASHBOARD_KPIS_MAX})
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {KPI_CONFIG.map(kpi => {
          const selected = dashboardKpisDraft.includes(kpi.id)
          const disabled = !selected && dashboardKpisDraft.length >= DASHBOARD_KPIS_MAX
          return (
            <button key={kpi.id} disabled={disabled}
              onClick={() => setDashboardKpisDraft(prev => selected ? prev.filter(id => id !== kpi.id) : [...prev, kpi.id])}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 16, border: '2px solid ' + (selected ? kpi.color : C.border), background: selected ? kpi.color + '20' : 'transparent', color: selected ? kpi.color : (disabled ? C.muted + '80' : C.muted), cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>
              {kpi.icon} {kpi.label}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setEditingDashboardKpis(false)}
          style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid ' + C.border, background: C.surface, color: C.muted, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
          Annuler
        </button>
        <button onClick={() => handleSaveDashboardKpis(dashboardKpisDraft.length > 0 ? dashboardKpisDraft : null)} disabled={dashboardKpisDraft.length === 0}
          style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: dashboardKpisDraft.length > 0 ? C.accent : C.surface, color: dashboardKpisDraft.length > 0 ? '#fff' : C.muted, fontSize: 13, cursor: dashboardKpisDraft.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 700 }}>
          ✓ Enregistrer
        </button>
      </div>
    </div>
  )}

  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
    {KPI_CONFIG.filter(k => getDashboardKpiIds().includes(k.id)).map(kpi => {
      const val = getLatest(kpi.id); const prog = getProgress(kpi.id)
      return (
        <div key={kpi.id} style={{ background: C.card, borderRadius: 14, padding: 14, border: '1px solid ' + C.border, minWidth: 0, overflow: 'hidden' }}>
          <div onClick={() => { setSelectedKpi(kpi.id); changeTab('stats') }} style={{ cursor: 'pointer' }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{kpi.icon}</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {val !== null ? val : '—'}<span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}> {kpi.unit}</span>
            </div>
            {prog !== null && <div style={{ fontSize: 11, color: parseFloat(prog) >= 0 ? C.green : C.red, marginTop: 4, fontWeight: 600 }}>{parseFloat(prog) >= 0 ? '▲' : '▼'} {Math.abs(prog)}%</div>}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, minWidth: 0 }}>
            <input type="number" placeholder={'Valeur en ' + kpi.unit} value={inputValues[kpi.id] || ''}
              onChange={e => setInputValues(v => ({ ...v, [kpi.id]: e.target.value }))}
              style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '7px 8px', color: C.text, fontSize: 14, outline: 'none', minWidth: 0, width: 0 }} />
            <button onClick={() => inputValues[kpi.id] && saveMesure(kpi.id, inputValues[kpi.id])}
              style={{ padding: '7px 10px', background: inputValues[kpi.id] ? kpi.color : C.surface, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>✓</button>
          </div>
        </div>
      )
    })}
  </div>

  <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Mental du jour</div>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
    {KPI_CONFIG.filter(k => ['motivation', 'sommeil'].includes(k.id)).map(kpi => {
      const val = getLatest(kpi.id)
      return (
        <div key={kpi.id} style={{ background: C.card, borderRadius: 14, padding: 14, border: '1px solid ' + C.border, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>{kpi.icon}</span>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, lineHeight: 1.2 }}>{kpi.label}</div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: kpi.color, marginBottom: 8 }}>
            {val !== null ? val : '—'}<span style={{ fontSize: 10, color: C.muted, fontWeight: 400 }}> {kpi.unit}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="number" min="0" max="10" placeholder="/10" value={inputValues[kpi.id] || ''}
              onChange={e => setInputValues(v => ({ ...v, [kpi.id]: e.target.value }))}
              style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '7px 8px', color: C.text, fontSize: 14, outline: 'none', minWidth: 0, width: 0 }} />
            <button onClick={() => inputValues[kpi.id] && saveMesure(kpi.id, inputValues[kpi.id])}
              style={{ padding: '7px 10px', background: inputValues[kpi.id] ? kpi.color : C.surface, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>✓</button>
          </div>
        </div>
      )
    })}
  </div>

  <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Programme du jour</div>
  {(() => {
    const myTeamsWithProgram = availableTeams.filter(t => myTeamIds.has(t.id) && getProgramsForTeam(t.id).length > 0)
    const todayDayCode = Object.keys(DAY_MAP).find(k => DAY_MAP[k] === todayDow)
    let todaySessions = SESSIONS.filter(s => s.day === todayDayCode)
    let todayTeam = null
    let toggleTeamId = null
    if (myTeamsWithProgram.length === 1) {
      const program = getProgramForDate(myTeamsWithProgram[0].id, toDateStr(new Date()))
      const s = program?.sessions.find(x => x.day === todayDayCode)
      if (s) { todaySessions = [s]; todayTeam = myTeamsWithProgram[0]; toggleTeamId = myTeamsWithProgram[0].id }
      else todaySessions = []
    }
    if (todaySessions.length === 0) {
      return <div style={{ background: C.card, borderRadius: 14, padding: 16, textAlign: 'center', color: C.muted, fontSize: 14 }}>Va dans "Programme" pour valider ton entraînement</div>
    }
    return todaySessions.map(s => {
      const done = isSeanceDone(s.day, undefined, toggleTeamId); const expanded = expandedDayDashboard === s.day
      return (
        <div key={s.day} style={{ marginBottom: 10, borderRadius: 14, overflow: 'hidden', border: '1px solid ' + (done ? C.green + '60' : expanded ? s.color + '50' : C.border) }}>
          <div onClick={() => setExpandedDayDashboard(expanded ? null : s.day)}
            style={{ background: done ? 'linear-gradient(135deg, #064e3b, #065f46)' : expanded ? s.color + '15' : C.card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <div style={{ fontSize: 24 }}>{s.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{s.duration} • {todayTeam ? todayTeam.name : s.blocs.length + ' blocs'}</div>
            </div>
            <div style={{ fontSize: 18, color: C.muted, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>⌄</div>
          </div>
          {renderSessionBlocs(s, expanded, done, () => toggleSeance(s.day, undefined, toggleTeamId))}
        </div>
      )
    })
  })()}
  </>
  )
}
