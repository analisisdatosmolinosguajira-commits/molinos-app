import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import {
    User, Mail, Phone, Shield, Key, Save, Loader2, CheckCircle,
    AlertCircle, FileText, ClipboardList, MapPin, Camera, Eye, EyeOff,
    Edit3, X, Package, Bell, Activity, Wrench, Stethoscope, Users, Star
} from 'lucide-react';
import SupplyBoxPanel from '../../components/supplyBox/SupplyBoxPanel';
import ActivityExecutionModal from '../../components/planning/ActivityExecutionModal';
import { useNotifications } from '../../contexts/NotificationsContext';

export default function ProfilePage() {
    const { user, profile, person, displayName, initials, roleName, updatePassword, refreshProfile, secondaryRole } = useAuth();
    const { preferences, savePreferences } = useNotifications();
    const [activeTab, setActiveTab] = useState('info');
    const [assignments, setAssignments] = useState({ workOrders: [], activities: [], crews: [] });
    const [loadingAssignments, setLoadingAssignments] = useState(false);
    const [selectedActivityId, setSelectedActivityId] = useState(null);
    const [localPrefs, setLocalPrefs] = useState(null);
    const [savingPrefs, setSavingPrefs] = useState(false);
    const [prefsMessage, setPrefsMessage] = useState(null);

    // Password change
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPass, setShowNewPass] = useState(false);
    const [changingPass, setChangingPass] = useState(false);
    const [passMessage, setPassMessage] = useState(null);

    // Avatar
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // Edit mode
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({ phone: '', email: '', specialty: '' });
    const [savingProfile, setSavingProfile] = useState(false);
    const [saveMessage, setSaveMessage] = useState(null);

    useEffect(() => {
        if (person?.person_id) loadAssignments();
    }, [person]);

    useEffect(() => {
        if (person) {
            setEditForm({
                phone: person.phone || '',
                email: person.email || '',
                specialty: person.specialty || '',
            });
        }
    }, [person]);

    const loadAssignments = async () => {
        setLoadingAssignments(true);
        try {
            const [{ data: wos }, { data: acts }, { data: crews }] = await Promise.all([
                supabase.from('work_order').select('work_order_id, code, status, created_at')
                    .eq('created_by', person.person_id).order('created_at', { ascending: false }).limit(10),
                supabase.from('planned_activity').select('activity_id, title, status, planned_start_week')
                    .eq('responsible_person_id', person.person_id).order('planned_start_week', { ascending: false }).limit(10),
                supabase.from('crew_member').select('crew:crew_id(crew_id, name, active)')
                    .eq('person_id', person.person_id)
            ]);
            setAssignments({ workOrders: wos || [], activities: acts || [], crews: crews?.map(c => c.crew) || [] });
        } catch (e) { console.error(e); }
        finally { setLoadingAssignments(false); }
    };

    const handlePasswordChange = async () => {
        if (newPassword.length < 6) return setPassMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
        if (newPassword !== confirmPassword) return setPassMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
        setChangingPass(true);
        setPassMessage(null);
        try {
            await updatePassword(newPassword);
            setPassMessage({ type: 'success', text: '¡Contraseña actualizada exitosamente!' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setPassMessage({ type: 'error', text: err.message });
        } finally { setChangingPass(false); }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingAvatar(true);
        try {
            const ext = file.name.split('.').pop();
            const path = `avatars/${user.id}_${Date.now()}.${ext}`;
            const { error: uploadErr } = await supabase.storage.from('molinos').upload(path, file);
            if (uploadErr) throw uploadErr;
            const { data } = supabase.storage.from('molinos').getPublicUrl(path);
            await supabase.from('user_profile').update({ avatar_url: data.publicUrl }).eq('id', user.id);
            refreshProfile();
        } catch (err) { console.error(err); }
        finally { setUploadingAvatar(false); }
    };

    const handleSaveProfile = async () => {
        if (!person?.person_id) return;
        setSavingProfile(true);
        setSaveMessage(null);
        try {
            const { error } = await supabase.from('person')
                .update({
                    phone: editForm.phone || null,
                    email: editForm.email || null,
                    specialty: editForm.specialty || null,
                })
                .eq('person_id', person.person_id);
            if (error) throw error;
            setSaveMessage({ type: 'success', text: '¡Perfil actualizado!' });
            setEditing(false);
            refreshProfile();
        } catch (err) {
            setSaveMessage({ type: 'error', text: err.message });
        } finally { setSavingProfile(false); }
    };

    const ROLE_NAMES = {
        supervisor: 'Supervisor',
        ing_lider: 'Ingeniero Líder',
        social_lider: 'Líder Social',
        inventario_lider: 'Líder Inventario',
        logistica_lider: 'Líder Logística',
        sst_lider: 'Líder SST',
        operativo: 'Operativo',
    };

    // Sync localPrefs from context when preferences load
    useEffect(() => {
        if (preferences && !localPrefs) setLocalPrefs(preferences);
    }, [preferences]);

    const handleSavePrefs = async () => {
        if (!localPrefs) return;
        setSavingPrefs(true);
        setPrefsMessage(null);
        try {
            await savePreferences(localPrefs);
            setPrefsMessage({ type: 'success', text: '¡Preferencias guardadas!' });
        } catch (err) {
            setPrefsMessage({ type: 'error', text: err.message });
        } finally {
            setSavingPrefs(false);
            setTimeout(() => setPrefsMessage(null), 3000);
        }
    };

    const TABS = [
        { id: 'info', label: 'Información', icon: User },
        { id: 'security', label: 'Seguridad', icon: Key },
        { id: 'assignments', label: 'Asignaciones', icon: ClipboardList },
        { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
        ...(['supervisor', 'ing_lider'].includes(profile?.app_role) ? [{ id: 'supplybox', label: 'Mi Caja', icon: Package }] : []),
    ];

    const InfoField = ({ icon: Icon, label, value }) => (
        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
            <Icon size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
                <p className="text-sm text-slate-700 font-medium">{value || '—'}</p>
            </div>
        </div>
    );

    const EditField = ({ label, value, onChange, placeholder }) => (
        <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
            <input type="text" value={value} onChange={e => onChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder={placeholder} />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-5" />
                <div className="relative flex items-center gap-5">
                    <div className="relative group">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30" />
                        ) : (
                            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold border-2 border-white/30">
                                {initials}
                            </div>
                        )}
                        <label className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                            {uploadingAvatar ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                        </label>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{displayName}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-brand-200 text-sm">{roleName}</span>
                            {secondaryRole && (
                                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-semibold">
                                    + {ROLE_NAMES[secondaryRole] || secondaryRole}
                                </span>
                            )}
                        </div>
                        <p className="text-brand-300 text-xs mt-1">{user?.email}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === t.id ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}>
                        <t.icon size={16} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                {activeTab === 'info' && (
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900">Datos Personales</h3>
                            {person && !editing && (
                                <button onClick={() => setEditing(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                                    <Edit3 size={14} /> Editar
                                </button>
                            )}
                            {editing && (
                                <button onClick={() => { setEditing(false); setSaveMessage(null); }}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-lg">
                                    <X size={14} /> Cancelar
                                </button>
                            )}
                        </div>

                        {saveMessage && (
                            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${saveMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                                {saveMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                {saveMessage.text}
                            </div>
                        )}

                        {person ? (
                            editing ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <InfoField icon={User} label="Nombre completo" value={`${person.first_name} ${person.last_name}`} />
                                        <InfoField icon={FileText} label="Cédula" value={person.document_id} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <EditField label="Email" value={editForm.email} onChange={v => setEditForm({ ...editForm, email: v })} placeholder="correo@ejemplo.com" />
                                        <EditField label="Teléfono" value={editForm.phone} onChange={v => setEditForm({ ...editForm, phone: v })} placeholder="+57 300 000 0000" />
                                    </div>
                                    <EditField label="Especialidad" value={editForm.specialty} onChange={v => setEditForm({ ...editForm, specialty: v })} placeholder="Ej: Soldadura, Electricidad..." />
                                    <button onClick={handleSaveProfile} disabled={savingProfile}
                                        className="px-5 py-2.5 bg-brand-600 text-white font-semibold rounded-xl text-sm hover:bg-brand-500 disabled:opacity-40 flex items-center gap-2">
                                        {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Guardar Cambios
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <InfoField icon={User} label="Nombre completo" value={`${person.first_name} ${person.last_name}`} />
                                    <InfoField icon={FileText} label="Cédula" value={person.document_id} />
                                    <InfoField icon={Mail} label="Email" value={person.email || user?.email} />
                                    <InfoField icon={Phone} label="Teléfono" value={person.phone} />
                                    <InfoField icon={Shield} label="Especialidad" value={person.specialty} />
                                    <InfoField icon={Shield} label="Rol en App" value={roleName} />
                                    {secondaryRole && (
                                        <InfoField icon={Shield} label="Rol Secundario" value={ROLE_NAMES[secondaryRole] || secondaryRole} />
                                    )}
                                </div>
                            )
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                <User size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm">Tu cuenta aún no está vinculada con un registro de persona.</p>
                                <p className="text-xs mt-1">Contacta al supervisor para vincular tu perfil.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="p-6 space-y-6">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 mb-1">Cambiar Contraseña</h3>
                            <p className="text-xs text-slate-400 mb-4">La nueva contraseña debe tener al menos 6 caracteres.</p>

                            {passMessage && (
                                <div className={`flex items-center gap-2 p-3 mb-4 rounded-xl text-sm ${passMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                                    }`}>
                                    {passMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                    {passMessage.text}
                                </div>
                            )}

                            <div className="space-y-3 max-w-md">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nueva contraseña</label>
                                    <div className="relative">
                                        <input type={showNewPass ? 'text' : 'password'} value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            className="w-full px-4 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                            placeholder="••••••••" />
                                        <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                            {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Confirmar contraseña</label>
                                    <input type="password" value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                        placeholder="••••••••" />
                                </div>
                                <button onClick={handlePasswordChange} disabled={changingPass || !newPassword || !confirmPassword}
                                    className="px-6 py-2.5 bg-brand-600 text-white font-semibold rounded-xl text-sm hover:bg-brand-500 disabled:opacity-40 flex items-center gap-2">
                                    {changingPass ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                                    Cambiar Contraseña
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'assignments' && (
                    <div className="p-6 space-y-6">
                        {!person ? (
                            <p className="text-center text-slate-400 py-8 text-sm">Vincula tu cuenta con una persona para ver asignaciones.</p>
                        ) : loadingAssignments ? (
                            <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-brand-500" size={24} /></div>
                        ) : (
                            <>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                        <ClipboardList size={16} className="text-brand-500" />
                                        Mis Órdenes de Trabajo ({assignments.workOrders.length})
                                    </h4>
                                    {assignments.workOrders.length === 0 ? (
                                        <p className="text-xs text-slate-400 pl-6">Sin órdenes asignadas</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {assignments.workOrders.map(wo => (
                                                <div key={wo.work_order_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                                    <span className="text-sm font-mono font-medium text-slate-700">{wo.code || `OT-${wo.work_order_id}`}</span>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${wo.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                        wo.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                                        }`}>{wo.status}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                        <MapPin size={16} className="text-social-500" />
                                        Mis Actividades ({assignments.activities.length})
                                    </h4>
                                    {assignments.activities.length === 0 ? (
                                        <p className="text-xs text-slate-400 pl-6">Sin actividades asignadas</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {assignments.activities.map(a => (
                                                <div key={a.activity_id}
                                                    onClick={() => setSelectedActivityId(a.activity_id)}
                                                    className="flex items-center justify-between p-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 rounded-xl">
                                                    <span className="text-sm text-slate-700 truncate max-w-xs">{a.title || 'Actividad'}</span>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.status === 'COMPLETADA' || a.status === 'FINALIZADA' ? 'bg-emerald-100 text-emerald-700' :
                                                        a.status === 'EN PROGRESO' || a.status === 'EN_EJECUCION' ? 'bg-brand-100 text-brand-700' :
                                                            'bg-slate-100 text-slate-600'
                                                        }`}>{a.status}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                        <User size={16} className="text-amber-500" />
                                        Mis Cuadrillas ({assignments.crews.length})
                                    </h4>
                                    {assignments.crews.length === 0 ? (
                                        <p className="text-xs text-slate-400 pl-6">No asignado a cuadrillas</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {assignments.crews.map(c => (
                                                <div key={c.crew_id} className="p-3 bg-slate-50 rounded-xl text-sm font-medium text-slate-700">{c.name}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'supplybox' && person && (
                    <div className="p-6">
                        <SupplyBoxPanel personId={person.person_id} canReport={true} />
                    </div>
                )}

                {activeTab === 'notificaciones' && (
                    <div className="p-6 space-y-6">
                        <div>
                            <h3 className="font-bold text-slate-800 text-base mb-1">Preferencias de Alertas</h3>
                            <p className="text-sm text-slate-500">Selecciona qué tipos de notificaciones deseas recibir.</p>
                        </div>
                        {!localPrefs ? (
                            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
                        ) : (
                            <div className="space-y-3">
                                {[
                                    { key: 'new_assignments', icon: Users, label: 'Nuevas Asignaciones', desc: 'Cuando te asignen una actividad nueva' },
                                    { key: 'activity_status_change', icon: Activity, label: 'Cambios en Actividades', desc: 'Cuando cambie el estado de una actividad tuya' },
                                    { key: 'ot_status_change', icon: Wrench, label: 'Cambios en Órdenes de Trabajo', desc: 'Actualizaciones de estado en OTs que creaste' },
                                    { key: 'diagnosis_status_change', icon: Stethoscope, label: 'Cambios en Diagnósticos', desc: 'Actualizaciones de estado en diagnósticos' },
                                    { key: 'concertation_status_change', icon: Users, label: 'Cambios en Concertaciones', desc: 'Cuando cambie el estado de una concertación de tu cuadrilla' },
                                    { key: 'stock_low_alert', icon: Package, label: 'Alerta de Stock Bajo', desc: 'Cuando un artículo de inventario baje del mínimo' },
                                    { key: 'goal_progress', icon: Star, label: 'Progreso de Metas', desc: 'Actualizaciones sobre cumplimiento de metas semanales' },
                                ].map(({ key, icon: Icon, label, desc }) => (
                                    <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-colors">
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <Icon size={16} className="text-brand-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">{label}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setLocalPrefs(prev => ({ ...prev, [key]: !prev[key] }))}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-4 ${localPrefs[key] ? 'bg-brand-500' : 'bg-slate-200'
                                                }`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${localPrefs[key] ? 'translate-x-6' : 'translate-x-1'
                                                }`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex items-center gap-3 pt-2">
                            <button onClick={handleSavePrefs} disabled={savingPrefs || !localPrefs}
                                className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50">
                                {savingPrefs ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Guardar Preferencias
                            </button>
                            {prefsMessage && (
                                <span className={`text-sm font-medium flex items-center gap-1 ${prefsMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                                    }`}>
                                    {prefsMessage.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                    {prefsMessage.text}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {selectedActivityId && (
                <ActivityExecutionModal
                    activityId={selectedActivityId}
                    onClose={() => {
                        setSelectedActivityId(null);
                        loadAssignments();
                    }}
                />
            )}
        </div>
    );
}
