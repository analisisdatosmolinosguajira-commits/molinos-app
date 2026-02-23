import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import {
    User, Mail, Phone, Shield, Key, Save, Loader2, CheckCircle,
    AlertCircle, FileText, ClipboardList, MapPin, Camera, Eye, EyeOff
} from 'lucide-react';

export default function ProfilePage() {
    const { user, profile, person, displayName, initials, roleName, updatePassword, refreshProfile } = useAuth();
    const [activeTab, setActiveTab] = useState('info');
    const [assignments, setAssignments] = useState({ workOrders: [], activities: [], crews: [] });
    const [loadingAssignments, setLoadingAssignments] = useState(false);

    // Password change
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPass, setShowNewPass] = useState(false);
    const [changingPass, setChangingPass] = useState(false);
    const [passMessage, setPassMessage] = useState(null);

    // Avatar
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        if (person?.person_id) loadAssignments();
    }, [person]);

    const loadAssignments = async () => {
        setLoadingAssignments(true);
        try {
            const [{ data: wos }, { data: acts }, { data: crews }] = await Promise.all([
                supabase.from('work_order').select('work_order_id, code, status, scheduled_date')
                    .eq('created_by', person.person_id).order('scheduled_date', { ascending: false }).limit(10),
                supabase.from('planned_activity').select('activity_id, description, status, planned_date')
                    .eq('responsible_person_id', person.person_id).order('planned_date', { ascending: false }).limit(10),
                supabase.from('crew_member').select('crew:crew_id(crew_id, name, status)')
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

    const TABS = [
        { id: 'info', label: 'Información', icon: User },
        { id: 'security', label: 'Seguridad', icon: Key },
        { id: 'assignments', label: 'Asignaciones', icon: ClipboardList },
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
                        <p className="text-brand-200 text-sm">{roleName}</p>
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
                        <h3 className="text-sm font-bold text-slate-900 mb-3">Datos Personales</h3>
                        {person ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <InfoField icon={User} label="Nombre completo" value={`${person.first_name} ${person.last_name}`} />
                                <InfoField icon={FileText} label="Cédula" value={person.document_id} />
                                <InfoField icon={Mail} label="Email" value={person.email || user?.email} />
                                <InfoField icon={Phone} label="Teléfono" value={person.phone} />
                                <InfoField icon={Shield} label="Especialidad" value={person.specialty} />
                                <InfoField icon={Shield} label="Rol en App" value={roleName} />
                            </div>
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
                                                <div key={a.activity_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                                    <span className="text-sm text-slate-700 truncate max-w-xs">{a.description || 'Actividad'}</span>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
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
            </div>
        </div>
    );
}
