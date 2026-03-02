import React, { useEffect } from 'react';
import { Bell, Check, CheckCheck, Activity, Wrench, Stethoscope, Users, Package, Star, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useNavigate } from 'react-router-dom';

const TYPE_CONFIG = {
    new_assignment: { icon: Users, color: 'text-blue-500', bg: 'bg-brand-50', label: 'Asignación' },
    activity_status: { icon: Activity, color: 'text-violet-500', bg: 'bg-violet-50', label: 'Actividad' },
    ot_status: { icon: Wrench, color: 'text-orange-500', bg: 'bg-orange-50', label: 'Orden de Trabajo' },
    diagnosis_status: { icon: Stethoscope, color: 'text-sky-500', bg: 'bg-sky-50', label: 'Diagnóstico' },
    concertation_status: { icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Concertación' },
    stock_low: { icon: Package, color: 'text-red-500', bg: 'bg-red-50', label: 'Stock Bajo' },
    goal_progress: { icon: Star, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Meta' },
    cert_expiry: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Certificación' },
    cert_expired: { icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50', label: 'Cert. Vencida' },
};

const ENTITY_ROUTES = {
    planned_activity: '/cuadrillas',
    work_order: '/ordenes',
    diagnosis: '/diagnosticos',
    community_concertation: '/concertaciones',
    person_certification: '/sst',
};

function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60) return 'Ahora mismo';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `hace ${Math.floor(diff / 86400)} días`;
    return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function NotificationsPage() {
    const { notifications, unreadCount, markRead, markAllRead, reload } = useNotifications();
    const navigate = useNavigate();

    useEffect(() => { reload(); }, []);

    const handleNotifClick = (n) => {
        if (!n.is_read) markRead(n.id);
        const route = ENTITY_ROUTES[n.entity_type];
        if (route) navigate(route);
    };

    const unread = notifications.filter(n => !n.is_read);
    const read = notifications.filter(n => n.is_read);

    const NotifCard = ({ n }) => {
        const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG['activity_status'];
        const Icon = cfg.icon;
        return (
            <div
                onClick={() => handleNotifClick(n)}
                className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer border transition-all
                    ${n.is_read
                        ? 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        : 'bg-brand-50/50 border-brand-100 hover:bg-brand-50'
                    }`}
            >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                    <Icon size={18} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${n.is_read ? 'text-slate-600 font-medium' : 'text-slate-800 font-bold'}`}>
                            {n.title}
                        </p>
                        {!n.is_read && <span className="w-2.5 h-2.5 bg-brand-500 rounded-full flex-shrink-0 mt-1" />}
                    </div>
                    {n.body && <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                        </span>
                        <span className="text-[10px] text-slate-400">{timeAgo(n.created_at)}</span>
                    </div>
                </div>
                {!n.is_read && (
                    <button
                        onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                        title="Marcar leída"
                        className="p-1.5 text-slate-300 hover:text-brand-500 rounded-lg hover:bg-white transition-colors flex-shrink-0"
                    >
                        <Check size={14} />
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                        <Bell size={20} className="text-brand-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Notificaciones</h1>
                        <p className="text-sm text-slate-500">
                            {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
                        </p>
                    </div>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllRead}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        <CheckCheck size={15} />
                        Marcar todas como leídas
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
                    <Bell size={40} className="text-slate-200 mx-auto mb-4" />
                    <p className="font-semibold text-slate-400">Sin notificaciones</p>
                    <p className="text-sm text-slate-300 mt-1">Todo está al día por ahora</p>
                </div>
            ) : (
                <>
                    {/* Unread */}
                    {unread.length > 0 && (
                        <div>
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
                                Nuevas — {unread.length}
                            </h2>
                            <div className="space-y-2">
                                {unread.map(n => <NotifCard key={n.id} n={n} />)}
                            </div>
                        </div>
                    )}

                    {/* Read */}
                    {read.length > 0 && (
                        <div>
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
                                Revisadas — {read.length}
                            </h2>
                            <div className="space-y-2">
                                {read.map(n => <NotifCard key={n.id} n={n} />)}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
