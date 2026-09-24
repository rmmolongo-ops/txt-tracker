import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { C, DEFAULT_PROFIL } from '../lib/constants'

// Onglet Profil : photo, infos joueur (consultation / édition), équipes rejointes, installation de l'appli.
export default function ProfilScreen({ user, onSignOut, profil, setProfil, clubs, availableTeams, myTeamIds, toggleMyTeam, isStandalone, handleInstall, isMobile, showToast }) {
  const [editMode, setEditMode] = useState(false)
  const [profilEdit, setProfilEdit] = useState(DEFAULT_PROFIL)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const saveProfil = async () => {
    await supabase.from('profils').update({ ...profilEdit, updated_at: new Date().toISOString() }).eq('user_id', user.id)
    setProfil(profilEdit)
    setEditMode(false)
    showToast('✅ Profil mis à jour !')
  }

  const uploadPhoto = async (file) => {
    setUploadingPhoto(true)
    try {
      const img = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      const MAX = 300
      const ratio = Math.min(MAX / img.width, MAX / img.height)
      canvas.width = img.width * ratio; canvas.height = img.height * ratio
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.8))
      const path = `${user.id}/avatar.jpg`
      await supabase.storage.from('photos').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)
      const url = publicUrl + '?t=' + Date.now()
      await supabase.from('profils').update({ photo_url: url }).eq('user_id', user.id)
      setProfil(p => ({ ...p, photo_url: url }))
      setProfilEdit(p => ({ ...p, photo_url: url }))
      showToast('📷 Photo mise à jour !')
    } catch (e) { showToast('❌ Erreur upload photo') }
    setUploadingPhoto(false)
  }

  const deletePhoto = async () => {
    setUploadingPhoto(true)
    try {
      const path = `${user.id}/avatar.jpg`
      await supabase.storage.from('photos').remove([path])
      await supabase.from('profils').update({ photo_url: '' }).eq('user_id', user.id)
      setProfil(p => ({ ...p, photo_url: '' }))
      setProfilEdit(p => ({ ...p, photo_url: '' }))
      showToast('🗑️ Photo supprimée')
    } catch (e) { showToast('❌ Erreur suppression photo') }
    setUploadingPhoto(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, paddingTop: 8 }}>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, boxShadow: '0 0 30px rgba(59,130,246,0.4)' }}>
            {profil.photo_url ? <img src={profil.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚽'}
          </div>
          <label style={{ position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', fontSize: 15 }}>
            {uploadingPhoto ? '⏳' : '📷'}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadPhoto(e.target.files[0])} />
          </label>
          {profil.photo_url && (
            <button onClick={deletePhoto} disabled={uploadingPhoto} title="Supprimer la photo"
              style={{ position: 'absolute', bottom: 0, left: 0, width: 30, height: 30, borderRadius: '50%', background: C.red, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploadingPhoto ? 'default' : 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', fontSize: 13, opacity: uploadingPhoto ? 0.6 : 1 }}>
              🗑️
            </button>
          )}
        </div>
        {!editMode && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{profil.prenom} {profil.nom}</div>
            <div style={{ fontSize: 16, color: C.gold, fontWeight: 700, marginTop: 2 }}>"{profil.surnom || 'TxT'}"</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{profil.poste1}{profil.poste2 ? ' · ' + profil.poste2 : ''}</div>
          </div>
        )}
      </div>

      {!editMode ? (
        <div style={{ maxWidth: isMobile ? '100%' : 480, margin: '0 auto' }}>
          {[
            { label: 'Nom', value: profil.nom, icon: '👤' },
            { label: 'Prénom', value: profil.prenom, icon: '🏷️' },
            { label: 'Surnom', value: profil.surnom, icon: '⚡' },
            { label: 'Club', value: profil.club, icon: '🏟️' },
            { label: 'Division', value: profil.division, icon: '🏆' },
            { label: 'Poste 1', value: profil.poste1, icon: '📍' },
            { label: 'Poste 2', value: profil.poste2, icon: '📍' },
          ].map(f => (
            <div key={f.label} style={{ background: C.card, borderRadius: 12, padding: '12px 16px', marginBottom: 8, border: '1px solid ' + C.border, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{f.label.toUpperCase()}</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{f.value || '—'}</div>
              </div>
            </div>
          ))}

          {/* Sélecteur d'équipes (multi) pour l'utilisateur */}
          {availableTeams.length > 0 && (
            <div style={{ background: C.card, borderRadius: 12, padding: '12px 16px', marginBottom: 8, border: '1px solid ' + C.border }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>🏟️</span>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>MES ÉQUIPES</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {availableTeams.map(team => {
                  const selected = myTeamIds.has(team.id)
                  return (
                    <button key={team.id} onClick={() => toggleMyTeam(team.id)}
                      style={{ padding: '6px 14px', borderRadius: 16, border: '2px solid ' + (selected ? team.color : C.border), background: selected ? team.color + '25' : 'transparent', color: selected ? team.color : C.muted, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {team.photo_url
                        ? <img src={team.photo_url} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'cover' }} />
                        : <span style={{ width: 8, height: 8, borderRadius: '50%', background: team.color, display: 'inline-block' }} />}
                      {selected ? '✓ ' : ''}{team.name}
                    </button>
                  )
                })}
              </div>
              {myTeamIds.size === 0 && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Appuie sur une équipe pour la rejoindre</div>}
            </div>
          )}

          <button onClick={() => { setProfilEdit(profil); setEditMode(true) }}
            style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', marginTop: 8 }}>
            ✏️ Modifier le profil
          </button>
          {!isStandalone && (
            <button onClick={handleInstall}
              style={{ width: '100%', padding: 14, borderRadius: 14, border: '1px solid ' + C.accent + '50', cursor: 'pointer', fontWeight: 700, fontSize: 15, background: C.accent + '15', color: C.accentGlow, marginTop: 10 }}>
              📲 Installer l'application
            </button>
          )}
          <button onClick={onSignOut}
            style={{ width: '100%', padding: 12, borderRadius: 14, border: '1px solid ' + C.border, cursor: 'pointer', fontWeight: 600, fontSize: 14, background: 'transparent', color: C.muted, marginTop: 10 }}>
            Déconnexion
          </button>
        </div>
      ) : (
        <div style={{ maxWidth: isMobile ? '100%' : 480, margin: '0 auto' }}>
          {[
            { key: 'nom', label: 'Nom', placeholder: 'Nom de famille' },
            { key: 'prenom', label: 'Prénom', placeholder: 'Prénom' },
            { key: 'surnom', label: 'Surnom', placeholder: 'Ex: TxT' },
            { key: 'club', label: 'Club', placeholder: 'Nom du club' },
            { key: 'division', label: 'Division', placeholder: 'Ex: U17 D1' },
            { key: 'poste1', label: 'Poste 1', placeholder: 'Ex: Milieu Gauche' },
            { key: 'poste2', label: 'Poste 2', placeholder: 'Ex: Attaquant' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>{f.label.toUpperCase()}</div>
              {f.key === 'club' ? (
                <select value={profilEdit.club || ''} onChange={e => setProfilEdit(p => ({ ...p, club: e.target.value }))}
                  style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '12px 14px', color: C.text, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}>
                  <option value="">Sélectionne un club...</option>
                  {profilEdit.club && !clubs.some(c => c.name === profilEdit.club) && <option value={profilEdit.club}>{profilEdit.club}</option>}
                  {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              ) : (
                <input type="text" placeholder={f.placeholder} value={profilEdit[f.key] || ''}
                  onChange={e => setProfilEdit(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '12px 14px', color: C.text, fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={() => { setProfilEdit(profil); setEditMode(false) }}
              style={{ flex: 1, padding: 14, borderRadius: 14, border: '1px solid ' + C.border, cursor: 'pointer', fontWeight: 700, fontSize: 15, background: C.surface, color: C.muted }}>Annuler</button>
            <button onClick={saveProfil}
              style={{ flex: 2, padding: 14, borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}>✓ Enregistrer</button>
          </div>
        </div>
      )}
    </div>
  )
}
