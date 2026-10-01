import { Fragment, useState } from 'react'
import { C, KPI_CONFIG, SESSIONS, DASHBOARD_KPIS_MAX, DAY_MAP } from '../lib/constants'
import { toDateStr } from '../lib/stats'
import { renderSessionBlocs } from './SessionBlocs'
import Icon from './Icons'

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
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '4px 4px 20px' }}>
    <div>
      <div style={{ fontSize: 13, color: C.muted }}>Assiduité sur 7 jours</div>
      <div className="mono" style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
        <span style={{ color: C.green, fontWeight: 600 }}>{SESSIONS.filter(s => isSeanceDone(s.day)).length}</span> séance(s) validée(s) aujourd'hui
      </div>
    </div>
    <div role="img" aria-label={'Assiduité sur 7 jours : ' + getWeekCompliance() + ' %'} style={{ position: 'relative', width: 78, height: 78, flexShrink: 0 }}>
      <svg width="78" height="78" viewBox="0 0 78 78" style={{ display: 'block' }}>
        <circle cx="39" cy="39" r="33" fill="none" stroke={C.surface} strokeWidth="6" />
        <circle cx="39" cy="39" r="33" fill="none" stroke={C.accentGlow} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 33} strokeDashoffset={2 * Math.PI * 33 * (1 - Math.min(100, Math.max(0, getWeekCompliance())) / 100)}
          transform="rotate(-90 39 39)" style={{ transition: 'stroke-dashoffset 0.5s' }} />
      </svg>
      <span className="mono" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 600 }}>{getWeekCompliance()}%</span>
    </div>
  </div>

  <div style={{ fontSize: 13, color: C.muted, marginBottom: 10, fontWeight: 500 }}>Programme du jour</div>
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
      return <div style={{ border: '1px dashed ' + C.border, borderRadius: 14, padding: '20px 16px', textAlign: 'center', color: C.muted, fontSize: 14, marginBottom: 16 }}>Va dans « Programme » pour valider ton entraînement</div>
    }
    return todaySessions.map(s => {
      const done = isSeanceDone(s.day, undefined, toggleTeamId); const expanded = expandedDayDashboard === s.day
      return (
        <div key={s.day} style={{ marginBottom: 10, borderRadius: 14, overflow: 'hidden', border: '1px solid ' + (done ? C.green + '50' : expanded ? C.accent + '60' : C.border) }}>
          <div onClick={() => setExpandedDayDashboard(expanded ? null : s.day)} role="button" tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedDayDashboard(expanded ? null : s.day) } }}
            style={{ background: done ? C.green + '14' : C.card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <div className="mono" style={{ width: 42, height: 42, borderRadius: 10, background: C.bg, border: '1px solid ' + (done ? C.green + '50' : C.border), color: done ? C.green : C.muted, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{done ? <Icon name="check" size={18} /> : s.day}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{s.duration} · {todayTeam ? todayTeam.name : s.blocs.length + ' blocs'}</div>
            </div>
            <Icon name="chevron" size={18} style={{ color: C.muted, flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </div>
          {renderSessionBlocs(s, expanded, done, () => toggleSeance(s.day, undefined, toggleTeamId))}
        </div>
      )
    })
  })()}

  <div style={{ height: 8 }} />
  <div style={{ fontSize: 13, color: C.muted, marginBottom: 10, fontWeight: 500 }}>Mes équipes</div>
  {(() => {
    const myTeams = availableTeams.filter(t => myTeamIds.has(t.id))
    if (myTeams.length === 0) return (
      <div style={{ background: C.card, borderRadius: 14, padding: 16, textAlign: 'center', color: C.muted, fontSize: 13, marginBottom: 16, border: '1px solid ' + C.border }}>
        Tu n'as pas encore rejoint d'équipe. Rends-toi dans l'onglet Profil pour en rejoindre une.
      </div>
    )
    return (
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: 4, marginBottom: 20 }}>
        {myTeams.map(team => (
          <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', minWidth: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: 9, background: C.card, border: '1px solid ' + C.border, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 600, color: C.accentGlow }}>
              {team.photo_url ? <img src={team.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (team.name || '?').slice(0, 3).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.name}</div>
              <div style={{ fontSize: 12, color: C.muted }}>Football</div>
            </div>
          </div>
        ))}
      </div>
    )
  })()}

  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
    <div style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>Performances clés</div>
    {!editingDashboardKpis && (
      <button onClick={() => { setDashboardKpisDraft(getDashboardKpiIds()); setEditingDashboardKpis(true) }}
        style={{ background: 'none', border: 'none', color: C.accent, fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: 0 }}>
        Personnaliser
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
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid ' + (selected ? C.accent : C.border), background: selected ? C.accent + '22' : 'transparent', color: selected ? C.accentGlow : (disabled ? C.muted + '80' : C.muted), cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500 }}>
              {kpi.label}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setEditingDashboardKpis(false)}
          style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
          Annuler
        </button>
        <button onClick={() => handleSaveDashboardKpis(dashboardKpisDraft.length > 0 ? dashboardKpisDraft : null)} disabled={dashboardKpisDraft.length === 0}
          style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: dashboardKpisDraft.length > 0 ? C.accent : C.surface, color: dashboardKpisDraft.length > 0 ? '#fff' : C.muted, fontSize: 13, cursor: dashboardKpisDraft.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
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
          <div onClick={() => { setSelectedKpi(kpi.id); changeTab('stats') }} role="button" tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedKpi(kpi.id); changeTab('stats') } }}
            style={{ cursor: 'pointer' }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kpi.label}</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {val !== null ? val : '—'}<span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}> {kpi.unit}</span>
            </div>
            {prog !== null && <div style={{ fontSize: 11, color: parseFloat(prog) >= 0 ? C.green : C.red, marginTop: 4, fontWeight: 600 }}>{parseFloat(prog) >= 0 ? '▲' : '▼'} {Math.abs(prog)}%</div>}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, minWidth: 0 }}>
            <input type="number" placeholder={'Valeur en ' + kpi.unit} value={inputValues[kpi.id] || ''}
              onChange={e => setInputValues(v => ({ ...v, [kpi.id]: e.target.value }))}
              style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '7px 8px', color: C.text, fontSize: 14, outline: 'none', minWidth: 0, width: 0 }} />
            <button onClick={() => inputValues[kpi.id] && saveMesure(kpi.id, inputValues[kpi.id])}
              style={{ padding: '7px 10px', background: inputValues[kpi.id] ? C.accent : C.surface, color: inputValues[kpi.id] ? '#fff' : C.muted, border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>✓</button>
          </div>
        </div>
      )
    })}
  </div>

  <div style={{ fontSize: 13, color: C.muted, marginBottom: 10, fontWeight: 500 }}>Mental du jour</div>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
    {KPI_CONFIG.filter(k => ['motivation', 'sommeil'].includes(k.id)).map(kpi => {
      const val = getLatest(kpi.id)
      return (
        <div key={kpi.id} style={{ background: C.card, borderRadius: 14, padding: 14, border: '1px solid ' + C.border, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{kpi.label}</div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: C.text, marginBottom: 8 }}>
            {val !== null ? val : '—'}<span style={{ fontSize: 10, color: C.muted, fontWeight: 400 }}> {kpi.unit}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="number" min="0" max="10" placeholder="/10" value={inputValues[kpi.id] || ''}
              onChange={e => setInputValues(v => ({ ...v, [kpi.id]: e.target.value }))}
              style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '7px 8px', color: C.text, fontSize: 14, outline: 'none', minWidth: 0, width: 0 }} />
            <button onClick={() => inputValues[kpi.id] && saveMesure(kpi.id, inputValues[kpi.id])}
              style={{ padding: '7px 10px', background: inputValues[kpi.id] ? C.accent : C.surface, color: inputValues[kpi.id] ? '#fff' : C.muted, border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>✓</button>
          </div>
        </div>
      )
    })}
  </div>

  </>
  )
}
