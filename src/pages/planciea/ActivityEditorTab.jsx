import React, { useState } from 'react';
import {
    Plus, Trash2, ChevronDown, ChevronRight, Check, X, Edit3,
    Target, Users, Save, AlertCircle, CheckCircle2, GripVertical
} from 'lucide-react';
import { CIEAPlanService } from '../../services/cieaPlanService';

export default function ActivityEditorTab({ project, activities, engineers, onReloadActivities, onUpdateProject, saving, setSaving }) {
    const [expandedActivity, setExpandedActivity] = useState(null);
    const [newActivityName, setNewActivityName] = useState('');
    const [addingSubTo, setAddingSubTo] = useState(null);
    const [newSub, setNewSub] = useState({ name: '', weight: 1 });
    const [editingProject, setEditingProject] = useState(false);
    const [projectForm, setProjectForm] = useState({
        name: project.name,
        description: project.description || '',
        responsible_person_id: project.responsible_person_id || '',
        support_person_name: project.support_person_name || ''
    });

    const handleAddActivity = async () => {
        if (!newActivityName.trim()) return;
        setSaving(true);
        try {
            await CIEAPlanService.createActivity(project.ciea_project_id, {
                name: newActivityName, sort_order: activities.length
            });
            setNewActivityName('');
            await onReloadActivities();
        } catch (e) { console.error(e); }
        setSaving(false);
    };

    const handleDeleteActivity = async (activityId) => {
        if (!confirm('¿Eliminar esta actividad y todas sus subactividades?')) return;
        setSaving(true);
        try { await CIEAPlanService.deleteActivity(activityId); await onReloadActivities(); }
        catch (e) { console.error(e); }
        setSaving(false);
    };

    const handleAddSubActivity = async (activityId) => {
        if (!newSub.name.trim()) return;
        setSaving(true);
        try {
            await CIEAPlanService.createSubActivity(activityId, newSub);
            setNewSub({ name: '', weight: 1 });
            setAddingSubTo(null);
            await onReloadActivities();
        } catch (e) { console.error(e); }
        setSaving(false);
    };

    const handleToggleSub = async (subId, current) => {
        setSaving(true);
        try { await CIEAPlanService.toggleSubActivity(subId, !current); await onReloadActivities(); }
        catch (e) { console.error(e); }
        setSaving(false);
    };

    const handleDeleteSub = async (subId) => {
        setSaving(true);
        try { await CIEAPlanService.deleteSubActivity(subId); await onReloadActivities(); }
        catch (e) { console.error(e); }
        setSaving(false);
    };

    const handleUpdateSubWeight = async (subId, weight) => {
        const w = parseFloat(weight);
        if (isNaN(w) || w <= 0) return;
        setSaving(true);
        try { await CIEAPlanService.updateSubActivity(subId, { weight: w }); await onReloadActivities(); }
        catch (e) { console.error(e); }
        setSaving(false);
    };

    const handleSaveProject = async () => {
        setSaving(true);
        try {
            await onUpdateProject({
                name: projectForm.name,
                description: projectForm.description || null,
                responsible_person_id: projectForm.responsible_person_id || null,
                support_person_name: projectForm.support_person_name || null
            });
            setEditingProject(false);
        } catch (e) { console.error(e); }
        setSaving(false);
    };

    const handleUpdateActivityStatus = async (activityId, status) => {
        setSaving(true);
        try { await CIEAPlanService.updateActivity(activityId, { status }); await onReloadActivities(); }
        catch (e) { console.error(e); }
        setSaving(false);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Project Header Card */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        {editingProject ? (
                            <div className="space-y-3">
                                <input value={projectForm.name} onChange={e => setProjectForm(p => ({ ...p, name: e.target.value }))}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-semibold" />
                                <textarea value={projectForm.description} onChange={e => setProjectForm(p => ({ ...p, description: e.target.value }))}
                                    rows={2} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white resize-none" placeholder="Descripción..." />
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] text-slate-400 block mb-1">Responsable</label>
                                        <select value={projectForm.responsible_person_id} onChange={e => setProjectForm(p => ({ ...p, responsible_person_id: e.target.value ? Number(e.target.value) : '' }))}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white">
                                            <option value="">— Sin asignar —</option>
                                            {engineers.map(e => <option key={e.person_id} value={e.person_id}>{e.fullName}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-slate-400 block mb-1">Apoyo Centro Industrial</label>
                                        <input value={projectForm.support_person_name} onChange={e => setProjectForm(p => ({ ...p, support_person_name: e.target.value }))}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white" placeholder="Persona apoyo" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleSaveProject} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg"><Save size={12} /> Guardar</button>
                                    <button onClick={() => setEditingProject(false)} className="px-3 py-1.5 text-slate-400 text-xs hover:text-white"><X size={12} /></button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-base font-bold text-white">{project.name}</h2>
                                {project.description && <p className="text-xs text-slate-400 mt-1">{project.description}</p>}
                                <div className="flex flex-wrap gap-3 mt-3 text-[11px]">
                                    <span className="flex items-center gap-1 text-slate-400">
                                        <Users size={12} className="text-indigo-400" /> Responsable: <strong className="text-white">{project.responsibleName}</strong>
                                    </span>
                                    {project.support_person_name && (
                                        <span className="flex items-center gap-1 text-slate-400">
                                            <Users size={12} className="text-amber-400" /> Apoyo CI: <strong className="text-white">{project.support_person_name}</strong>
                                        </span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded-full font-medium ${project.status === 'ACTIVO' ? 'bg-emerald-500/20 text-emerald-400' : project.status === 'COMPLETADO' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {project.status}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                    {!editingProject && (
                        <button onClick={() => { setEditingProject(true); setProjectForm({ name: project.name, description: project.description || '', responsible_person_id: project.responsible_person_id || '', support_person_name: project.support_person_name || '' }); }}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><Edit3 size={14} /></button>
                    )}
                </div>
                {/* Stats bar */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-white">{activities.length}</p>
                        <p className="text-[10px] text-slate-400">Actividades</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-white">{activities.reduce((s, a) => s + a.totalSubs, 0)}</p>
                        <p className="text-[10px] text-slate-400">Subactividades</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-indigo-400">
                            {activities.length > 0 ? Math.round(activities.filter(a => a.totalSubs > 0).reduce((s, a) => s + a.progress, 0) / Math.max(activities.filter(a => a.totalSubs > 0).length, 1)) : 0}%
                        </p>
                        <p className="text-[10px] text-slate-400">Avance Global</p>
                    </div>
                </div>
            </div>

            {/* Add Activity */}
            <div className="flex gap-2">
                <input value={newActivityName} onChange={e => setNewActivityName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddActivity()}
                    placeholder="Nombre de nueva actividad..." className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-xs text-white placeholder-slate-500" />
                <button onClick={handleAddActivity} disabled={!newActivityName.trim() || saving}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
                    <Plus size={14} /> Agregar Actividad
                </button>
            </div>

            {/* Activities List */}
            <div className="space-y-3">
                {activities.map((act, i) => (
                    <ActivityCard key={act.ciea_activity_id} activity={act} index={i}
                        expanded={expandedActivity === act.ciea_activity_id}
                        onToggle={() => setExpandedActivity(expandedActivity === act.ciea_activity_id ? null : act.ciea_activity_id)}
                        onDelete={() => handleDeleteActivity(act.ciea_activity_id)}
                        onToggleSub={handleToggleSub}
                        onDeleteSub={handleDeleteSub}
                        onUpdateSubWeight={handleUpdateSubWeight}
                        onUpdateStatus={handleUpdateActivityStatus}
                        addingSub={addingSubTo === act.ciea_activity_id}
                        setAddingSub={(v) => setAddingSubTo(v ? act.ciea_activity_id : null)}
                        newSub={newSub} setNewSub={setNewSub}
                        onAddSub={() => handleAddSubActivity(act.ciea_activity_id)}
                        saving={saving}
                    />
                ))}
                {activities.length === 0 && (
                    <div className="text-center py-12 text-slate-500 text-sm">
                        <Target size={32} className="mx-auto mb-2 opacity-30" />
                        No hay actividades. Agrega la primera arriba.
                    </div>
                )}
            </div>
        </div>
    );
}

function ActivityCard({ activity: act, index, expanded, onToggle, onDelete, onToggleSub, onDeleteSub, onUpdateSubWeight, onUpdateStatus, addingSub, setAddingSub, newSub, setNewSub, onAddSub, saving }) {
    const statusColors = {
        PENDIENTE: 'text-slate-400 bg-slate-700/50',
        EN_EJECUCION: 'text-amber-400 bg-amber-500/20',
        COMPLETADA: 'text-emerald-400 bg-emerald-500/20',
        CANCELADA: 'text-red-400 bg-red-500/20'
    };

    return (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden hover:border-slate-600/60 transition-colors">
            {/* Activity header */}
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onToggle}>
                <span className="text-slate-500 text-xs font-mono w-6">{index + 1}</span>
                {expanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{act.name}</p>
                    <p className="text-[10px] text-slate-500">{act.completedSubs}/{act.totalSubs} subactividades</p>
                </div>
                {/* Progress bar */}
                <div className="flex items-center gap-2 min-w-[140px]">
                    <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${act.progress}%`, background: act.progress === 100 ? 'linear-gradient(90deg,#10b981,#34d399)' : act.progress > 50 ? 'linear-gradient(90deg,#6366f1,#8b5cf6)' : 'linear-gradient(90deg,#f59e0b,#fbbf24)' }} />
                    </div>
                    <span className="text-xs font-mono text-slate-400 w-10 text-right">{act.progress}%</span>
                </div>
                <select value={act.status} onChange={e => { e.stopPropagation(); onUpdateStatus(act.ciea_activity_id, e.target.value); }}
                    onClick={e => e.stopPropagation()}
                    className={`text-[10px] px-2 py-1 rounded-lg border-0 ${statusColors[act.status] || 'text-slate-400 bg-slate-700'}`}>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="EN_EJECUCION">En ejecución</option>
                    <option value="COMPLETADA">Completada</option>
                    <option value="CANCELADA">Cancelada</option>
                </select>
                <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
            </div>

            {/* Expanded: sub-activities */}
            {expanded && (
                <div className="border-t border-slate-700/30 px-4 py-3 bg-slate-900/30">
                    <div className="space-y-1.5">
                        {act.subActivities.map(sub => (
                            <div key={sub.ciea_sub_activity_id} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${sub.is_completed ? 'bg-emerald-500/5' : 'hover:bg-slate-800/50'}`}>
                                <button onClick={() => onToggleSub(sub.ciea_sub_activity_id, sub.is_completed)}
                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${sub.is_completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600 hover:border-indigo-400'}`}>
                                    {sub.is_completed && <Check size={12} />}
                                </button>
                                <span className={`flex-1 text-xs ${sub.is_completed ? 'text-slate-500 line-through' : 'text-white'}`}>{sub.name}</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-500">Peso:</span>
                                    <input type="number" value={sub.weight} min="0.1" step="0.1"
                                        onChange={e => onUpdateSubWeight(sub.ciea_sub_activity_id, e.target.value)}
                                        className="w-14 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-center text-white" />
                                </div>
                                <button onClick={() => onDeleteSub(sub.ciea_sub_activity_id)} className="p-1 text-slate-600 hover:text-red-400"><Trash2 size={11} /></button>
                            </div>
                        ))}
                    </div>

                    {/* Add sub-activity */}
                    {addingSub ? (
                        <div className="flex gap-2 mt-3">
                            <input value={newSub.name} onChange={e => setNewSub(p => ({ ...p, name: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && onAddSub()}
                                placeholder="Nombre subactividad..." className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white" autoFocus />
                            <input type="number" value={newSub.weight} min="0.1" step="0.1" onChange={e => setNewSub(p => ({ ...p, weight: parseFloat(e.target.value) || 1 }))}
                                className="w-16 bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-xs text-white text-center" placeholder="Peso" />
                            <button onClick={onAddSub} disabled={!newSub.name.trim() || saving}
                                className="px-3 py-2 bg-indigo-600 text-white text-xs rounded-lg disabled:opacity-50"><Check size={12} /></button>
                            <button onClick={() => setAddingSub(false)} className="px-2 py-2 text-slate-400 text-xs"><X size={12} /></button>
                        </div>
                    ) : (
                        <button onClick={() => setAddingSub(true)} className="flex items-center gap-1 mt-3 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                            <Plus size={12} /> Agregar subactividad
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
