import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Activity, Wrench, Stethoscope, Users, Package, Star, X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useNavigate } from 'react-router-dom';

const TYPE_CONFIG = {
    new_assignment: { icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Asignación' },
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
    planned_activity: (id) => '/cuadrillas',
    work_order: (id) => '/ordenes',
    diagnosis: (id) => `/diagnosticos`,
    community_concertation: (id) => '/concertaciones',
};

function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60) return 'Ahora mismo';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return `hace ${Math.floor(diff / 86400)} días`;
}

export default function NotificationBell() {
    const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleNotifClick = (n) => {
        if (!n.is_read) markRead(n.id);
        const route = ENTITY_ROUTES[n.entity_type];
        if (route) navigate(route(n.entity_id));
        setOpen(false);
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                aria-label="Notificaciones"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white shadow-sm animate-bounce-once">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden max-h-[520px]"
                    style={{ transformOrigin: 'top right' }}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <Bell size={16} className="text-brand-600" />
                            <h3 className="font-bold text-slate-800 text-sm">Notificaciones</h3>
                            {unreadCount > 0 && (
                                <span className="bg-brand-100 text-brand-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                                    {unreadCount} nuevas
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button onClick={markAllRead}
                                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors font-medium">
                                    <CheckCheck size={13} />
                                    Todas leídas
                                </button>
                            )}
                            <button onClick={() => setOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Notification list */}
                    <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <Bell size={32} className="mb-3 opacity-40" />
                                <p className="text-sm font-medium">Sin notificaciones</p>
                                <p className="text-xs mt-1">Todo está al día por ahora</p>
                            </div>
                        ) : notifications.map(n => {
                            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG['activity_status'];
                            const Icon = cfg.icon;
                            return (
                                <div
                                    key={n.id}
                                    onClick={() => handleNotifClick(n)}
                                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-slate-50 last:border-0
                                        ${n.is_read ? 'hover:bg-slate-50' : 'bg-brand-50/40 hover:bg-brand-50/70'}`}
                                >
                                    {/* Icon */}
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                                        <Icon size={16} className={cfg.color} />
                                    </div>
                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={`text-sm leading-snug ${n.is_read ? 'text-slate-600 font-medium' : 'text-slate-800 font-bold'}`}>
                                                {n.title}
                                            </p>
                                            {!n.is_read && (
                                                <span className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-1.5" />
                                            )}
                                        </div>
                                        {n.body && (
                                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>
                                                {cfg.label}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{timeAgo(n.created_at)}</span>
                                        </div>
                                    </div>
                                    {/* Mark read button */}
                                    {!n.is_read && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                                            className="p-1 text-slate-300 hover:text-brand-500 rounded transition-colors flex-shrink-0"
                                            title="Marcar como leída"
                                        >
                                            <Check size={13} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                        <button
                            onClick={() => { navigate('/notificaciones'); setOpen(false); }}
                            className="text-xs text-brand-600 hover:text-brand-700 font-semibold w-full text-center"
                        >
                            Ver todas las notificaciones →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
