import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { C, DEFAULT_PROFIL } from '../lib/constants'
import Icon from './Icons'

// Onglet Profil : photo, infos joueur (consultation / édition), équipes rejointes, installation de l'appli.
export default function ProfilScreen({ user, onSignOut, profil, setProfil, clubs, availableTeams, myTeamIds, toggleMyTeam, isStandalone, handleInstall, isMobile, showToast }) {
  // Profil incomplet (ex: inscription via Google, sans club/poste saisis au préalable) :
  // on ouvre directement l'écran en mode édition pour guider la première saisie.
  const [profilIncomplet] = useState(() => !profil.club || !profil.poste1)
  const [editMode, setEditMode] = useState(profilIncomplet)
  const [profilEdit, setProfilEdit] = useState(() => profilIncomplet ? profil : DEFAULT_PROFIL)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const saveProfil = async () => {
    await supabase.from('profils').update({ ...profilEdit, updated_at: new Date().toISOString() }).eq('user_id', user.id)
    setProfil(profilEdit)
    setEditMode(false)
    showToast('Profil mis à jour')
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
      showToast('Photo mise à jour')
    } catch (e) { showToast('Échec de l’envoi de la photo. Réessaie.') }
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
      showToast('Photo supprimée')
    } catch (e) { showToast('Échec de la suppression de la photo. Réessaie.') }
    setUploadingPhoto(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, paddingTop: 8 }}>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <div style={{ width: 90, height: 90, borderRadius: 22, background: C.card, border: '1px solid ' + C.border, color: C.accentGlow, overflow: 'hidden', display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 600 }}>
            {profil.photo_url ? <img src={profil.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (((profil.prenom || '').charAt(0) + (profil.nom || '').charAt(0)).toUpperCase() || 'TxT')}
          </div>
          <label title="Changer la photo" style={{ position: 'absolute', bottom: -6, right: -6, width: 32, height: 32, borderRadius: 10, background: C.accent, color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', border: '2px solid ' + C.bg, opacity: uploadingPhoto ? 0.6 : 1 }}>
            <Icon name="camera" size={16} />
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadPhoto(e.target.files[0])} />
          </label>
          {profil.photo_url && (
            <button onClick={deletePhoto} disabled={uploadingPhoto} title="Supprimer la photo"
              style={{ position: 'absolute', bottom: -6, left: -6, width: 32, height: 32, borderRadius: 10, background: C.surface, color: C.muted, border: '2px solid ' + C.bg, display: 'grid', placeItems: 'center', cursor: uploadingPhoto ? 'default' : 'pointer', opacity: uploadingPhoto ? 0.6 : 1 }}>
              <Icon name="trash" size={16} />
            </button>
          )}
        </div>
        {!editMode && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{profil.prenom} {profil.nom}</div>
            <div style={{ fontSize: 15, color: C.muted, fontWeight: 400, marginTop: 2 }}>"{profil.surnom || 'TxT'}"</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{profil.poste1}{profil.poste2 ? ' · ' + profil.poste2 : ''}</div>
          </div>
        )}
      </div>

      {!editMode ? (
        <div style={{ maxWidth: isMobile ? '100%' : 480, margin: '0 auto' }}>
          {[
            { label: 'Nom', value: profil.nom },
            { label: 'Prénom', value: profil.prenom },
            { label: 'Surnom', value: profil.surnom },
            { label: 'Club', value: profil.club },
            { label: 'Division', value: profil.division },
            { label: 'Poste 1', value: profil.poste1 },
            { label: 'Poste 2', value: profil.poste2 },
          ].map(f => (
            <div key={f.label} style={{ padding: '12px 4px', borderBottom: '1px solid ' + C.border, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ fontSize: 13, color: C.muted }}>{f.label}</div>
              <div style={{ fontSize: 15, fontWeight: 500, textAlign: 'right', minWidth: 0 }}>{f.value || '—'}</div>
            </div>
          ))}

          {/* Sélecteur d'équipes (multi) pour l'utilisateur */}
          {availableTeams.length > 0 && (
            <div style={{ padding: '16px 4px 8px' }}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>Mes équipes</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {availableTeams.map(team => {
                  const selected = myTeamIds.has(team.id)
                  return (
                    <button key={team.id} onClick={() => toggleMyTeam(team.id)}
                      style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid ' + (selected ? C.accent : C.border), background: selected ? C.accent + '22' : 'transparent', color: selected ? C.accentGlow : C.muted, fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
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
            style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15, background: C.accent, color: '#fff', marginTop: 16 }}>
            Modifier le profil
          </button>
          {!isStandalone && (
            <button onClick={handleInstall}
              style={{ width: '100%', padding: 13, borderRadius: 10, border: '1px solid ' + C.border, cursor: 'pointer', fontWeight: 500, fontSize: 15, background: 'transparent', color: C.accentGlow, marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon name="install" size={18} /> Installer l'application
            </button>
          )}
          <button onClick={onSignOut}
            style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid ' + C.border, cursor: 'pointer', fontWeight: 500, fontSize: 14, background: 'transparent', color: C.muted, marginTop: 10 }}>
            Déconnexion
          </button>
        </div>
      ) : (
        <div style={{ maxWidth: isMobile ? '100%' : 480, margin: '0 auto' }}>
          {profilIncomplet && (
            <div style={{ background: C.accent + '15', border: '1px solid ' + C.accent + '40', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.text }}>
              Bienvenue. Complète ton profil pour continuer.
            </div>
          )}
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
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>{f.label}</div>
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
              style={{ flex: 1, padding: 13, borderRadius: 10, border: '1px solid ' + C.border, cursor: 'pointer', fontWeight: 500, fontSize: 15, background: 'transparent', color: C.muted }}>Annuler</button>
            <button onClick={saveProfil}
              style={{ flex: 2, padding: 13, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15, background: C.accent, color: '#fff' }}>Enregistrer</button>
          </div>
        </div>
      )}
    </div>
  )
}
