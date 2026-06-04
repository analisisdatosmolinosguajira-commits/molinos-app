import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    ChevronLeft, ChevronRight, UserPlus, UserMinus, AlertTriangle,
    CheckCircle2, Clock, Users, FileText, Download, X, Loader2,
    CalendarDays, Shield, Eye, Search
} from 'lucide-react';
import { CIEAPlanService, getMonday, getCalendarWeeks, toDateStr, parseLocal } from '../../services/cieaPlanService';

export default function WeeklyPlannerTab({ project, activities, staff, onReloadActivities, saving, setSaving }) {
    // Current week navigation
    const today = new Date();
    const currentMonday = getMonday(today);
    const [selectedWeek, setSelectedWeek] = useState(currentMonday);
    const [assignments, setAssignments] = useState([]);
    const [occupation, setOccupation] = useState([]);
    const [loadingWeek, setLoadingWeek] = useState(false);
    const [showReport, setShowReport] = useState(null); // 'weekly' | 'total' | null
    const [reportData, setReportData] = useState(null);
    const [assigningTo, setAssigningTo] = useState(null); // activityId being assigned to
    const [searchAssign, setSearchAssign] = useState('');

    // Generate weeks for nav (12 weeks before and after current)
    const weeks = useMemo(() => {
        const start = parseLocal(currentMonday);
        start.setDate(start.getDate() - 12 * 7);
        const end = parseLocal(currentMonday);
        end.setDate(end.getDate() + 12 * 7);
        return getCalendarWeeks(toDateStr(start), toDateStr(end));
    }, [currentMonday]);

    const selectedWeekInfo = useMemo(() =>
        weeks.find(w => w.weekStart === selectedWeek) || { label: selectedWeek, weekNumber: '?' }
        , [weeks, selectedWeek]);

    const isPastWeek = selectedWeek < currentMonday;
    const isCurrentWeek = selectedWeek === currentMonday;

    // Load week data
    useEffect(() => { loadWeekData(); }, [selectedWeek]);

    const loadWeekData = async () => {
        setLoadingWeek(true);
        try {
            const [assignData, occData] = await Promise.all([
                CIEAPlanService.getAssignmentsForWeek(selectedWeek),
                CIEAPlanService.getPersonOccupationForWeek(selectedWeek)
            ]);
            setAssignments(assignData);
            setOccupation(occData);
        } catch (e) { console.error(e); }
        setLoadingWeek(false);
    };

    // Computed data
    const unassigned = useMemo(() => occupation.filter(p => !p.isAssigned), [occupation]);
    const assigned = useMemo(() => occupation.filter(p => p.isAssigned), [occupation]);

    const assignmentsByActivity = useMemo(() => {
        const map = {};
        assignments.forEach(a => {
            if (!map[a.activity_id]) map[a.activity_id] = [];
            map[a.activity_id].push(a);
        });
        return map;
    }, [assignments]);

    // Navigate weeks
    const navigateWeek = (delta) => {
        const d = parseLocal(selectedWeek);
        d.setDate(d.getDate() + delta * 7);
        setSelectedWeek(toDateStr(d));
    };

    // Assign person
    const handleAssign = async (personId, activityId) => {
        setSaving(true);
        try {
            await CIEAPlanService.assignPersonToActivity(activityId, personId, selectedWeek);
            await loadWeekData();
            setAssigningTo(null);
        } catch (e) {
            alert(e.message || 'Error al asignar');
            console.error(e);
        }
        setSaving(false);
    };

    // Remove assignment
    const handleRemove = async (assignmentId) => {
        setSaving(true);
        try {
            await CIEAPlanService.removeAssignment(assignmentId);
            await loadWeekData();
        } catch (e) { console.error(e); }
        setSaving(false);
    };

    // Reports
    const handleWeeklyReport = async () => {
        try {
            const data = await CIEAPlanService.getWeeklyReport(project.ciea_project_id, selectedWeek);
            setReportData({ type: 'weekly', data, week: selectedWeekInfo });
            setShowReport('weekly');
        } catch (e) { console.error(e); }
    };

    const handleTotalReport = async () => {
        try {
            const data = await CIEAPlanService.getTotalReport(project.ciea_project_id);
            setReportData({ type: 'total', data });
            setShowReport('total');
        } catch (e) { console.error(e); }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Week Navigator */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigateWeek(-1)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><ChevronLeft size={18} /></button>
                    <div className="text-center">
                        <p className="text-sm font-bold text-white flex items-center gap-2 justify-center">
                            <CalendarDays size={16} className="text-indigo-400" />
                            Semana {selectedWeekInfo.weekNumber}
                            {isCurrentWeek && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Actual</span>}
                            {isPastWeek && <span className="text-[10px] bg-slate-600/50 text-slate-400 px-2 py-0.5 rounded-full">Histórico</span>}
                        </p>
                        <p className="text-[11px] text-slate-400">{selectedWeekInfo.label}</p>
                    </div>
                    <button onClick={() => navigateWeek(1)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><ChevronRight size={18} /></button>
                </div>
                {/* Quick week jump */}
                <div className="flex items-center justify-center gap-1 mt-3 overflow-x-auto py-1">
                    {weeks.filter((_, i) => i % 2 === 0).map(w => (
                        <button key={w.weekStart} onClick={() => setSelectedWeek(w.weekStart)}
                            className={`px-2 py-1 text-[9px] rounded-md transition-all whitespace-nowrap ${w.weekStart === selectedWeek ? 'bg-indigo-600 text-white' : w.weekStart === currentMonday ? 'bg-emerald-600/30 text-emerald-400' : 'text-slate-500 hover:text-white hover:bg-slate-700'}`}>
                            S{w.weekNumber}
                        </button>
                    ))}
                </div>
            </div>

            {/* Alerts Banner */}
            {unassigned.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-start gap-3">
                    <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-xs font-medium text-amber-300">
                            {unassigned.length} persona{unassigned.length > 1 ? 's' : ''} operativa{unassigned.length > 1 ? 's' : ''} sin actividad esta semana
                        </p>
                        <p className="text-[10px] text-amber-400/70 mt-0.5">
                            {unassigned.slice(0, 5).map(p => p.fullName).join(', ')}{unassigned.length > 5 ? ` y ${unassigned.length - 5} más` : ''}
                        </p>
                    </div>
                </div>
            )}

            {loadingWeek ? (
                <div className="flex items-center justify-center py-12"><Loader2 size={24} className="text-indigo-400 animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left: Activities with their assignments */}
                    <div className="lg:col-span-2 space-y-3">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Actividades — Semana {selectedWeekInfo.weekNumber}</h3>
                            <div className="flex gap-2">
                                <button onClick={handleWeeklyReport} className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] rounded-lg transition-colors"><FileText size={12} /> Reporte Semanal</button>
                                <button onClick={handleTotalReport} className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] rounded-lg transition-colors"><Download size={12} /> Reporte Total</button>
                            </div>
                        </div>

                        {activities.filter(a => a.status !== 'CANCELADA').map(act => {
                            const actAssignments = assignmentsByActivity[act.ciea_activity_id] || [];
                            const isAssigning = assigningTo === act.ciea_activity_id;

                            return (
                                <div key={act.ciea_activity_id} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-medium text-white">{act.name}</h4>
                                            <StatusBadge status={act.status} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${act.progress}%`, background: act.progress === 100 ? '#10b981' : '#6366f1' }} />
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-mono">{act.progress}%</span>
                                        </div>
                                    </div>

                                    {/* Assigned people for this activity this week */}
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {actAssignments.map(a => (
                                            <div key={a.assignment_id} className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-2.5 py-1.5 group">
                                                <div className="w-5 h-5 rounded-full bg-indigo-500/30 flex items-center justify-center text-[9px] text-indigo-300 font-bold">
                                                    {a.personName.charAt(0)}
                                                </div>
                                                <span className="text-[11px] text-indigo-200">{a.personName}</span>
                                                <span className="text-[9px] text-indigo-400/60">{a.personRole}</span>
                                                {!isPastWeek && (
                                                    <button onClick={() => handleRemove(a.assignment_id)}
                                                        className="ml-1 p-0.5 text-indigo-400/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><X size={10} /></button>
                                                )}
                                            </div>
                                        ))}
                                        {actAssignments.length === 0 && <span className="text-[10px] text-slate-500 italic">Sin personal asignado</span>}
                                    </div>

                                    {/* Assign button */}
                                    {!isPastWeek && (
                                        isAssigning ? (
                                            <div className="mt-2 bg-slate-900/50 rounded-lg p-3 border border-indigo-500/20">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-[11px] text-indigo-300 font-medium">Seleccionar persona:</p>
                                                    <button onClick={() => { setAssigningTo(null); setSearchAssign(''); }} className="text-slate-400 hover:text-white"><X size={12} /></button>
                                                </div>
                                                <div className="relative mb-2">
                                                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                                    <input
                                                        value={searchAssign}
                                                        onChange={e => setSearchAssign(e.target.value)}
                                                        placeholder="Buscar por nombre o rol..."
                                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
                                                        autoFocus
                                                    />
                                                </div>
                                                {(() => {
                                                    const q = searchAssign.toLowerCase().trim();
                                                    const filtered = q ? unassigned.filter(p => p.fullName.toLowerCase().includes(q) || p.roleName.toLowerCase().includes(q)) : unassigned;
                                                    return (
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                                                            {filtered.map(p => (
                                                                <button key={p.person_id} onClick={() => { handleAssign(p.person_id, act.ciea_activity_id); setSearchAssign(''); }}
                                                                    className="flex items-center gap-2 px-2.5 py-2 bg-slate-800 hover:bg-indigo-600/30 rounded-lg text-left transition-colors border border-slate-700 hover:border-indigo-500/30">
                                                                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white font-bold">{p.first_name.charAt(0)}</div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-[11px] text-white truncate">{p.fullName}</p>
                                                                        <p className="text-[9px] text-slate-500">{p.roleName}</p>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                            {filtered.length === 0 && <p className="col-span-3 text-[10px] text-slate-500 text-center py-2">{q ? 'Sin resultados' : 'Todo el personal tiene asignación'}</p>}
                                                        </div>
                                                    );
                                                })()}
                                                
                                            </div>
                                        ) : (
                                            <button onClick={() => setAssigningTo(act.ciea_activity_id)}
                                                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors mt-1">
                                                <UserPlus size={12} /> Asignar persona
                                            </button>
                                        )
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Right: Staff occupation panel */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Personal Operativo</h3>
                        {/* Summary */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                                <p className="text-lg font-bold text-emerald-400">{assigned.length}</p>
                                <p className="text-[9px] text-emerald-400/70">Asignados</p>
                            </div>
                            <div className={`border rounded-xl p-3 text-center ${unassigned.length > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-800/50 border-slate-700/50'}`}>
                                <p className={`text-lg font-bold ${unassigned.length > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{unassigned.length}</p>
                                <p className={`text-[9px] ${unassigned.length > 0 ? 'text-amber-400/70' : 'text-slate-500'}`}>Sin actividad</p>
                            </div>
                        </div>

                        {/* Staff list */}
                        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl overflow-hidden">
                            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                                {occupation.map(p => (
                                    <div key={p.person_id} className={`flex items-center gap-2 px-3 py-2 border-b border-slate-800/50 last:border-0 ${p.isAssigned ? '' : 'bg-amber-500/5'}`}>
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${p.isAssigned ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] text-white truncate">{p.fullName}</p>
                                            <p className="text-[9px] text-slate-500">{p.roleName}</p>
                                        </div>
                                        {p.isAssigned ? (
                                            <span className="text-[9px] text-emerald-400/70 truncate max-w-[80px]">{p.assignedActivity}</span>
                                        ) : (
                                            <span className="text-[9px] text-amber-400/70">Libre</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {showReport && reportData && (
                <ReportModal reportData={reportData} onClose={() => { setShowReport(null); setReportData(null); }} project={project} />
            )}
        </div>
    );
}

function StatusBadge({ status }) {
    const config = {
        PENDIENTE: { color: 'text-slate-400 bg-slate-700/50', label: 'Pendiente' },
        EN_EJECUCION: { color: 'text-amber-400 bg-amber-500/20', label: 'En ejecución' },
        COMPLETADA: { color: 'text-emerald-400 bg-emerald-500/20', label: 'Completada' },
        CANCELADA: { color: 'text-red-400 bg-red-500/20', label: 'Cancelada' }
    };
    const c = config[status] || config.PENDIENTE;
    return <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${c.color}`}>{c.label}</span>;
}

function ReportModal({ reportData, onClose, project }) {
    const { type, data, week } = reportData;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                    <div>
                        <h3 className="text-sm font-bold text-white">{type === 'weekly' ? `Reporte Semanal — Semana ${week?.weekNumber}` : 'Reporte Totalizado'}</h3>
                        <p className="text-[11px] text-slate-400">{project.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white"><X size={16} /></button>
                </div>
                <div className="overflow-y-auto max-h-[70vh] p-5">
                    {type === 'weekly' ? (
                        <table className="w-full text-xs">
                            <thead><tr className="border-b border-slate-700">
                                <th className="text-left py-2 text-slate-400 font-medium">Actividad</th>
                                <th className="text-left py-2 text-slate-400 font-medium">Estado</th>
                                <th className="text-center py-2 text-slate-400 font-medium">Avance</th>
                                <th className="text-center py-2 text-slate-400 font-medium">Subact.</th>
                                <th className="text-left py-2 text-slate-400 font-medium">Personal</th>
                            </tr></thead>
                            <tbody>
                                {data.map((row, i) => (
                                    <tr key={i} className="border-b border-slate-800/50">
                                        <td className="py-2 text-white">{row.activityName}</td>
                                        <td className="py-2"><StatusBadge status={row.status} /></td>
                                        <td className="py-2 text-center">
                                            <span className={`font-mono ${row.progress === 100 ? 'text-emerald-400' : 'text-indigo-400'}`}>{row.progress}%</span>
                                        </td>
                                        <td className="py-2 text-center text-slate-400">{row.completedSubs}/{row.totalSubs}</td>
                                        <td className="py-2 text-slate-300">{row.personnel.map(p => p.name).join(', ') || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-3">
                                <StatCard label="Avance Global" value={`${data.totalProgress}%`} color="indigo" />
                                <StatCard label="Actividades" value={`${data.completedActivities}/${data.totalActivities}`} color="emerald" />
                                <StatCard label="Semanas" value={data.totalWeeks} color="blue" />
                                <StatCard label="Responsable" value={data.project.responsibleName} color="violet" isText />
                            </div>
                            {data.activities.map((act, i) => (
                                <div key={i} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-medium text-white">{act.name}</h4>
                                        <span className="text-xs font-mono text-indigo-400">{act.progress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-700 rounded-full mb-3">
                                        <div className="h-full rounded-full" style={{ width: `${act.progress}%`, background: act.progress === 100 ? '#10b981' : '#6366f1' }} />
                                    </div>
                                    {Object.keys(act.weeklyAssignments).length > 0 && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-slate-500 mb-1">Historial de asignaciones:</p>
                                            {Object.entries(act.weeklyAssignments).sort(([a], [b]) => a.localeCompare(b)).map(([wk, people]) => (
                                                <div key={wk} className="flex items-center gap-2 text-[10px]">
                                                    <span className="text-slate-500 w-20">{wk}</span>
                                                    <span className="text-slate-300">{people.map(p => p.name).join(', ')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, color, isText }) {
    const colorMap = { indigo: 'text-indigo-400', emerald: 'text-emerald-400', blue: 'text-blue-400', violet: 'text-violet-400' };
    return (
        <div className="bg-slate-900/50 rounded-xl p-3 text-center border border-slate-700/50">
            <p className={`${isText ? 'text-xs' : 'text-lg'} font-bold ${colorMap[color]}`}>{value}</p>
            <p className="text-[9px] text-slate-500">{label}</p>
        </div>
    );
}
