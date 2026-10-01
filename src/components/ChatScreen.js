import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../lib/constants'
import Icon from './Icons'

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
    if (error) showToast('Message non envoyé : ' + error.message)
  }

  const deleteChatMessage = async (id) => {
    await supabase.from('team_messages').delete().eq('id', id)
    setChatMessages(prev => prev.filter(m => m.id !== id))
  }

  if (myTeams.length === 0) {
    return (
      <div style={{ border: '1px dashed ' + C.border, borderRadius: 14, padding: '32px 20px', textAlign: 'center', color: C.muted, fontSize: 14 }}>
        <Icon name="chat" size={28} style={{ margin: '0 auto 12px' }} />
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
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 8, border: '1px solid ' + (sel ? C.accent : C.border), background: sel ? C.accent + '22' : 'transparent', color: sel ? C.accentGlow : C.muted, fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                {team.name}
                {unread > 0 && (
                  <span style={{ background: C.red, color: '#fff', fontSize: 11, fontWeight: 600, borderRadius: 8, padding: '1px 6px', minWidth: 16, textAlign: 'center', lineHeight: '14px' }}>{unread > 9 ? '9+' : unread}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <div style={{ maxHeight: isMobile ? '50vh' : 500, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 2px', marginBottom: 12 }}>
        {chatMessages.length === 0 && (
          <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, marginTop: 30 }}>
            Aucun message pour l'instant. Écris le premier.
          </div>
        )}
        {chatMessages.map(m => {
          const mine = m.user_id === user.id
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: mine ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, overflow: 'hidden', background: C.card, border: '1px solid ' + C.border, color: C.accentGlow, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                {m.sender_photo_url ? <img src={m.sender_photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : ((m.sender_prenom || '?').charAt(0) + (m.sender_nom || '').charAt(0)).toUpperCase()}
              </div>
              <div style={{ maxWidth: '72%' }}>
                {!mine && <div style={{ fontSize: 11, color: C.muted, marginBottom: 2, marginLeft: 4 }}>{m.sender_prenom}{m.sender_surnom ? ' "' + m.sender_surnom + '"' : ''}</div>}
                <div style={{ background: mine ? C.accent : C.card, color: mine ? '#fff' : C.text, border: mine ? 'none' : '1px solid ' + C.border, borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '8px 12px', fontSize: 14, lineHeight: 1.45, wordBreak: 'break-word' }}>
                  {m.content}
                </div>
                <div className="mono" style={{ fontSize: 11, color: C.muted, marginTop: 2, textAlign: mine ? 'right' : 'left' }}>
                  {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {(mine || isAdmin) && (
                <button onClick={() => deleteChatMessage(m.id)}
                  aria-label="Supprimer ce message"
                  style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4, flexShrink: 0, display: 'grid', placeItems: 'center' }}><Icon name="trash" size={15} /></button>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid ' + C.border }}>
        <input value={chatInput} onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
          placeholder={'Écrire à ' + (activeTeam?.name || '...')}
          style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 14, outline: 'none', minWidth: 0 }} />
        <button onClick={sendChatMessage} disabled={!chatInput.trim()}
          aria-label="Envoyer"
          style={{ width: 42, height: 42, borderRadius: 10, border: 'none', background: chatInput.trim() ? C.accent : C.surface, color: chatInput.trim() ? '#fff' : C.muted, cursor: 'pointer', flexShrink: 0, display: 'grid', placeItems: 'center' }}><Icon name="send" size={18} /></button>
      </div>
    </div>
  )
}
