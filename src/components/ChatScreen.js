import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../lib/constants'

// Onglet Chat : tchat d'équipe en temps réel (Supabase Realtime), une conversation par équipe.
export default function ChatScreen({ user, profil, isAdmin, isMobile, myTeams, chatTeamId, onSelectTeam, unreadCounts, markChatRead, showToast }) {
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')

  useEffect(() => {
    if (!chatTeamId && myTeams.length > 0) onSelectTeam(myTeams[0].id)
  }, [chatTeamId, myTeams, onSelectTeam])

  useEffect(() => {
    if (!chatTeamId) return
    let active = true
    supabase.from('team_messages').select('*').eq('team_id', chatTeamId).order('created_at').limit(200)
      .then(({ data }) => { if (active && data) setChatMessages(data) })
    const channel = supabase.channel('team_messages_' + chatTeamId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages', filter: 'team_id=eq.' + chatTeamId }, payload => {
        setChatMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'team_messages', filter: 'team_id=eq.' + chatTeamId }, payload => {
        setChatMessages(prev => prev.filter(m => m.id !== payload.old.id))
      })
      .subscribe()
    markChatRead(chatTeamId)
    return () => { active = false; supabase.removeChannel(channel) }
  }, [chatTeamId, markChatRead])

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !chatTeamId) return
    const content = chatInput.trim()
    setChatInput('')
    const { error } = await supabase.from('team_messages').insert({
      team_id: chatTeamId,
      user_id: user.id,
      content,
      sender_prenom: profil.prenom || '',
      sender_nom: profil.nom || '',
      sender_surnom: profil.surnom || '',
      sender_photo_url: profil.photo_url || '',
    })
    if (error) showToast('❌ ' + error.message)
  }

  const deleteChatMessage = async (id) => {
    await supabase.from('team_messages').delete().eq('id', id)
    setChatMessages(prev => prev.filter(m => m.id !== id))
  }

  if (myTeams.length === 0) {
    return (
      <div style={{ background: C.card, borderRadius: 16, padding: 32, textAlign: 'center', color: C.muted }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
        Rejoins une équipe pour accéder à son tchat
      </div>
    )
  }
  const activeTeamId = myTeams.some(t => t.id === chatTeamId) ? chatTeamId : myTeams[0].id
  const activeTeam = myTeams.find(t => t.id === activeTeamId)
  return (
    <div>
      {myTeams.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {myTeams.map(team => {
            const sel = activeTeamId === team.id
            const unread = unreadCounts[team.id] || 0
            return (
              <button key={team.id} onClick={() => onSelectTeam(team.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 20, border: '2px solid ' + (sel ? team.color : C.border), background: sel ? team.color + '20' : C.card, color: sel ? team.color : C.muted, fontWeight: sel ? 700 : 500, fontSize: 13, cursor: 'pointer' }}>
                {team.name}
                {unread > 0 && (
                  <span style={{ background: C.red, color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 8, padding: '1px 6px', minWidth: 14, textAlign: 'center', lineHeight: '13px' }}>{unread > 9 ? '9+' : unread}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <div style={{ maxHeight: isMobile ? '50vh' : 500, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 2px', marginBottom: 12 }}>
        {chatMessages.length === 0 && (
          <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, marginTop: 30 }}>
            Aucun message pour l'instant — lance la discussion !
          </div>
        )}
        {chatMessages.map(m => {
          const mine = m.user_id === user.id
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: mine ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                {m.sender_photo_url ? <img src={m.sender_photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚽'}
              </div>
              <div style={{ maxWidth: '72%' }}>
                {!mine && <div style={{ fontSize: 11, color: C.muted, marginBottom: 2, marginLeft: 4 }}>{m.sender_prenom}{m.sender_surnom ? ' "' + m.sender_surnom + '"' : ''}</div>}
                <div style={{ background: mine ? C.accent : C.card, color: mine ? '#fff' : C.text, border: mine ? 'none' : '1px solid ' + C.border, borderRadius: 14, padding: '8px 12px', fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {m.content}
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2, textAlign: mine ? 'right' : 'left' }}>
                  {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {(mine || isAdmin) && (
                <button onClick={() => deleteChatMessage(m.id)}
                  style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12, opacity: 0.5, flexShrink: 0 }}>🗑️</button>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid ' + C.border }}>
        <input value={chatInput} onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
          placeholder={'Écrire à ' + (activeTeam?.name || '...')}
          style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, borderRadius: 20, padding: '10px 16px', color: C.text, fontSize: 14, outline: 'none', minWidth: 0 }} />
        <button onClick={sendChatMessage} disabled={!chatInput.trim()}
          style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', background: chatInput.trim() ? C.accent : C.surface, color: '#fff', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>➤</button>
      </div>
    </div>
  )
}
