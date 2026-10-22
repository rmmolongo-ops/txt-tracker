import { useState } from 'react'
import { C, DAY_ORDER } from '../lib/constants'
import { toDateStr, getMonday } from '../lib/stats'
import { plannedForDate } from '../lib/planning'
import PlanCard from './PlanCard'

// Onglet Programme : semaine du joueur (programmes d'équipe et calendrier du coach), validation des séances.

export default function SeancesScreen({ myTeams, getProgramForDate, getProgramsForTeam, events = [], isSeanceDone, toggleSeance }) {
  const [expandedDay, setExpandedDay] = useState(null)
  const [seancesWeekOffset, setSeancesWeekOffset] = useState(0)

  const myTeamIdSet = new Set(myTeams.map(t => t.id))
  const allProgs = myTeams.flatMap(t => getProgramsForTeam(t.id))
  const myEvents = events.filter(e => myTeamIdSet.has(e.team_id))

  if (allProgs.length === 0 && myEvents.length === 0) {
    return (
      <div style={{ border: '1px dashed ' + C.border, borderRadius: 14, padding: '28px 20px', textAlign: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Rien de prévu pour le moment</div>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
          {myTeams.length === 0
            ? "Rejoins une équipe (onglet Profil) pour retrouver ici les entraînements et matchs de ton coach."
            : "Les entraînements et matchs planifiés par ton coach apparaîtront ici, avec le détail des séances à valider."}
        </div>
      </div>
    )
  }

  const todayStr = toDateStr(new Date())
  const dates = [todayStr, ...allProgs.flatMap(p => [p.start_date, p.end_date]), ...myEvents.map(e => e.date)]
  const minDate = dates.reduce((a, b) => b < a ? b : a)
  const maxDate = dates.reduce((a, b) => b > a ? b : a)

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
        <button onClick={() => canGoPrev && setSeancesWeekOffset(o => o - 1)} disabled={!canGoPrev} aria-label="Semaine précédente"
          style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid ' + C.border, background: C.card, color: canGoPrev ? C.text : C.border, fontSize: 16, cursor: canGoPrev ? 'pointer' : 'default' }}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
            {weekDates[0].date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {weekDates[6].date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </div>
          {seancesWeekOffset !== 0 && (
            <button onClick={() => setSeancesWeekOffset(0)} style={{ background: 'none', border: 'none', color: C.accent, fontSize: 11, cursor: 'pointer', padding: 0, marginTop: 2 }}>Revenir à aujourd'hui</button>
          )}
        </div>
        <button onClick={() => canGoNext && setSeancesWeekOffset(o => o + 1)} disabled={!canGoNext} aria-label="Semaine suivante"
          style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid ' + C.border, background: C.card, color: canGoNext ? C.text : C.border, fontSize: 16, cursor: canGoNext ? 'pointer' : 'default' }}>›</button>
      </div>

      {weekDates.map(({ date, dateStr }) => {
        const dateLabel = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
        const entries = plannedForDate({ teams: myTeams, dateStr, getProgramForDate, events: myEvents })

        if (entries.length === 0) {
          return (
            <div key={dateStr} style={{ marginBottom: 10, borderRadius: 14, border: '1px dashed ' + C.border, padding: '12px 16px', opacity: 0.6 }}>
              <div style={{ fontWeight: 500, fontSize: 13, textTransform: 'capitalize' }}>{dateLabel}</div>
              <div style={{ fontSize: 12, color: C.muted }}>Rien de prévu</div>
            </div>
          )
        }

        return (
          <div key={dateStr} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 500, marginBottom: 6, textTransform: 'capitalize' }}>{dateLabel}</div>
            {entries.map(entry => {
              const expanded = expandedDay === entry.key
              return (
                <PlanCard key={entry.key} entry={entry} expanded={expanded}
                  onExpand={() => setExpandedDay(expanded ? null : entry.key)}
                  done={isSeanceDone(entry.day, dateStr, entry.team.id)}
                  onToggle={() => toggleSeance(entry.day, dateStr, entry.team.id)} />
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
