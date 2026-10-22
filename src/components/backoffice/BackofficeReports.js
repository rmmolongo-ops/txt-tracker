import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Section } from './ui'
import MessageReports from '../MessageReports'

// Signalements de messages du chat, toutes équipes : ceux à traiter puis l'historique des décisions.
export default function BackofficeReports() {
  const [teams, setTeams] = useState([])

  useEffect(() => {
    supabase.from('teams').select('id, name').then(({ data }) => setTeams(data || []))
  }, [])

  return (
    <Section title="Signalements du chat">
      <MessageReports teams={teams} showResolved />
    </Section>
  )
}
