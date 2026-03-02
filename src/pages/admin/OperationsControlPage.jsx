import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { createPortal } from 'react-dom';
import {
    Shield, Activity, Users, Plus, Loader2, Search, Filter,
    ChevronDown, ChevronUp, Trash2, Edit3, PlusCircle, Clock,
    UserPlus, X, Eye, EyeOff, AlertCircle, CheckCircle, RefreshCw,
    Briefcase, Save
} from 'lucide-react';

// ——— User Creation Modal ————————————————————————————————
function CreateUserModal({ isOpen, onClose, onCreated }) {
    const [persons, setPersons] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [appRole, setAppRole] = useState('operativo');
    const [tempPassword, setTempPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        if (isOpen) loadAvailablePersons();
    }, [isOpen]);

    const loadAvailablePersons = async () => {
        // Get persons that don't have a user_profile yet
        const { data: linkedIds } = await supabase.from('user_profile').select('person_id').not('person_id', 'is', null);
        const linkedSet = new Set((linkedIds || []).map(r => r.person_id));

        const { data } = await supabase.from('person').select('person_id, first_name, last_name, document_id, email, person_role(name)')
            .eq('active', true).order('first_name');
        setPersons((data || []).filter(p => !linkedSet.has(p.person_id)));
    };

    const generateEmail = (p) => {
        const firstName = (p.first_name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.');
        const lastName = (p.last_name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.');
        return `${firstName}.${lastName}@molinos.app`;
    };

    const handleCreate = async () => {
        if (!selectedPerson || !tempPassword) return;
        if (tempPassword.length < 4) return setError('La contraseña debe tener al menos 4 caracteres');

        setSaving(true);
        setError(null);
        setSuccess(null);

        const email = generateEmail(selectedPerson);

        try {
            // 1. Sign up (creates auth.users + triggers user_profile)
            // We use the service role approach: create via SQL
            const { data: newUserRows, error: sqlError } = await supabase.rpc('admin_create_user', {
                p_email: email,
                p_password: tempPassword,
                p_person_id: selectedPerson.person_id,
                p_app_role: appRole,
                p_full_name: `${selectedPerson.first_name} ${selectedPerson.last_name}`
            });

            if (sqlError) throw sqlError;

            setSuccess(`Usuario creado: ${email}`);
            setTimeout(() => { onCreated?.(); onClose(); }, 1500);
        } catch (err) {
            setError(err.message || 'Error creando usuario');
        } finally { setSaving(false); }
    };

    const filtered = persons.filter(p =>
        `${p.first_name} ${p.last_name} ${p.document_id}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <UserPlus size={20} className="text-brand-600" /> Crear Usuario
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
                            <CheckCircle size={16} /> {success}
                        </div>
                    )}

                    {/* Person selector */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Seleccionar Persona *</label>
                        <div className="relative mb-2">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                placeholder="Buscar por nombre o cédula..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl">
                            {filtered.slice(0, 20).map(p => (
                                <button key={p.person_id} onClick={() => setSelectedPerson(p)}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors ${selectedPerson?.person_id === p.person_id ? 'bg-brand-50 text-brand-700 font-semibold' : ''
                                        }`}>
                                    <span className="font-medium">{p.first_name} {p.last_name}</span>
                                    <span className="text-slate-400 ml-2 text-xs">CC {p.document_id}</span>
                                </button>
                            ))}
                            {filtered.length === 0 && <p className="p-3 text-xs text-slate-400 text-center">No hay personas disponibles</p>}
                        </div>
                    </div>

                    {selectedPerson && (
                        <>
                            <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-sm">
                                <p className="font-bold text-brand-700">{selectedPerson.first_name} {selectedPerson.last_name}</p>
                                <p className="text-brand-500 text-xs mt-0.5">Email: {generateEmail(selectedPerson)}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Rol en la App *</label>
                                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    value={appRole} onChange={e => setAppRole(e.target.value)}>
                                    <option value="operativo">Operativo (General)</option>
                                    <option value="ing_lider">Ingeniero Líder</option>
                                    <option value="social_lider">Líder Social</option>
                                    <option value="inventario_lider">Líder Inventario</option>
                                    <option value="logistica_lider">Líder Logística</option>
                                    <option value="sst_lider">Líder SST</option>
                                    <option value="supervisor">Supervisor</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contraseña Temporal *</label>
                                <div className="relative">
                                    <input type={showPass ? 'text' : 'password'} value={tempPassword}
                                        onChange={e => setTempPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                        placeholder="Contraseña temporal..." />
                                    <button type="button" onClick={() => setShowPass(!showPass)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">El usuario podrá cambiar su contraseña desde su perfil.</p>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-xl">Cancelar</button>
                    <button onClick={handleCreate} disabled={saving || !selectedPerson || !tempPassword}
                        className="px-5 py-2 bg-brand-600 text-white font-semibold rounded-xl text-sm hover:bg-brand-500 disabled:opacity-40 flex items-center gap-2">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                        Crear Usuario
                    </button>
                </div>
            </div>
        </div>
    );
}

// ——— Main Operations Control Page ————————————————————————
export default function OperationsControlPage() {
    const { isSupervisor, user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ today: 0, week: 0, totalUsers: 0 });
    const [filterUser, setFilterUser] = useState('');
    const [filterTable, setFilterTable] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [expandedLog, setExpandedLog] = useState(null);
    const [showCreateUser, setShowCreateUser] = useState(false);

    // Roles management
    const [roles, setRoles] = useState([]);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [roleForm, setRoleForm] = useState({ name: '', description: '' });
    const [editingRole, setEditingRole] = useState(null);
    const [roleSaving, setRoleSaving] = useState(false);

    // User role editing
    const [editingUserId, setEditingUserId] = useState(null);
    const [editUserRole, setEditUserRole] = useState('');
    const [editSecondaryRole, setEditSecondaryRole] = useState('');
    const [savingUserRole, setSavingUserRole] = useState(false);

    const ROLE_NAMES = {
        supervisor: 'Supervisor',
        ing_lider: 'Ingeniero Líder',
        social_lider: 'Líder Social',
        inventario_lider: 'Líder Inventario',
        logistica_lider: 'Líder Logística',
        sst_lider: 'Líder SST',
        operativo: 'Operativo',
    };

    useEffect(() => { loadData(); loadRoles(); }, []);

    const loadRoles = async () => {
        const { data } = await supabase.from('person_role').select('role_id, name, description').order('name');
        setRoles(data || []);
    };

    const openRoleModal = (role = null) => {
        if (role) {
            setEditingRole(role);
            setRoleForm({ name: role.name, description: role.description || '' });
        } else {
            setEditingRole(null);
            setRoleForm({ name: '', description: '' });
        }
        setShowRoleModal(true);
    };

    const saveRole = async () => {
        if (!roleForm.name.trim()) return alert('El nombre del rol es obligatorio');
        try {
            setRoleSaving(true);
            if (editingRole) {
                const { error } = await supabase.from('person_role')
                    .update({ name: roleForm.name, description: roleForm.description || null })
                    .eq('role_id', editingRole.role_id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('person_role')
                    .insert([{ name: roleForm.name, description: roleForm.description || null }]);
                if (error) throw error;
            }
            setShowRoleModal(false);
            await loadRoles();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setRoleSaving(false);
        }
    };

    const deleteRole = async (roleId, roleName) => {
        if (!confirm(`¿Eliminar el rol "${roleName}"? Esto puede afectar personas asignadas.`)) return;
        try {
            const { error } = await supabase.from('person_role').delete().eq('role_id', roleId);
            if (error) throw error;
            await loadRoles();
        } catch (err) {
            alert('Error al eliminar: ' + (err.message || 'El rol puede estar en uso'));
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            // Audit logs
            const { data: logData } = await supabase.from('audit_log')
                .select('*').order('created_at', { ascending: false }).limit(200);
            setLogs(logData || []);

            // Users
            const { data: userProfiles } = await supabase.from('user_profile')
                .select('id, person_id, app_role, secondary_role, created_at, person:person_id(first_name, last_name, email)');
            setUsers(userProfiles || []);

            // Stats
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
            const todayCount = (logData || []).filter(l => l.created_at >= todayStart).length;
            const weekCount = (logData || []).filter(l => l.created_at >= weekStart).length;
            setStats({ today: todayCount, week: weekCount, totalUsers: (userProfiles || []).length });
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSaveUserRole = async (userId) => {
        setSavingUserRole(true);
        try {
            const updateData = { app_role: editUserRole };
            updateData.secondary_role = editUserRole === 'inventario_lider' ? (editSecondaryRole || null) : null;
            const { error } = await supabase.from('user_profile').update(updateData).eq('id', userId);
            if (error) throw error;
            setEditingUserId(null);
            await loadData();
        } catch (err) {
            alert('Error actualizando rol: ' + err.message);
        } finally { setSavingUserRole(false); }
    };

    const filteredLogs = logs.filter(l => {
        if (filterUser && l.person_name !== filterUser && l.user_email !== filterUser) return false;
        if (filterTable && l.table_name !== filterTable) return false;
        if (filterAction && l.action !== filterAction) return false;
        return true;
    });

    const uniqueUsers = [...new Set(logs.map(l => l.person_name || l.user_email).filter(Boolean))];
    const uniqueTables = [...new Set(logs.map(l => l.table_name).filter(Boolean))];

    const actionBadge = (action) => {
        const styles = {
            INSERT: 'bg-emerald-100 text-emerald-700',
            UPDATE: 'bg-amber-100 text-amber-700',
            DELETE: 'bg-red-100 text-red-700'
        };
        const icons = {
            INSERT: <PlusCircle size={12} />,
            UPDATE: <Edit3 size={12} />,
            DELETE: <Trash2 size={12} />
        };
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${styles[action] || 'bg-slate-100 text-slate-600'}`}>
                {icons[action]} {action}
            </span>
        );
    };

    const timeAgo = (ts) => {
        const diff = Date.now() - new Date(ts).getTime();
        if (diff < 60000) return 'hace un momento';
        if (diff < 3600000) return `hace ${Math.floor(diff / 60000)} min`;
        if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)}h`;
        return new Date(ts).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-brand-500" size={32} /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Shield className="text-brand-600" size={24} /> Control de Operaciones
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Bitácora de auditoría y gestión de usuarios</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadData} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
                        <RefreshCw size={18} className="text-slate-500" />
                    </button>
                    <button onClick={() => setShowCreateUser(true)}
                        className="px-4 py-2 bg-brand-600 text-white font-semibold rounded-xl text-sm hover:bg-brand-500 flex items-center gap-2">
                        <UserPlus size={16} /> Crear Usuario
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase">Acciones Hoy</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{stats.today}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase">Acciones (7 días)</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{stats.week}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase">Usuarios Registrados</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{stats.totalUsers}</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Users size={16} className="text-brand-500" /> Usuarios del Sistema ({users.length})
                </h3>
                <div className="space-y-2">
                    {users.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                                    {u.person ? `${u.person.first_name?.[0] || ''}${u.person.last_name?.[0] || ''}` : 'SU'}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700">
                                        {u.person ? `${u.person.first_name} ${u.person.last_name}` : 'Superusuario'}
                                    </p>
                                    <p className="text-xs text-slate-400">{u.person?.email || user?.email || ''}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {editingUserId === u.id ? (
                                    <div className="flex items-center gap-2">
                                        <select className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                            value={editUserRole} onChange={e => setEditUserRole(e.target.value)}>
                                            {Object.entries(ROLE_NAMES).map(([k, v]) => (
                                                <option key={k} value={k}>{v}</option>
                                            ))}
                                        </select>
                                        {editUserRole === 'inventario_lider' && (
                                            <select className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                                value={editSecondaryRole} onChange={e => setEditSecondaryRole(e.target.value)}>
                                                <option value="">Sin rol secundario</option>
                                                <option value="ing_lider">+ Ing. Líder</option>
                                            </select>
                                        )}
                                        <button onClick={() => handleSaveUserRole(u.id)} disabled={savingUserRole}
                                            className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-40">
                                            {savingUserRole ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                        </button>
                                        <button onClick={() => setEditingUserId(null)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400">
                                            <X size={13} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-col items-end gap-0.5">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${u.app_role === 'supervisor' ? 'bg-purple-100 text-purple-700' :
                                                u.app_role === 'ing_lider' ? 'bg-brand-100 text-brand-700' :
                                                    u.app_role === 'social_lider' ? 'bg-green-100 text-green-700' :
                                                        u.app_role === 'inventario_lider' ? 'bg-amber-100 text-amber-700' :
                                                            u.app_role === 'logistica_lider' ? 'bg-orange-100 text-orange-700' :
                                                                u.app_role === 'sst_lider' ? 'bg-teal-100 text-teal-700' :
                                                                    'bg-slate-100 text-slate-600'
                                                }`}>{ROLE_NAMES[u.app_role] || u.app_role}</span>
                                            {u.secondary_role && (
                                                <span className="text-[10px] font-medium text-slate-400">+ {ROLE_NAMES[u.secondary_role]}</span>
                                            )}
                                        </div>
                                        <button onClick={() => { setEditingUserId(u.id); setEditUserRole(u.app_role); setEditSecondaryRole(u.secondary_role || ''); }}
                                            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-brand-600">
                                            <Edit3 size={13} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Roles Management */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Briefcase size={16} className="text-brand-500" /> Roles del Proyecto ({roles.length})
                    </h3>
                    <button onClick={() => openRoleModal()}
                        className="px-3 py-1.5 bg-brand-600 text-white font-semibold rounded-xl text-xs hover:bg-brand-500 flex items-center gap-1">
                        <Plus size={14} /> Nuevo Rol
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {roles.map(role => (
                        <div key={role.role_id} className="group flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-700 truncate">{role.name}</p>
                                {role.description && (
                                    <p className="text-xs text-slate-400 truncate">{role.description}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                <button onClick={() => openRoleModal(role)} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-brand-600">
                                    <Edit3 size={13} />
                                </button>
                                <button onClick={() => deleteRole(role.role_id, role.name)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500">
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {roles.length === 0 && (
                        <p className="text-sm text-slate-400 col-span-full text-center py-6">No hay roles creados</p>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Activity size={16} className="text-brand-500" /> Bitácora de Auditoría
                </h3>
                <div className="flex flex-wrap gap-3 mb-4">
                    <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
                        <option value="">Todos los usuarios</option>
                        {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={filterTable} onChange={e => setFilterTable(e.target.value)}>
                        <option value="">Todas las tablas</option>
                        {uniqueTables.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
                        <option value="">Todas las acciones</option>
                        <option value="INSERT">INSERT</option>
                        <option value="UPDATE">UPDATE</option>
                        <option value="DELETE">DELETE</option>
                    </select>
                </div>

                {/* Log entries */}
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredLogs.length === 0 ? (
                        <p className="text-center text-slate-400 py-8 text-sm">No hay registros de auditoría aún.</p>
                    ) : (
                        filteredLogs.map(log => (
                            <div key={log.log_id} className="border border-slate-100 rounded-xl overflow-hidden">
                                <button onClick={() => setExpandedLog(expandedLog === log.log_id ? null : log.log_id)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                                        {(log.person_name || log.user_email || '?')[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-slate-700">{log.person_name || log.user_email || 'Sistema'}</span>
                                            {actionBadge(log.action)}
                                            <span className="text-xs text-slate-400 font-mono">{log.table_name}</span>
                                            {log.record_id && <span className="text-xs text-slate-300">#{log.record_id}</span>}
                                        </div>
                                        {log.changed_fields && log.changed_fields.length > 0 && (
                                            <p className="text-xs text-slate-400 mt-0.5 truncate">
                                                Campos: {log.changed_fields.join(', ')}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                            <Clock size={12} /> {timeAgo(log.created_at)}
                                        </span>
                                        {expandedLog === log.log_id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </div>
                                </button>

                                {expandedLog === log.log_id && (
                                    <div className="px-3 pb-3 space-y-2">
                                        {log.old_data && (
                                            <div>
                                                <p className="text-xs font-bold text-red-500 mb-1">Datos anteriores:</p>
                                                <pre className="text-xs bg-red-50 p-2 rounded-lg overflow-x-auto text-red-700 max-h-40">
                                                    {JSON.stringify(log.old_data, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                        {log.new_data && (
                                            <div>
                                                <p className="text-xs font-bold text-emerald-500 mb-1">Datos nuevos:</p>
                                                <pre className="text-xs bg-emerald-50 p-2 rounded-lg overflow-x-auto text-emerald-700 max-h-40">
                                                    {JSON.stringify(log.new_data, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            <CreateUserModal isOpen={showCreateUser} onClose={() => setShowCreateUser(false)} onCreated={loadData} />

            {/* Role Modal */}
            {showRoleModal && createPortal(
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-50 rounded-xl">
                                    <Briefcase size={20} className="text-brand-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">{editingRole ? 'Editar' : 'Nuevo'} Rol</h2>
                                    <p className="text-xs text-slate-400">Rol de proyecto para personal y permisos</p>
                                </div>
                            </div>
                            <button onClick={() => setShowRoleModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nombre del Rol *</label>
                                <input
                                    type="text"
                                    value={roleForm.name}
                                    onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                                    placeholder="Ej: Técnico de campo, Soldador..."
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Descripción</label>
                                <textarea
                                    value={roleForm.description}
                                    onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                                    placeholder="Descripción breve del rol..."
                                    rows={3}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 pt-0">
                            <button onClick={() => setShowRoleModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl">
                                Cancelar
                            </button>
                            <button
                                onClick={saveRole}
                                disabled={roleSaving || !roleForm.name.trim()}
                                className="px-6 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-500/30 disabled:opacity-50 flex items-center gap-2"
                            >
                                {roleSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {editingRole ? 'Guardar' : 'Crear Rol'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
