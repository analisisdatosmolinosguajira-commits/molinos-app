import React, { useState, useEffect, useMemo } from 'react';
import {
    ClipboardList, Calendar, Plus, Loader2, RotateCcw, Building2,
    ArrowLeft, Users, Target, ChevronRight, FolderOpen, Trash2
} from 'lucide-react';
import { CIEAPlanService } from '../../services/cieaPlanService';
import ActivityEditorTab from './ActivityEditorTab';
import WeeklyPlannerTab from './WeeklyPlannerTab';

const TABS = [
    { id: 'editor', label: 'Edición de Actividades', icon: ClipboardList },
    { id: 'planner', label: 'Planificación Semanal', icon: Calendar },
];

export default function PlanCIEAPage() {
    const [view, setView] = useState('list'); // 'list' | 'detail'
    const [tab, setTab] = useState('editor');
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [activities, setActivities] = useState([]);
    const [staff, setStaff] = useState([]);
    const [engineers, setEngineers] = useState([]);
    const [showNewProject, setShowNewProject] = useState(false);
    const [newProject, setNewProject] = useState({ name: '', description: '', responsible_person_id: '', support_person_name: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [projs, staffData, engs] = await Promise.all([
                CIEAPlanService.getProjects(),
                CIEAPlanService.getOperativeStaff(),
                CIEAPlanService.getLeadEngineers()
            ]);
            setProjects(projs); setStaff(staffData); setEngineers(engs);
        } catch (e) { console.error('Error loading:', e); }
        setLoading(false);
    };

    useEffect(() => { if (selectedProjectId) loadActivities(); }, [selectedProjectId]);

    const loadActivities = async () => {
        if (!selectedProjectId) return;
        try { setActivities(await CIEAPlanService.getActivities(selectedProjectId)); }
        catch (e) { console.error(e); }
    };

    const selectedProject = useMemo(() => projects.find(p => p.ciea_project_id === selectedProjectId) || null, [projects, selectedProjectId]);

    const globalProgress = useMemo(() => {
        const withSubs = activities.filter(a => a.totalSubs > 0);
        if (!withSubs.length) return 0;
        return Math.round(withSubs.reduce((s, a) => s + a.progress, 0) / withSubs.length);
    }, [activities]);

    const enterProject = (projectId) => {
        setSelectedProjectId(projectId);
        setTab('editor');
        setView('detail');
    };

    const goBackToList = async () => {
        setView('list');
        setSelectedProjectId(null);
        setActivities([]);
        // Refresh project list to update progress
        try { setProjects(await CIEAPlanService.getProjects()); } catch (e) { console.error(e); }
    };

    const handleCreateProject = async () => {
        if (!newProject.name.trim()) return;
        setSaving(true);
        try {
            await CIEAPlanService.createProject({ ...newProject, responsible_person_id: newProject.responsible_person_id || null });
            const projs = await CIEAPlanService.getProjects();
            setProjects(projs);
            setShowNewProject(false);
            setNewProject({ name: '', description: '', responsible_person_id: '', support_person_name: '' });
        } catch (e) { console.error(e); }
        setSaving(false);
    };

    const handleDeleteProject = async (projectId) => {
        if (!confirm('¿Eliminar este proyecto y todas sus actividades?')) return;
        setSaving(true);
        try {
            await CIEAPlanService.deleteProject(projectId);
            setProjects(await CIEAPlanService.getProjects());
        } catch (e) { console.error(e); }
        setSaving(false);
    };

    const handleUpdateProject = async (updates) => {
        if (!selectedProjectId) return;
        setSaving(true);
        try { await CIEAPlanService.updateProject(selectedProjectId, updates); setProjects(await CIEAPlanService.getProjects()); }
        catch (e) { console.error(e); }
        setSaving(false);
    };

    if (loading) return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3"><Loader2 size={32} className="text-indigo-400 animate-spin" /><p className="text-sm text-slate-400">Cargando Plan CIEA...</p></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
            {saving && <div className="fixed top-2 right-2 z-50 bg-indigo-600/90 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg"><Loader2 size={12} className="animate-spin" /> Guardando...</div>}

            {/* Header */}
            <header className="border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-30">
                <div className="max-w-[1600px] mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {view === 'detail' && (
                                <button onClick={goBackToList} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors mr-1" title="Volver a proyectos">
                                    <ArrowLeft size={18} />
                                </button>
                            )}
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20"><Building2 size={20} className="text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-white tracking-tight">
                                    {view === 'detail' && selectedProject ? selectedProject.name : 'Plan CIEA'}
                                </h1>
                                <p className="text-[11px] text-slate-400">
                                    {view === 'detail' ? 'Detalle de Proyecto' : 'Planificación de Actividades Simultáneas — Centro Industrial'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {view === 'list' && (
                                <button onClick={() => setShowNewProject(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"><Plus size={14} /> Nuevo Proyecto</button>
                            )}
                            <button onClick={loadAll} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"><RotateCcw size={14} /> Recargar</button>
                        </div>
                    </div>

                    {/* Tabs — only in detail view */}
                    {view === 'detail' && selectedProject && (
                        <div className="flex items-center justify-between mt-3">
                            <div className="flex gap-1">{TABS.map(t => (
                                <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-all ${tab === t.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><t.icon size={14} /> {t.label}</button>
                            ))}</div>
                            <div className="flex items-center gap-2">
                                <div className="w-28 h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${globalProgress}%`, background: globalProgress === 100 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} /></div>
                                <span className="text-[11px] text-slate-400 font-mono">{globalProgress}%</span>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* New Project Modal */}
            {showNewProject && <NewProjectModal newProject={newProject} setNewProject={setNewProject} engineers={engineers} saving={saving} onCreate={handleCreateProject} onClose={() => setShowNewProject(false)} />}

            <main className="max-w-[1600px] mx-auto px-4 py-6">
                {view === 'list' ? (
                    <ProjectListView
                        projects={projects}
                        onEnter={enterProject}
                        onDelete={handleDeleteProject}
                        onNew={() => setShowNewProject(true)}
                    />
                ) : selectedProject ? (<>
                    {tab === 'editor' && <ActivityEditorTab project={selectedProject} activities={activities} engineers={engineers} onReloadActivities={loadActivities} onUpdateProject={handleUpdateProject} saving={saving} setSaving={setSaving} />}
                    {tab === 'planner' && <WeeklyPlannerTab project={selectedProject} activities={activities} staff={staff} onReloadActivities={loadActivities} saving={saving} setSaving={setSaving} />}
                </>) : null}
            </main>

            <footer className="border-t border-slate-800/50 py-4 mt-8"><p className="text-center text-[10px] text-slate-600">Plan CIEA — Centro Industrial y de Energías Alternativas — SENA La Guajira</p></footer>
        </div>
    );
}

// ─── Project List View ──────────────────────────────────────
function ProjectListView({ projects, onEnter, onDelete, onNew }) {
    if (projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
                <FolderOpen size={56} className="mb-4 opacity-20" />
                <p className="text-base font-medium text-slate-400">No hay proyectos creados</p>
                <p className="text-xs text-slate-500 mt-1">Crea tu primer proyecto para comenzar a planificar</p>
                <button onClick={onNew} className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/20">
                    <Plus size={16} /> Crear Proyecto
                </button>
            </div>
        );
    }

    const statusConfig = {
        ACTIVO: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
        COMPLETADO: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-400' },
        CANCELADO: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/20', dot: 'bg-red-400' },
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                    Proyectos ({projects.length})
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {projects.map(p => {
                    const sc = statusConfig[p.status] || statusConfig.ACTIVO;
                    return (
                        <div key={p.ciea_project_id}
                            className="group bg-slate-800/40 border border-slate-700/40 rounded-2xl p-5 hover:border-indigo-500/30 hover:bg-slate-800/60 transition-all cursor-pointer relative"
                            onClick={() => onEnter(p.ciea_project_id)}>

                            {/* Status dot */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">{p.name}</h3>
                                    {p.description && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{p.description}</p>}
                                </div>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${sc.bg} ${sc.text} border ${sc.border}`}>
                                    {p.status}
                                </span>
                            </div>

                            {/* Info chips */}
                            <div className="flex flex-wrap gap-2 mb-4 text-[10px]">
                                <span className="flex items-center gap-1 text-slate-400">
                                    <Users size={10} className="text-indigo-400" />
                                    {p.responsibleName}
                                </span>
                                {p.support_person_name && (
                                    <span className="flex items-center gap-1 text-slate-400">
                                        <Target size={10} className="text-amber-400" />
                                        {p.support_person_name}
                                    </span>
                                )}
                            </div>

                            {/* Date */}
                            <p className="text-[9px] text-slate-600 mb-3">
                                Creado: {new Date(p.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>

                            {/* Footer: enter arrow + delete */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 group-hover:text-indigo-300 font-medium transition-colors">
                                    Abrir proyecto <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                </div>
                                <button onClick={e => { e.stopPropagation(); onDelete(p.ciea_project_id); }}
                                    className="p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10"
                                    title="Eliminar proyecto">
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* New project card */}
                <div onClick={onNew}
                    className="border-2 border-dashed border-slate-700/50 rounded-2xl p-5 flex flex-col items-center justify-center text-slate-500 hover:border-indigo-500/30 hover:text-indigo-400 cursor-pointer transition-all min-h-[180px]">
                    <Plus size={28} className="mb-2 opacity-40" />
                    <p className="text-xs font-medium">Nuevo Proyecto</p>
                </div>
            </div>
        </div>
    );
}

// ─── New Project Modal ──────────────────────────────────────
function NewProjectModal({ newProject, setNewProject, engineers, saving, onCreate, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4"><Plus size={16} className="text-indigo-400" /> Nuevo Proyecto CIEA</h3>
                <div className="space-y-3">
                    <div><label className="text-[11px] text-slate-400 mb-1 block">Nombre *</label><input value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Mantenimiento 2026" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white" /></div>
                    <div><label className="text-[11px] text-slate-400 mb-1 block">Descripción</label><textarea value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white resize-none" /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[11px] text-slate-400 mb-1 block">Responsable (Ing. Líder)</label>
                            <select value={newProject.responsible_person_id} onChange={e => setNewProject(p => ({ ...p, responsible_person_id: e.target.value ? Number(e.target.value) : '' }))} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white">
                                <option value="">— Seleccionar —</option>
                                {engineers.map(e => <option key={e.person_id} value={e.person_id}>{e.fullName}</option>)}
                            </select></div>
                        <div><label className="text-[11px] text-slate-400 mb-1 block">Apoyo Centro Industrial</label><input value={newProject.support_person_name} onChange={e => setNewProject(p => ({ ...p, support_person_name: e.target.value }))} placeholder="Nombre persona apoyo" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white" /></div>
                    </div>
                    <button onClick={onCreate} disabled={saving || !newProject.name.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition-colors mt-2 disabled:opacity-50">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Crear Proyecto
                    </button>
                </div>
            </div>
        </div>
    );
}
