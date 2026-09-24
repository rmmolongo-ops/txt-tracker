import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Compteurs de messages non lus par équipe (pastilles du menu Chat), tenus à jour en temps réel.
// `openTeamId` : l'équipe dont le tchat est affiché (ses nouveaux messages sont lus d'office), ou null.
export default function useChatUnread({ userId, availableTeams, myTeamIds, openTeamId }) {
  const [unreadCounts, setUnreadCounts] = useState({})
  const openTeamRef = useRef(null)

  useEffect(() => { openTeamRef.current = openTeamId }, [openTeamId])

  const markChatRead = useCallback(async (teamId) => {
    const now = new Date().toISOString()
    setUnreadCounts(prev => ({ ...prev, [teamId]: 0 }))
    await supabase.from('chat_reads').upsert({ user_id: userId, team_id: teamId, last_read_at: now }, { onConflict: 'user_id,team_id' })
  }, [userId])

  useEffect(() => {
    const myTeams = availableTeams.filter(t => myTeamIds.has(t.id))
    if (myTeams.length === 0) return
    let active = true
    ;(async () => {
      const { data: reads } = await supabase.from('chat_reads').select('team_id, last_read_at').eq('user_id', userId)
      const readMap = {}
      ;(reads || []).forEach(r => { readMap[r.team_id] = r.last_read_at })
      const counts = {}
      await Promise.all(myTeams.map(async team => {
        const since = readMap[team.id] || '1970-01-01T00:00:00Z'
        const { count } = await supabase.from('team_messages').select('id', { count: 'exact', head: true }).eq('team_id', team.id).gt('created_at', since).neq('user_id', userId)
        counts[team.id] = count || 0
      }))
      if (active) setUnreadCounts(counts)
    })()
    return () => { active = false }
  }, [availableTeams, myTeamIds, userId])

  useEffect(() => {
    const myTeams = availableTeams.filter(t => myTeamIds.has(t.id))
    if (myTeams.length === 0) return
    const channels = myTeams.map(team => supabase.channel('unread_' + team.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages', filter: 'team_id=eq.' + team.id }, payload => {
        if (payload.new.user_id === userId) return
        if (openTeamRef.current === team.id) { markChatRead(team.id); return }
        setUnreadCounts(prev => ({ ...prev, [team.id]: (prev[team.id] || 0) + 1 }))
      })
      .subscribe())
    return () => { channels.forEach(c => supabase.removeChannel(c)) }
  }, [availableTeams, myTeamIds, userId, markChatRead])

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)
  return { unreadCounts, totalUnread, markChatRead }
}
