import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Calendar, MapPin, Truck, Users, X, CheckCircle, XCircle, Clock, AlertTriangle,
    FileText, Trash2, Activity, Navigation, Plus, Save, Map as MapIcon
} from 'lucide-react';
import { VisitService } from '../../services/visits';
import { VehicleService } from '../../services/vehicles';
import JourneyActivitiesTab from './JourneyActivitiesTab';
import AssignActivityModal from '../../components/planning/AssignActivityModal';
import AddPersonModal from '../../components/planning/AddPersonModal';
import JourneyRoutesTab from './JourneyRoutesTab';
import StatusBadge from '../../components/ui/StatusBadge';

const JourneyDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [journey, setJourney] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('RESOURCES'); // RESOURCES, LOGS, CLOSURE

    // Modals State
    const [showVehicleModal, setShowVehicleModal] = useState(false);
    const [showLogModal, setShowLogModal] = useState(false);
    const [showAssignActivityModal, setShowAssignActivityModal] = useState(false);
    const [showAddPersonModal, setShowAddPersonModal] = useState(false);

    // Data for Modals
    const [availableVehicles, setAvailableVehicles] = useState([]);

    // Forms State
    const [logForm, setLogForm] = useState({ activity_type: 'SALIDA_CAMPO', description: '', incident_reported: false });
    const [closureForm, setClosureForm] = useState({ is_satisfactory: true, completion_notes: '', actual_end_date: new Date().toISOString().split('T')[0] });

    useEffect(() => {
        loadJourney();
    }, [id]);

    const loadJourney = async () => {
        setLoading(true);
        try {
            const data = await VisitService.getVisitById(id);
            setJourney(data);
            // Initialize closure form
            if (data) {
                setClosureForm(prev => ({
                    ...prev,
                    is_satisfactory: data.is_satisfactory !== false, // default true
                    completion_notes: data.completion_notes || '',
                    actual_end_date: data.actual_end_date || new Date().toISOString().split('T')[0]
                }));
            }
        } catch (error) {
            console.error("Error loading journey:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignVehicle = async (vehicleId) => {
        try {
            await VisitService.assignVehicleToMovement(journey.raw_id, vehicleId);
            setShowVehicleModal(false);
            loadJourney(); // Reload to show new vehicle
        } catch (error) {
            console.error("Error assigning vehicle:", error);
        }
    };

    const handleRemoveVehicle = async (assignmentId) => {
        if (!window.confirm("¿Desvincular vehículo?")) return;
        try {
            await VisitService.removeVehicleAssignment(assignmentId);
            loadJourney();
        } catch (error) {
            console.error("Error removing vehicle:", error);
        }
    };

    const handleAttendanceChange = async (personId, status) => {
        try {
            await VisitService.updateAttendance(personId, status);
            // Optimistic update
            setJourney(prev => ({
                ...prev,
                people: prev.people.map(p => p.movement_person_id === personId ? { ...p, actual_attendance: status } : p)
            }));
        } catch (error) {
            console.error("Error updating attendance:", error);
            loadJourney(); // Revert on error
        }
    };

    const handleAddLog = async (e) => {
        e.preventDefault();
        try {
            await VisitService.addMovementLog(journey.raw_id, {
                ...logForm,
                log_date: new Date().toISOString()
            });
            setShowLogModal(false);
            setLogForm({ activity_type: 'SALIDA_CAMPO', description: '', incident_reported: false });
            loadJourney();
        } catch (error) {
            console.error("Error adding log:", error);
        }
    };

    const handleCloseJourney = async () => {
        if (!window.confirm("¿Finalizar viaje y cerrar registros?")) return;
        try {
            await VisitService.closeMovement(journey.raw_id, closureForm);
            navigate('/visitas');
        } catch (error) {
            console.error("Error closing journey:", error);
        }
    };

    const handleAssignActivity = async (activityId) => {
        try {
            await VisitService.linkMovementToActivity(journey.raw_id, activityId);
            setShowAssignActivityModal(false);
            loadJourney(); // Reload to show linked activity
        } catch (error) {
            console.error("Error linking activity:", error);
            alert("Hubo un error al vincular la actividad.");
        }
    };

    const handleSyncCrew = async () => {
        try {
            const result = await VisitService.syncCrewToAttendance(journey.raw_id);
            alert(`✅ ${result.message} `);
            loadJourney(); // Reload to show new attendance records
        } catch (error) {
            console.error("Error syncing crew:", error);
            alert("Hubo un error al sincronizar la cuadrilla.");
        }
    };

    const handleAddPerson = async (personId) => {
        try {
            await VisitService.addPersonToAttendance(journey.raw_id, personId);
            setShowAddPersonModal(false);
            loadJourney(); // Reload to show new person
        } catch (error) {
            console.error("Error adding person:", error);
            alert("Hubo un error al agregar la persona.");
        }
    };

    const loadVehiclesForModal = async () => {
        const vehicles = await VehicleService.getAllVehicles();
        // Filter out already assigned vehicles
        const assignedIds = journey.vehicle_assignments?.map(va => va.vehicle_id) || [];
        setAvailableVehicles(vehicles.filter(v => !assignedIds.includes(v.vehicle_id) && v.status === 'AVAILABLE'));
        setShowVehicleModal(true);
    };

    if (loading) return <div className="p-8 text-center">Cargando viaje...</div>;
    if (!journey) return <div className="p-8 text-center">No se encontró el viaje.</div>;

    return (
        <div className="bg-slate-50 min-h-screen">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 py-4">
                    <button onClick={() => navigate('/visitas')} className="flex items-center text-slate-500 hover:text-slate-800 mb-2 transition-colors">
                        <ArrowLeft size={16} className="mr-1" /> Volver al tablero
                    </button>
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <StatusBadge status={journey.status} />
                                <span className="text-xs font-mono text-slate-400">{journey.id}</span>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900">{journey.title}</h1>
                            <p className="text-slate-500 text-sm flex items-center gap-2 mt-1">
                                <MapPin size={14} /> {journey.location}
                            </p>
                        </div>
                        {journey.status !== 'COMPLETADO' && (
                            <button
                                onClick={() => setActiveTab('CLOSURE')}
                                className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                            >
                                Gestionar Cierre
                            </button>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-6 mt-6 border-b border-slate-100">
                        {[
                            { id: 'RESOURCES', label: 'Recursos y Personal', icon: Truck },
                            { id: 'ACTIVITIES', label: 'Actividades', icon: Activity },
                            { id: 'ROUTES', label: 'Rutas', icon: Navigation },
                            { id: 'LOGS', label: 'Bitácora de Campo', icon: FileText },
                            { id: 'CLOSURE', label: 'Cierre y Reporte', icon: CheckCircle }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`pb - 3 text - sm font - medium flex items - center gap - 2 border - b - 2 transition - all
                                    ${activeTab === tab.id
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }
`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-8">
                {/* RESOURCES TAB */}
                {activeTab === 'RESOURCES' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Vehicles Section */}
                        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Truck size={18} className="text-blue-500" /> Vehículos
                                </h3>
                                <button
                                    onClick={loadVehiclesForModal}
                                    className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 font-medium"
                                >
                                    + Asignar
                                </button>
                            </div>
                            {journey.vehicle_assignments?.length === 0 ? (
                                <p className="text-sm text-slate-400 italic">No hay vehículos asignados.</p>
                            ) : (
                                <div className="space-y-3">
                                    {journey.vehicle_assignments.map(va => (
                                        <div key={va.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <div>
                                                <p className="font-bold text-slate-700">{va.vehicle?.plate_number}</p>
                                                <p className="text-xs text-slate-500">{va.vehicle?.model}</p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveVehicle(va.id)}
                                                className="text-red-400 hover:text-red-600 p-1"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Personnel Section */}
                        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Users size={18} className="text-green-500" /> Control de Asistencia
                                </h3>
                                <div className="flex gap-2">
                                    {journey.activity && (
                                        <button
                                            onClick={handleSyncCrew}
                                            className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-lg hover:bg-purple-100 font-medium flex items-center gap-1"
                                            title="Sincronizar cuadrilla de la actividad vinculada"
                                        >
                                            <Users size={12} />
                                            Sincronizar
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowAddPersonModal(true)}
                                        className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-lg hover:bg-green-100 font-medium"
                                    >
                                        + Agregar
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {journey.people?.map(person => (
                                    <div key={person.movement_person_id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                                        <div>
                                            <p className="font-medium text-slate-700">{person.name}</p>
                                            <p className="text-xs text-slate-500">{person.role}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleAttendanceChange(person.movement_person_id, true)}
                                                className={`px - 3 py - 1 rounded - md text - xs font - bold transition - colors
                                                    ${person.actual_attendance === true
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-slate-100 text-slate-400 hover:bg-green-50'
                                                    }
`}
                                            >
                                                ASISTIÓ
                                            </button>
                                            <button
                                                onClick={() => handleAttendanceChange(person.movement_person_id, false)}
                                                className={`px - 3 py - 1 rounded - md text - xs font - bold transition - colors
                                                    ${person.actual_attendance === false
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-slate-100 text-slate-400 hover:bg-red-50'
                                                    }
`}
                                            >
                                                NO
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {/* ACTIVITIES TAB */}
                {activeTab === 'ACTIVITIES' && (
                    <JourneyActivitiesTab
                        activity={journey.activity}
                        onAssign={() => setShowAssignActivityModal(true)}
                    />
                )}

                {/* ROUTES TAB */}
                {activeTab === 'ROUTES' && (
                    <JourneyRoutesTab activity={journey.activity} />
                )}

                {/* LOGS TAB */}
                {activeTab === 'LOGS' && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <FileText size={18} className="text-orange-500" /> Bitácora de Viaje
                            </h3>
                            <button
                                onClick={() => setShowLogModal(true)}
                                className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
                            >
                                <Plus size={16} /> Nuevo Registro
                            </button>
                        </div>

                        <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 pl-6 py-2">
                            {journey.logs?.length === 0 && (
                                <p className="text-slate-400 text-sm italic">Sin registros en la bitácora.</p>
                            )}
                            {journey.logs?.map((log, idx) => (
                                <div key={log.log_id} className="relative">
                                    <div className={`absolute - left - [31px] top - 1 w - 4 h - 4 rounded - full border - 2 border - white shadow - sm
                                        ${log.incident_reported ? 'bg-red-500' : 'bg-slate-300'}
`} />
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className={`text - [10px] font - bold px - 2 py - 0.5 rounded - full uppercase mb - 1 inline - block
                                                ${log.activity_type === 'INCIDENCIA' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}
`}>
                                                {log.activity_type}
                                            </span>
                                            <p className="text-slate-800 mt-1">{log.description}</p>
                                        </div>
                                        <span className="text-xs text-slate-400 font-mono">
                                            {new Date(log.log_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {log.incident_reported && (
                                        <div className="mt-2 bg-red-50 p-3 rounded-lg border border-red-100 text-sm text-red-800">
                                            <AlertTriangle size={14} className="inline mr-1" />
                                            <strong>Incidencia:</strong> {log.incident_details || "Sin detalles"}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CLOSURE TAB */}
                {activeTab === 'CLOSURE' && (
                    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <CheckCircle size={20} className="text-slate-900" /> Cierre de Viaje
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Fecha Real de Retorno</label>
                                <input
                                    type="date"
                                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-slate-200 outline-none"
                                    value={closureForm.actual_end_date}
                                    onChange={e => setClosureForm({ ...closureForm, actual_end_date: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Evaluación del Viaje</label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setClosureForm({ ...closureForm, is_satisfactory: true })}
                                        className={`flex - 1 p - 3 rounded - lg border text - center transition - all ${closureForm.is_satisfactory
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500'
                                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                            } `}
                                    >
                                        Satisfactorio
                                    </button>
                                    <button
                                        onClick={() => setClosureForm({ ...closureForm, is_satisfactory: false })}
                                        className={`flex - 1 p - 3 rounded - lg border text - center transition - all ${!closureForm.is_satisfactory
                                            ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500'
                                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                            } `}
                                    >
                                        Con Problemas
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Notas Finales / Reporte</label>
                                <textarea
                                    className="w-full p-3 border border-slate-200 rounded-lg text-slate-700 h-32 focus:ring-2 focus:ring-slate-200 outline-none resize-none"
                                    placeholder="Resumen de objetivos alcanzados, problemas pendientes..."
                                    value={closureForm.completion_notes}
                                    onChange={e => setClosureForm({ ...closureForm, completion_notes: e.target.value })}
                                />
                            </div>

                            <button
                                onClick={handleCloseJourney}
                                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md"
                            >
                                Finalizar Viaje
                            </button>

                            {journey.status === 'COMPLETADO' && (
                                <p className="text-center text-sm text-green-600 mt-4 flex items-center justify-center gap-1">
                                    <CheckCircle size={14} /> Este viaje ya ha sido completado.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* VEHICLE MODAL */}
            {showVehicleModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Asignar Vehículo</h3>
                            <button onClick={() => setShowVehicleModal(false)}><X className="text-slate-400" /></button>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2 mb-4 custom-scrollbar">
                            {availableVehicles.length === 0 ? (
                                <p className="text-slate-500 text-center py-4">No hay vehículos disponibles.</p>
                            ) : availableVehicles.map(v => (
                                <button
                                    key={v.vehicle_id}
                                    onClick={() => handleAssignVehicle(v.vehicle_id)}
                                    className="w-full text-left p-3 rounded-xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all flex justify-between items-center group"
                                >
                                    <div>
                                        <p className="font-bold">{v.plate_number}</p>
                                        <p className="text-xs text-slate-500 group-hover:text-blue-500">{v.model} - {v.type}</p>
                                    </div>
                                    <Plus size={16} className="text-slate-300 group-hover:text-blue-500" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* LOG MODAL */}
            {showLogModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg">Nuevo Registro</h3>
                            <button onClick={() => setShowLogModal(false)}><X className="text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleAddLog} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Actividad</label>
                                <select
                                    className="w-full p-2 border border-slate-200 rounded-lg"
                                    value={logForm.activity_type}
                                    onChange={e => setLogForm({ ...logForm, activity_type: e.target.value })}
                                >
                                    <option value="SALIDA_CAMPO">Salida a Campo</option>
                                    <option value="PERNOCTA">Pernocta</option>
                                    <option value="RETORNO_CENTRO">Retorno a Centro</option>
                                    <option value="INCIDENCIA">Incidencia / Problema</option>
                                    <option value="OTRO">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                                <textarea
                                    required
                                    className="w-full p-2 border border-slate-200 rounded-lg h-24 resize-none"
                                    placeholder="Detalles del movimiento o evento..."
                                    value={logForm.description}
                                    onChange={e => setLogForm({ ...logForm, description: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="incident"
                                    checked={logForm.incident_reported}
                                    onChange={e => setLogForm({ ...logForm, incident_reported: e.target.checked })}
                                />
                                <label htmlFor="incident" className="text-sm text-slate-700">¿Reportar como incidencia?</label>
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 mt-2">
                                Guardar Registro
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ASSIGN ACTIVITY MODAL */}
            <AssignActivityModal
                isOpen={showAssignActivityModal}
                onClose={() => setShowAssignActivityModal(false)}
                onAssign={handleAssignActivity}
            />

            {/* ADD PERSON MODAL */}
            <AddPersonModal
                isOpen={showAddPersonModal}
                onClose={() => setShowAddPersonModal(false)}
                onAdd={handleAddPerson}
                movementId={journey.raw_id}
            />
        </div>
    );
};

export default JourneyDetail;
