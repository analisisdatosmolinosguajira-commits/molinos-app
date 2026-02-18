
import React, { useState, useEffect } from 'react';
import { X, Search, Calendar, MapPin, Users, Activity, CheckCircle2 } from 'lucide-react';
import { ActivityService } from '../../services/activities';

const AssignActivityModal = ({ isOpen, onClose, onAssign }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadActivities();
            setSelectedId(null);
            setSearchTerm('');
        }
    }, [isOpen]);

    const loadActivities = async () => {
        setLoading(true);
        try {
            // Fetch all activities
            const allActivities = await ActivityService.getPlannedActivities();
            // Filter out those already linked to a movement
            // Checking related_movement which comes from the service
            const available = allActivities.filter(a => !a.related_movement?.movement_id && a.status !== 'CANCELADA');
            setActivities(available);
        } catch (error) {
            console.error("Error loading activities:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredActivities = activities.filter(activity => {
        const searchLower = searchTerm.toLowerCase();
        return (
            activity.title?.toLowerCase().includes(searchLower) ||
            activity.communityName?.toLowerCase().includes(searchLower) ||
            activity.activityTypeName?.toLowerCase().includes(searchLower)
        );
    });

    const handleConfirm = () => {
        if (selectedId) {
            onAssign(selectedId);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Vincular Actividad Planificada</h2>
                        <p className="text-slate-500 text-sm mt-1">Selecciona una actividad para asociarla a este viaje</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por título, comunidad o tipo..."
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/30">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <RefreshCwIcon className="animate-spin mb-3" size={24} />
                            <p>Cargando actividades...</p>
                        </div>
                    ) : filteredActivities.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Activity size={48} className="mx-auto mb-3 opacity-20" />
                            <p>No se encontraron actividades disponibles.</p>
                        </div>
                    ) : (
                        filteredActivities.map(activity => (
                            <div
                                key={activity.activity_id}
                                onClick={() => setSelectedId(activity.activity_id)}
                                className={`
                                    relative p-4 rounded-xl border cursor-pointer transition-all duration-200 group
                                    ${selectedId === activity.activity_id
                                        ? 'bg-indigo-50 border-indigo-500 shadow-md ring-1 ring-indigo-500'
                                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                                    }
                                `}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide
                                            ${activity.status === 'PLANIFICADA' ? 'bg-blue-100 text-blue-700' :
                                                activity.status === 'ASIGNADA' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-slate-100 text-slate-600'}
                                        `}>
                                            {activity.status}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">
                                            #{activity.activity_id}
                                        </span>
                                    </div>
                                    {selectedId === activity.activity_id && (
                                        <div className="bg-indigo-600 text-white p-1 rounded-full shadow-sm animate-in zoom-in duration-200">
                                            <CheckCircle2 size={14} />
                                        </div>
                                    )}
                                </div>

                                <h3 className="font-bold text-slate-800 mb-2 group-hover:text-indigo-700 transition-colors">
                                    {activity.title}
                                </h3>

                                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-slate-600">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={14} className="text-slate-400" />
                                        <span>Semana {activity.planned_start_week}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <MapPin size={14} className="text-slate-400" />
                                        <span className="truncate">{activity.communityName || 'Sin comunidad'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 col-span-2">
                                        <Users size={14} className="text-slate-400" />
                                        <span className="truncate">{activity.crewName || 'Sin cuadrilla asignada'}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 bg-white rounded-b-2xl flex justify-end gap-3 z-10">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedId}
                        className={`
                            px-6 py-2.5 rounded-xl font-bold text-white transition-all shadow-lg
                            ${selectedId
                                ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/25 active:scale-95'
                                : 'bg-slate-300 cursor-not-allowed shadow-none'}
                        `}
                    >
                        Vincular Actividad
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper icon component since I used it above but didn't import/define it standardly as lucid-react export in array
const RefreshCwIcon = ({ className, size }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M8 16H3v5" />
    </svg>
);

export default AssignActivityModal;
