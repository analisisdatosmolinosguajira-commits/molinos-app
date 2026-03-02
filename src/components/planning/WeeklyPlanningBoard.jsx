import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Users, CheckCircle, AlertCircle, Plus, Link, FileText, Loader2 } from 'lucide-react';
import { ActivityService } from '../../services/activities';
import { generateWeeklyReport } from '../../utils/WeeklyReportGenerator';
import { generateDetailedWeeklyReport } from '../../utils/DetailedWeeklyReportGenerator';

const WeeklyPlanningBoard = ({
    activities,
    currentDate,
    onDateChange,
    onAddActivity,
    onEditActivity,
    onLinkActivity
}) => {
    const [unassignedCrews, setUnassignedCrews] = useState([]);
    const [loadingUnassigned, setLoadingUnassigned] = useState(false);
    const [draggedCrew, setDraggedCrew] = useState(null);
    const [generatingDetailed, setGeneratingDetailed] = useState(false);

    // Calculate start and end of the week
    const getWeekRange = (date) => {
        const curr = new Date(date);
        const day = curr.getDay();
        const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday

        const start = new Date(curr.setDate(diff));
        const end = new Date(curr.setDate(start.getDate() + 6));

        // Reset hours
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    };

    const { start: weekStart, end: weekEnd } = getWeekRange(currentDate);

    const handleDownloadReport = () => {
        generateWeeklyReport(activities, weekStart, weekEnd);
    };

    const handleDownloadDetailedReport = async () => {
        if (generatingDetailed) return;
        setGeneratingDetailed(true);
        try {
            await generateDetailedWeeklyReport(activities, weekStart, weekEnd);
        } catch (error) {
            console.error("Error generating detailed report:", error);
            alert("Hubo un error al generar el informe detallado.");
        } finally {
            setGeneratingDetailed(false);
        }
    };

    useEffect(() => {
        loadUnassignedCrews();
    }, [currentDate, activities]);

    const loadUnassignedCrews = async () => {
        try {
            setLoadingUnassigned(true);
            const startStr = weekStart.toISOString().split('T')[0];
            const endStr = weekEnd.toISOString().split('T')[0];
            const data = await ActivityService.getUnassignedCrews(startStr, endStr);
            setUnassignedCrews(data);
        } catch (error) {
            console.error('Error loading unassigned crews:', error);
        } finally {
            setLoadingUnassigned(false);
        }
    };

    // Helper to get dates for the columns
    const getDaysOfWeek = () => {
        const days = [];
        const current = new Date(weekStart);
        for (let i = 0; i < 7; i++) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return days;
    };

    const daysOfWeek = getDaysOfWeek();

    // Helper to format date for filtering
    const formatDateKey = (date) => {
        return date.toISOString().split('T')[0];
    };

    const handleDragStart = (e, crew) => {
        setDraggedCrew(crew);
        e.dataTransfer.setData('crewId', crew.crew_id);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e, date) => {
        e.preventDefault();
        const crewId = e.dataTransfer.getData('crewId');

        if (crewId && draggedCrew && draggedCrew.crew_id === parseInt(crewId)) {
            onAddActivity({
                assigned_crew_id: draggedCrew.crew_id,
                planned_start_week: formatDateKey(date),
                planned_end_week: formatDateKey(date)
            });
        }
        setDraggedCrew(null);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-220px)]">
            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Calendar size={20} className="text-blue-600" />
                        Planificación Semanal
                    </h3>
                    <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full capitalize">
                        {weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} - {weekEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleDownloadReport}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                        title="Resumen General PDF"
                    >
                        <FileText size={18} className="text-red-500" />
                        Resumen Ejecutivo
                    </button>
                    <button
                        onClick={handleDownloadDetailedReport}
                        disabled={generatingDetailed}
                        className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                        title="Informe PDF detallado por actividad"
                    >
                        {generatingDetailed ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} className="text-blue-300" />}
                        {generatingDetailed ? 'Generando...' : 'Informe Detallado'}
                    </button>
                    <div className="h-6 w-px bg-slate-200 mx-2"></div>
                    <button
                        onClick={() => onDateChange(new Date())}
                        className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        Hoy
                    </button>
                    <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-0.5">
                        <button
                            onClick={() => {
                                const newDate = new Date(currentDate);
                                newDate.setDate(newDate.getDate() - 7);
                                onDateChange(newDate);
                            }}
                            className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-600 transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
                        <button
                            onClick={() => {
                                const newDate = new Date(currentDate);
                                newDate.setDate(newDate.getDate() + 7);
                                onDateChange(newDate);
                            }}
                            className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-600 transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Sidebar: Unassigned Crews */}
                <div className="w-1/4 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                            <Users size={18} className="text-slate-500" />
                            Cuadrillas Libres
                        </h4>
                        <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                            {unassignedCrews.length}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
                        {loadingUnassigned ? (
                            <div className="flex justify-center p-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                            </div>
                        ) : unassignedCrews.length === 0 ? (
                            <div className="text-center p-8 text-slate-400">
                                <CheckCircle size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-xs">Todo el personal está asignado esta semana</p>
                            </div>
                        ) : (
                            unassignedCrews.map(crew => (
                                <div
                                    key={crew.crew_id}
                                    draggable="true"
                                    onDragStart={(e) => handleDragStart(e, crew)}
                                    className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-grab active:cursor-grabbing transition-all group"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h5 className="font-bold text-slate-800 text-sm">{crew.name}</h5>
                                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                <Users size={12} />
                                                {crew.leaderName}
                                            </p>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="bg-blue-50 text-blue-600 p-1 rounded">
                                                <Plus size={14} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}

                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700">
                            <p className="flex items-start gap-2">
                                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                <span>Arrastra una cuadrilla al calendario para asignar una actividad.</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main: Weekly Calendar Grid */}
                <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                        {daysOfWeek.map(day => {
                            const isToday = day.toDateString() === new Date().toDateString();
                            return (
                                <div key={day.toISOString()} className={`p-3 text-center border-r border-slate-200 last:border-r-0 ${isToday ? 'bg-blue-50/50' : ''
                                    }`}>
                                    <span className={`text-xs uppercase font-bold block mb-1 ${isToday ? 'text-blue-600' : 'text-slate-500'
                                        }`}>
                                        {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                                    </span>
                                    <span className={`text-lg font-semibold ${isToday ? 'text-blue-700' : 'text-slate-800'
                                        }`}>
                                        {day.getDate()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="grid grid-cols-7 min-h-full">
                            {daysOfWeek.map(day => {
                                const dayKey = formatDateKey(day);
                                const dayActivities = activities.filter(a => {
                                    const start = a.planned_start_week;
                                    const end = a.planned_end_week || start;
                                    return dayKey >= start && dayKey <= end;
                                });
                                const isToday = day.toDateString() === new Date().toDateString();

                                return (
                                    <div
                                        key={day.toISOString()}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, day)}
                                        className={`border-r border-slate-100 last:border-r-0 p-2 space-y-2 min-h-[300px] transition-colors relative group/day ${isToday ? 'bg-blue-50/10' : ''
                                            } hover:bg-slate-50`}
                                    >
                                        {/* Add Button Area (Visible on Hover) */}
                                        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover/day:opacity-100 flex items-center justify-center bg-slate-50/50 transition-opacity z-0">
                                            <span className="text-xs text-slate-400 font-medium">+ Añadir</span>
                                        </div>

                                        <div className="relative z-10 space-y-2">
                                            {dayActivities.map(act => (
                                                <div
                                                    key={act.activity_id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEditActivity(act);
                                                    }}
                                                    className={`p-2 rounded-lg border text-xs cursor-pointer hover:shadow-md transition-shadow bg-white ${act.status === 'COMPLETADA' ? 'border-green-200 text-green-800 bg-green-50' :
                                                        act.status === 'EN_EJECUCION' ? 'border-indigo-200 text-indigo-800 bg-indigo-50' :
                                                            act.assigned_crew_id ? 'border-blue-200 text-blue-800 bg-blue-50' :
                                                                'border-l-4 border-l-yellow-400 border-slate-200 text-slate-700'
                                                        }`}
                                                >
                                                    <div className="font-bold truncate" title={act.title}>{act.title}</div>
                                                    <div className="mt-1 flex items-center justify-between text-[10px] opacity-80">
                                                        <span className="truncate max-w-[70px]">{act.crewName || 'Sin cuadrilla'}</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onLinkActivity(act);
                                                            }}
                                                            className="p-1 hover:bg-black/10 rounded transition-colors"
                                                            title="Vincular"
                                                        >
                                                            <Link size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Invisible text overlay catch click area */}
                                            {dayActivities.length === 0 && (
                                                <div
                                                    className="absolute inset-0 cursor-pointer"
                                                    onClick={() => onAddActivity({
                                                        planned_start_week: dayKey,
                                                        planned_end_week: dayKey
                                                    })}
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeeklyPlanningBoard;
