import { useState } from 'react'
import { C, SESSIONS, DAY_ORDER } from '../lib/constants'
import { toDateStr, getMonday } from '../lib/stats'
import { renderSessionBlocs } from './SessionBlocs'
import Icon from './Icons'

// Onglet Programme : semaine d'entraînement du joueur (programmes d'équipe et programme perso), validation des séances.

export default function SeancesScreen({ myTeams, getProgramForDate, getProgramsForTeam, isSeanceDone, toggleSeance }) {
  const [expandedDay, setExpandedDay] = useState(null)
  const [seancesWeekOffset, setSeancesWeekOffset] = useState(0)

  const myTeamsWithProgram = myTeams.filter(t => getProgramsForTeam(t.id).length > 0)

  if (myTeamsWithProgram.length === 0) {
    return (
      <div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, fontWeight: 500 }}>Programme de la semaine</div>
        {SESSIONS.map(s => {
          const done = isSeanceDone(s.day); const expanded = expandedDay === s.day
          return (
            <div key={s.day} style={{ marginBottom: 10, borderRadius: 14, overflow: 'hidden', border: '1px solid ' + (done ? C.green + '50' : expanded ? C.accent + '60' : C.border) }}>
              <div onClick={() => setExpandedDay(expanded ? null : s.day)} role="button" tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedDay(expanded ? null : s.day) } }}
                style={{ background: done ? C.green + '14' : C.card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <div className="mono" style={{ width: 42, height: 42, borderRadius: 10, background: C.bg, border: '1px solid ' + (done ? C.green + '50' : C.border), color: done ? C.green : C.muted, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{done ? <Icon name="check" size={18} /> : s.day}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{s.duration} · {s.blocs.length} blocs</div>
                </div>
                <Icon name="chevron" size={18} style={{ color: C.muted, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
              </div>
              {renderSessionBlocs(s, expanded, done, () => toggleSeance(s.day))}
            </div>
          )
        })}
      </div>
    )
  }

  const allProgs = myTeamsWithProgram.flatMap(t => getProgramsForTeam(t.id))
  const minDate = allProgs.reduce((acc, p) => p.start_date < acc ? p.start_date : acc, allProgs[0].start_date)
  const maxDate = allProgs.reduce((acc, p) => p.end_date > acc ? p.end_date : acc, allProgs[0].end_date)

  const weekMonday = getMonday(new Date())
  weekMonday.setDate(weekMonday.getDate() + seancesWeekOffset * 7)
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
        <button onClick={() => canGoPrev && setSeancesWeekOffset(o => o - 1)} disabled={!canGoPrev}
          style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid ' + C.border, background: C.card, color: canGoPrev ? C.text : C.border, fontSize: 16, cursor: canGoPrev ? 'pointer' : 'default' }}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
            {weekDates[0].date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {weekDates[6].date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </div>
          {seancesWeekOffset !== 0 && (
            <button onClick={() => setSeancesWeekOffset(0)} style={{ background: 'none', border: 'none', color: C.accent, fontSize: 11, cursor: 'pointer', padding: 0, marginTop: 2 }}>Revenir à aujourd'hui</button>
          )}
        </div>
        <button onClick={() => canGoNext && setSeancesWeekOffset(o => o + 1)} disabled={!canGoNext}
          style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid ' + C.border, background: C.card, color: canGoNext ? C.text : C.border, fontSize: 16, cursor: canGoNext ? 'pointer' : 'default' }}>›</button>
      </div>

      {weekDates.map(({ day, date, dateStr }) => {
        const dateLabel = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
        const entries = myTeamsWithProgram
          .map(team => {
            const program = getProgramForDate(team.id, dateStr)
            const s = program?.sessions.find(x => x.day === day)
            return s ? { team, program, s } : null
          })
          .filter(Boolean)

        if (entries.length === 0) {
          return (
            <div key={dateStr} style={{ marginBottom: 10, borderRadius: 14, border: '1px dashed ' + C.border, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.6 }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13, textTransform: 'capitalize' }}>{dateLabel}</div>
                <div style={{ fontSize: 12, color: C.muted }}>Hors programme</div>
              </div>
            </div>
          )
        }

        return (
          <div key={dateStr} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 500, marginBottom: 6, textTransform: 'capitalize' }}>{dateLabel}</div>
            {entries.map(({ team, program, s }) => {
              const cardKey = dateStr + '_' + team.id
              const done = isSeanceDone(day, dateStr, team.id); const expanded = expandedDay === cardKey
              return (
                <div key={cardKey} style={{ marginBottom: 10, borderRadius: 14, overflow: 'hidden', border: '1px solid ' + (done ? C.green + '50' : expanded ? C.accent + '60' : C.border) }}>
                  <div onClick={() => setExpandedDay(expanded ? null : cardKey)} role="button" tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedDay(expanded ? null : cardKey) } }}
                    style={{ background: done ? C.green + '14' : C.card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <div className="mono" style={{ width: 42, height: 42, borderRadius: 10, background: C.bg, border: '1px solid ' + (done ? C.green + '50' : C.border), color: done ? C.green : C.muted, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{done ? <Icon name="check" size={18} /> : s.day}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{s.label}</div>
                      <div style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                        <span>{s.duration}</span>
                        <span aria-hidden="true">·</span>
                        <span style={{ color: C.text, fontWeight: 500 }}>{team.name}</span>
                        <span aria-hidden="true">·</span>
                        <span>{program.name}</span>
                      </div>
                    </div>
                    <Icon name="chevron" size={18} style={{ color: C.muted, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
                  </div>
                  {renderSessionBlocs(s, expanded, done, () => toggleSeance(day, dateStr, team.id))}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
