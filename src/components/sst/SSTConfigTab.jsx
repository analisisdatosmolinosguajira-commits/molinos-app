import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, ShieldCheck } from 'lucide-react';
import { SSTService } from '../../services/sst';

const BODY_ZONES = [
    { value: 'HEAD', label: '🪖 Cabeza' },
    { value: 'EYES', label: '🥽 Ojos' },
    { value: 'EARS', label: '🎧 Oídos' },
    { value: 'FACE', label: '😷 Rostro' },
    { value: 'TORSO', label: '🦺 Torso' },
    { value: 'HANDS', label: '🧤 Manos' },
    { value: 'LEGS', label: '👖 Piernas' },
    { value: 'FEET', label: '🥾 Pies' },
    { value: 'FULL_BODY', label: '🧑 Cuerpo Completo' },
];

export default function SSTConfigTab() {
    const [roles, setRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState(null);
    const [requirements, setRequirements] = useState([]);
    const [eppList, setEppList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // New requirement form
    const [newReq, setNewReq] = useState({ safety_id: '', body_zone: 'HEAD', renewal_months: 6 });

    useEffect(() => {
        (async () => {
            try {
                const [rolesData, eppData] = await Promise.all([
                    SSTService.getOperationalRoles(),
                    SSTService.getSafetyEquipmentList(),
                ]);
                setRoles(rolesData);
                setEppList(eppData);
            } catch (err) {
                console.error('Error loading config data:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const loadRequirements = async (roleId) => {
        try {
            const data = await SSTService.getRoleRequirements(roleId);
            setRequirements(data);
        } catch (err) {
            console.error('Error loading requirements:', err);
        }
    };

    const selectRole = (role) => {
        setSelectedRole(role);
        loadRequirements(role.role_id);
    };

    const addRequirement = async () => {
        if (!newReq.safety_id || !selectedRole) return;
        try {
            setSaving(true);
            await SSTService.addRoleRequirement(
                selectedRole.role_id,
                parseInt(newReq.safety_id),
                newReq.body_zone,
                parseInt(newReq.renewal_months)
            );
            await loadRequirements(selectedRole.role_id);
            setNewReq({ safety_id: '', body_zone: 'HEAD', renewal_months: 6 });
        } catch (err) {
            console.error('Error adding requirement:', err);
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const removeRequirement = async (id) => {
        if (!confirm('¿Eliminar este requisito?')) return;
        try {
            await SSTService.deleteRoleRequirement(id);
            await loadRequirements(selectedRole.role_id);
        } catch (err) {
            console.error('Error removing requirement:', err);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-slate-400">Cargando configuración...</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Roles List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Settings size={18} className="text-slate-400" />
                    Roles del Proyecto
                </h3>
                <div className="space-y-2">
                    {roles.map(role => (
                        <button
                            key={role.role_id}
                            onClick={() => selectRole(role)}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all
                                ${selectedRole?.role_id === role.role_id
                                    ? 'bg-brand-600 text-white shadow-md'
                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                        >
                            {role.name}
                        </button>
                    ))}
                    {roles.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-8">No hay roles operativos</p>
                    )}
                </div>
            </div>

            {/* Requirements for selected role */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                {selectedRole ? (
                    <>
                        <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                            <ShieldCheck size={18} className="text-brand-600" />
                            EPPs Requeridos: {selectedRole.name}
                        </h3>
                        <p className="text-xs text-slate-400 mb-4">
                            Configure los EPP que este rol debe tener para cumplir con SST
                        </p>

                        {/* Existing requirements */}
                        <div className="space-y-2 mb-6">
                            {requirements.map(req => (
                                <div key={req.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{BODY_ZONES.find(z => z.value === req.body_zone)?.label?.split(' ')[0] || '📦'}</span>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">{req.safety_equipment?.name || 'EPP'}</p>
                                            <p className="text-xs text-slate-400">
                                                {BODY_ZONES.find(z => z.value === req.body_zone)?.label} · Cada {req.renewal_months} meses
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeRequirement(req.id)}
                                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            {requirements.length === 0 && (
                                <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                    <p className="text-slate-400 text-sm">No hay EPPs configurados para este rol</p>
                                </div>
                            )}
                        </div>

                        {/* Add new */}
                        <div className="bg-brand-50 rounded-xl p-4 border border-brand-100">
                            <p className="text-xs font-bold text-brand-700 uppercase mb-3">Agregar EPP Requerido</p>
                            <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-4">
                                    <select
                                        value={newReq.safety_id}
                                        onChange={e => setNewReq({ ...newReq, safety_id: e.target.value })}
                                        className="w-full px-2 py-2 border border-brand-200 rounded-lg text-xs bg-white"
                                    >
                                        <option value="">EPP...</option>
                                        {eppList.map(epp => (
                                            <option key={epp.safety_id} value={epp.safety_id}>{epp.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-3">
                                    <select
                                        value={newReq.body_zone}
                                        onChange={e => setNewReq({ ...newReq, body_zone: e.target.value })}
                                        className="w-full px-2 py-2 border border-brand-200 rounded-lg text-xs bg-white"
                                    >
                                        {BODY_ZONES.map(z => (
                                            <option key={z.value} value={z.value}>{z.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-3">
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            min="1"
                                            max="24"
                                            value={newReq.renewal_months}
                                            onChange={e => setNewReq({ ...newReq, renewal_months: e.target.value })}
                                            className="w-full px-2 py-2 border border-brand-200 rounded-lg text-xs text-center"
                                        />
                                        <span className="text-xs text-brand-600 whitespace-nowrap">meses</span>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <button
                                        onClick={addRequirement}
                                        disabled={saving || !newReq.safety_id}
                                        className="w-full py-2 bg-brand-600 text-white text-xs font-bold rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-1"
                                    >
                                        <Plus size={14} /> Agregar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-16">
                        <Settings size={48} className="mx-auto mb-3 text-slate-200" />
                        <p className="text-slate-400 font-medium">Seleccione un rol para configurar sus EPPs</p>
                    </div>
                )}
            </div>
        </div>
    );
}
