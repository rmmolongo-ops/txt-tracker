import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { C, DEFAULT_TEMPLATE_BLOCS } from '../lib/constants'

// Onglet Bibliothèque (coachs) : séances types réutilisables, création / modification / suppression.
// La liste `templates` est partagée avec le reste de l'appli (programmes, calendrier) : elle vit dans App.
export default function BibliothequeScreen({ user, templates, loading, setTemplates, showToast }) {
  const [editingTemplate, setEditingTemplate] = useState(false)
  const [templateDraft, setTemplateDraft] = useState(null)
  const [editingTemplateId, setEditingTemplateId] = useState(null)
  const [expandedTemplateId, setExpandedTemplateId] = useState(null)

  const saveTemplate = async (draft, templateId) => {
    if (!draft.label.trim()) { showToast('❌ Donne un nom à la séance'); return }
    const clean = {
      label: draft.label.trim(), icon: draft.icon, color: draft.color, duration: draft.duration.trim() || '1h', objectif: draft.objectif.trim(),
      blocs: draft.blocs.map(b => ({ ...b, exercices: b.exercices.filter(e => e.trim() !== '') })),
    }
    if (templateId) {
      const { data, error } = await supabase.from('seance_templates').update({ ...clean, updated_at: new Date().toISOString() }).eq('id', templateId).select().single()
      if (error) { showToast('❌ ' + error.message); return }
      setTemplates(prev => prev.map(t => t.id === templateId ? data : t))
    } else {
      const { data, error } = await supabase.from('seance_templates').insert({ ...clean, created_by: user.id }).select().single()
      if (error) { showToast('❌ ' + error.message); return }
      setTemplates(prev => [data, ...prev])
    }
    setEditingTemplate(false)
    setTemplateDraft(null)
    setEditingTemplateId(null)
    showToast('✅ Séance enregistrée dans la bibliothèque !')
  }

  const deleteTemplate = async (id) => {
    await supabase.from('seance_templates').delete().eq('id', id)
    setTemplates(prev => prev.filter(t => t.id !== id))
    showToast('🗑️ Séance supprimée de la bibliothèque')
  }

  return (
    <div>
      {!editingTemplate ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Mes séances types</div>
            <button onClick={() => { setTemplateDraft({ label: '', icon: '💪', color: '#3b82f6', duration: '1h30', objectif: '', blocs: JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_BLOCS)) }); setEditingTemplateId(null); setEditingTemplate(true) }}
              style={{ padding: '9px 16px', background: C.accent, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              + Nouvelle séance
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: C.muted, padding: 24 }}>Chargement...</div>
          ) : templates.length === 0 ? (
            <div style={{ background: C.card, borderRadius: 16, padding: 32, textAlign: 'center', color: C.muted }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📚</div>
              Aucune séance dans ta bibliothèque pour le moment
              <div style={{ fontSize: 12, marginTop: 6 }}>Prépare des modèles de séances réutilisables pour tes entraînements</div>
            </div>
          ) : templates.map(t => {
            const expanded = expandedTemplateId === t.id
            return (
              <div key={t.id} style={{ background: C.card, borderRadius: 16, marginBottom: 10, border: '1px solid ' + (expanded ? t.color + '60' : C.border), overflow: 'hidden' }}>
                <div onClick={() => setExpandedTemplateId(expanded ? null : t.id)} style={{ padding: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: t.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{t.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{t.duration}{t.objectif ? ' · ' + t.objectif : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={e => { e.stopPropagation(); setTemplateDraft({ label: t.label, icon: t.icon, color: t.color, duration: t.duration, objectif: t.objectif, blocs: JSON.parse(JSON.stringify(t.blocs)) }); setEditingTemplateId(t.id); setEditingTemplate(true) }}
                      style={{ padding: '7px 10px', background: C.surface, color: C.text, border: '1px solid ' + C.border, borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>✏️</button>
                    <button onClick={e => { e.stopPropagation(); deleteTemplate(t.id) }}
                      style={{ padding: '7px 10px', background: 'transparent', color: C.red, border: '1px solid ' + C.red + '40', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>
                {expanded && (
                  <div style={{ padding: '0 16px 16px' }}>
                    {(t.blocs || []).map((bloc, bi) => (
                      <div key={bi} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{bloc.titre}</div>
                          <div style={{ fontSize: 11, color: t.color, background: t.color + '20', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>{bloc.duree}</div>
                        </div>
                        {(bloc.exercices || []).map((ex, ei) => (
                          <div key={ei} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'flex-start' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, marginTop: 6, flexShrink: 0 }} />
                            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.4 }}>{ex}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{editingTemplateId ? 'Modifier la séance' : 'Nouvelle séance'}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setEditingTemplate(false); setTemplateDraft(null); setEditingTemplateId(null) }}
                style={{ padding: '9px 14px', background: C.surface, color: C.muted, border: '1px solid ' + C.border, borderRadius: 10, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
                Annuler
              </button>
              <button onClick={() => saveTemplate(templateDraft, editingTemplateId)}
                style={{ padding: '9px 18px', background: C.green, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                ✓ Sauvegarder
              </button>
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 14, padding: 16, marginBottom: 16, border: '1px solid ' + C.border }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>NOM DE LA SÉANCE</div>
                <input value={templateDraft.label} onChange={e => setTemplateDraft(d => ({ ...d, label: e.target.value }))} placeholder="Ex : Passes courtes"
                  style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ width: 90 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>DURÉE</div>
                <input value={templateDraft.duration} onChange={e => setTemplateDraft(d => ({ ...d, duration: e.target.value }))}
                  style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }} />
              </div>
              <div style={{ width: 56 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>ICÔNE</div>
                <input value={templateDraft.icon} onChange={e => setTemplateDraft(d => ({ ...d, icon: e.target.value }))}
                  style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 16, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }} />
              </div>
            </div>
            <input value={templateDraft.objectif} onChange={e => setTemplateDraft(d => ({ ...d, objectif: e.target.value }))} placeholder="Objectif de la séance..."
              style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Blocs d'exercices</div>
          {templateDraft.blocs.map((bloc, bi) => (
            <div key={bi} style={{ background: C.card, borderRadius: 14, padding: 14, marginBottom: 10, border: '1px solid ' + C.border }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <input value={bloc.titre} placeholder="Titre du bloc"
                  onChange={e => { const d = JSON.parse(JSON.stringify(templateDraft)); d.blocs[bi].titre = e.target.value; setTemplateDraft(d) }}
                  style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid ' + C.border, color: C.text, fontSize: 13, fontWeight: 700, outline: 'none' }} />
                <input value={bloc.duree} placeholder="Durée"
                  onChange={e => { const d = JSON.parse(JSON.stringify(templateDraft)); d.blocs[bi].duree = e.target.value; setTemplateDraft(d) }}
                  style={{ background: 'transparent', border: '1px solid ' + C.border, borderRadius: 6, color: templateDraft.color, fontSize: 11, padding: '2px 6px', outline: 'none', width: 70, textAlign: 'center' }} />
                {templateDraft.blocs.length > 1 && (
                  <button onClick={() => setTemplateDraft(d => ({ ...d, blocs: d.blocs.filter((_, i) => i !== bi) }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.red, fontSize: 14 }}>🗑️</button>
                )}
              </div>
              <textarea value={bloc.exercices.join('\n')} placeholder="Un exercice par ligne..."
                onChange={e => { const d = JSON.parse(JSON.stringify(templateDraft)); d.blocs[bi].exercices = e.target.value.split('\n'); setTemplateDraft(d) }}
                rows={Math.max(3, bloc.exercices.length + 1)}
                style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7, boxSizing: 'border-box' }} />
            </div>
          ))}
          <button onClick={() => setTemplateDraft(d => ({ ...d, blocs: [...d.blocs, { titre: '', duree: '15 min', exercices: [''] }] }))}
            style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px dashed ' + C.border, background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            + Ajouter un bloc
          </button>
        </div>
      )}
    </div>
  )
}
