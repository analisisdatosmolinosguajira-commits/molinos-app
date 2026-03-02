import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAllPermissions } from '../../hooks/usePermissions';
import {
    LayoutDashboard, Map, ClipboardList, Stethoscope, Users,
    Wind, Droplet, Package, BarChart3, Menu, X, ChevronRight,
    Settings, Home, Wrench, User, Shield, ShieldCheck, Truck
} from 'lucide-react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

export default function Sidebar({ isOpen, toggleSidebar }) {
    const { displayName, initials, roleName, profile, isSupervisor } = useAuth();
    const { allPerms, loading: permsLoading } = useAllPermissions();
    const navigate = useNavigate();

    const navGroups = [
        {
            title: 'Principal',
            items: [
                { path: '/', label: 'Panel de Control', icon: LayoutDashboard, module: 'dashboard' }
            ]
        },
        {
            title: 'Trabajo en Campo',
            items: [
                { path: '/visitas', label: 'Visitas & Desplazamientos', icon: Map, module: 'jornadas' },
                { path: '/ordenes', label: 'Órdenes de Trabajo', icon: ClipboardList, module: 'ordenes_trabajo' },
                { path: '/diagnosticos', label: 'Diagnósticos', icon: Stethoscope, module: 'diagnosticos' },
                { path: '/concertaciones', label: 'Concertaciones', icon: Users, module: 'concertaciones' },
                { path: '/cuadrillas', label: 'Personal Operativo', icon: Users, module: 'cuadrillas' },
            ]
        },
        {
            title: 'Seguridad y Salud',
            items: [
                { path: '/sst', label: 'Gestión SST', icon: ShieldCheck, module: 'sst' },
            ]
        },
        {
            title: 'Social',
            items: [
                { path: '/comunidades', label: 'Comunidades', icon: Home, module: 'comunidades' },
            ]
        },
        {
            title: 'Activos',
            items: [
                { path: '/molinos', label: 'Molinos', icon: Wind, module: 'molinos' },
                { path: '/bombas', label: 'Bombas', icon: Droplet, module: 'bombas' },
            ]
        },
        {
            title: 'Taller',
            items: [
                { path: '/inventario', label: 'Inventario Unificado', icon: Package, module: 'inventario' },
                { path: '/fabricacion', label: 'Fabricación', icon: Wrench, module: 'fabricacion' },
            ]
        },
        {
            title: 'Gestión',
            items: [
                { path: '/reportes', label: 'Reportes y Metas', icon: BarChart3, module: 'reportes' },
            ]
        },
        {
            title: 'Administración',
            items: [
                { path: '/admin/operaciones', label: 'Control de Operaciones', icon: Shield, module: 'admin_operaciones' },
            ]
        }
    ];

    // Filter nav items based on permissions
    const isItemVisible = (item) => {
        if (isSupervisor) return true; // supervisor sees everything
        if (permsLoading) return true; // show all while loading
        const perm = allPerms[item.module];
        if (!perm) return true; // no restriction found, show by default
        return perm.canRead !== false;
    };

    return (
        <aside
            className={cn(
                "fixed inset-y-0 left-0 z-50 glass-sidebar flex flex-col transition-all duration-300 ease-out",
                isOpen ? "w-72" : "w-20"
            )}
        >
            {/* Header */}
            <div className="h-20 flex items-center justify-between px-6 border-b border-emerald-800/30 relative">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="min-w-[36px] h-9 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 bg-gradient-to-br from-brand-500 to-accent-500">
                        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                            <circle cx="32" cy="14" r="5" fill="white" />
                            <line x1="32" y1="19" x2="32" y2="36" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
                            <line x1="32" y1="24" x2="14" y2="30" stroke="white" strokeWidth="3" strokeLinecap="round" />
                            <line x1="32" y1="24" x2="50" y2="30" stroke="white" strokeWidth="3" strokeLinecap="round" />
                            <path d="M14 30 Q8 24 11 18" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
                            <path d="M50 30 Q56 24 53 18" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
                            <line x1="32" y1="36" x2="18" y2="54" stroke="white" strokeWidth="3" strokeLinecap="round" />
                            <line x1="32" y1="36" x2="46" y2="54" stroke="white" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                    </div>
                    {isOpen && (
                        <div className="animate-fade-in">
                            <h1 className="text-white font-bold tracking-tight text-lg leading-none">Molinos</h1>
                            <span className="text-emerald-300/70 text-xs font-medium">Gestión Comunitaria · SENA</span>
                        </div>
                    )}
                </div>
                {/* Accent line at bottom */}
                <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-gradient-to-r from-brand-500/40 via-accent-500/30 to-transparent" />
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar space-y-6">
                {navGroups.map((group, idx) => {
                    const visibleItems = group.items.filter(isItemVisible);
                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={idx}>
                            {isOpen && (
                                <h3 className="px-4 text-xs font-semibold text-emerald-400/50 uppercase tracking-wider mb-2 animate-fade-in">
                                    {group.title}
                                </h3>
                            )}
                            <div className="space-y-1">
                                {visibleItems.map((item) => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={({ isActive }) => cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden",
                                            isActive
                                                ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/20"
                                                : "text-slate-400 hover:bg-emerald-900/30 hover:text-emerald-200"
                                        )}
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <item.icon size={20} className={cn("transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-emerald-300")} />
                                                {isOpen && (
                                                    <span className="font-medium truncate animate-fade-in">{item.label}</span>
                                                )}
                                                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent-400 rounded-r-full shadow-glow-accent" />}
                                            </>
                                        )}
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-emerald-800/30">
                <button
                    onClick={() => navigate('/perfil')}
                    className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-xl transition-all hover:bg-slate-800/70",
                        isOpen ? "bg-emerald-900/30" : "justify-center hover:bg-emerald-900/30"
                    )}
                >
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-brand-500/30" />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold shadow-lg ring-2 ring-brand-500/30">
                            {initials}
                        </div>
                    )}
                    {isOpen && (
                        <div className="overflow-hidden animate-fade-in text-left">
                            <p className="text-sm font-medium text-white truncate">{displayName}</p>
                            <p className="text-xs text-slate-400 truncate">{roleName}</p>
                        </div>
                    )}
                </button>
            </div>
        </aside>
    );
}
