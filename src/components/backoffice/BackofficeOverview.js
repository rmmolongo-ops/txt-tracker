import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { C, ROLE_CONFIG } from '../../lib/constants'
import { StatTile, Section, formatDate, searchInputStyle, Loading, ErrorBox } from './ui'

// Vue d'ensemble : chiffres clés, puis tous les clubs avec leurs équipes, effectifs, staff et activité.
export default function BackofficeOverview() {
  const [clubs, setClubs] = useState(null)
  const [totaux, setTotaux] = useState(null)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    Promise.all([supabase.rpc('backoffice_clubs'), supabase.rpc('backoffice_stats', { p_weeks: 4 })])
      .then(([c, s]) => {
        if (c.error || s.error) { setError((c.error || s.error).message); return }
        setClubs(c.data || [])
        setTotaux(s.data?.totaux || null)
      })
  }, [])

  if (error) return <ErrorBox message={error} />
  if (!clubs) return <Loading />

  const q = query.trim().toLowerCase()
  const visible = clubs
    .map(c => ({ ...c, teams: q && !c.name.toLowerCase().includes(q) ? c.teams.filter(t => t.name.toLowerCase().includes(q)) : c.teams }))
    .filter(c => !q || c.name.toLowerCase().includes(q) || c.teams.length > 0)

  return (
    <div>
      {totaux && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 24 }}>
          <StatTile label="Comptes" value={totaux.comptes} hint={totaux.non_confirmes + ' email(s) non confirmé(s)'} />
          <StatTile label="Actifs (30 j)" value={totaux.actifs_30j} hint="mesure, séance ou message" />
          <StatTile label="Clubs" value={totaux.clubs} />
          <StatTile label="Équipes" value={totaux.equipes} />
          <StatTile label="Joueurs sans compte" value={totaux.sans_compte} />
          <StatTile label="Erreurs (7 j)" value={totaux.erreurs_7j} />
        </div>
      )}

      <Section title={`Clubs et équipes (${clubs.length} clubs)`}
        actions={<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un club ou une équipe…" aria-label="Rechercher un club ou une équipe" style={{ ...searchInputStyle, flex: '0 1 320px' }} />}>
        {visible.length === 0 && <div style={{ color: C.muted, fontSize: 14 }}>Aucun résultat.</div>}
        <div style={{ display: 'grid', gap: 14 }}>
          {visible.map(club => (
            <div key={club.id || 'sans-club'} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{club.name}</div>
                <div style={{ fontSize: 13, color: C.muted }}>
                  {club.teams.length} équipe{club.teams.length !== 1 ? 's' : ''} · Administrateur{club.admins.length > 1 ? 's' : ''} : {club.admins.length ? club.admins.join(', ') : <span style={{ color: C.gold }}>aucun</span>}
                </div>
              </div>
              {club.teams.length === 0 ? (
                <div style={{ padding: 16, fontSize: 13, color: C.muted }}>Aucune équipe.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ color: C.muted, textAlign: 'left' }}>
                        {['Équipe', 'Joueurs', 'Sans compte', 'Staff', 'Mesures 30 j', 'Événements 30 j', 'Dernière activité'].map(h => (
                          <th key={h} scope="col" style={{ padding: '10px 16px', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {club.teams.map(t => (
                        <tr key={t.id} style={{ borderTop: '1px solid ' + C.border }}>
                          <td style={{ padding: '10px 16px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                            <span aria-hidden="true" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: t.color || C.muted, marginRight: 8 }} />{t.name}
                          </td>
                          <td className="mono" style={{ padding: '10px 16px' }}>{t.joueurs}</td>
                          <td className="mono" style={{ padding: '10px 16px', color: t.sans_compte > 12 ? C.gold : C.text }}>{t.sans_compte}</td>
                          <td style={{ padding: '10px 16px', minWidth: 160 }}>
                            {t.staff.length === 0 ? <span style={{ color: C.gold }}>aucun coach</span>
                              : t.staff.map((s, i) => <div key={i}>{s.nom} <span style={{ color: C.muted }}>· {ROLE_CONFIG[s.role]?.label || s.role}</span></div>)}
                          </td>
                          <td className="mono" style={{ padding: '10px 16px' }}>{t.mesures_30j}</td>
                          <td className="mono" style={{ padding: '10px 16px' }}>{t.evenements_30j}</td>
                          <td style={{ padding: '10px 16px', whiteSpace: 'nowrap', color: t.derniere_activite ? C.text : C.muted }}>{formatDate(t.derniere_activite)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
