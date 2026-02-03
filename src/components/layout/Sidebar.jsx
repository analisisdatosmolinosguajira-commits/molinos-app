import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Map,
    ClipboardList,
    Stethoscope,
    Users,
    Wind,
    Droplet,
    Package,
    BarChart3,
    Menu,
    X,
    ChevronRight,
    Settings,
    Home,
    Wrench
} from 'lucide-react';
import clsx from 'clsx'; // Assuming user will install this, or I can implement a mini-utility

// Simple utility if clsx is not available immediately
const cn = (...classes) => classes.filter(Boolean).join(' ');

export default function Sidebar({ isOpen, toggleSidebar }) {

    const navGroups = [
        {
            title: 'Principal',
            items: [
                { path: '/', label: 'Panel de Control', icon: LayoutDashboard }
            ]
        },
        {
            title: 'Trabajo en Campo',
            items: [
                { path: '/visitas', label: 'Visitas & Desplamientos', icon: Map },
                { path: '/ordenes', label: 'Órdenes de Trabajo', icon: ClipboardList },
                { path: '/diagnosticos', label: 'Diagnósticos', icon: Stethoscope },
                { path: '/concertaciones', label: 'Concertaciones', icon: Users },
                { path: '/cuadrillas', label: 'Personal Operativo', icon: Users },
            ]
        },
        {
            title: 'Social',
            items: [
                { path: '/comunidades', label: 'Comunidades', icon: Home },
            ]
        },
        {
            title: 'Activos',
            items: [
                { path: '/molinos', label: 'Molinos', icon: Wind },
                { path: '/bombas', label: 'Bombas', icon: Droplet },
            ]
        },
        {
            title: 'Taller',
            items: [
                { path: '/inventario', label: 'Inventario Unificado', icon: Package },
                { path: '/fabricacion', label: 'Fabricación', icon: Wrench },
            ]
        },
        {
            title: 'Gestión',
            items: [
                { path: '/reportes', label: 'Reportes y Metas', icon: BarChart3 },
            ]
        }
    ];

    return (
        <aside
            className={cn(
                "fixed inset-y-0 left-0 z-50 glass-sidebar flex flex-col transition-all duration-300 ease-out",
                isOpen ? "w-72" : "w-20"
            )}
        >
            {/* Header */}
            <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800/50">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="min-w-[32px] h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/30">
                        <Wind className="text-white" size={20} />
                    </div>
                    {isOpen && (
                        <div className="animate-fade-in">
                            <h1 className="text-white font-bold tracking-tight text-lg leading-none">Molinos</h1>
                            <span className="text-slate-400 text-xs font-medium">Gestión Comunitaria</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar space-y-6">
                {navGroups.map((group, idx) => (
                    <div key={idx}>
                        {isOpen && (
                            <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 animate-fade-in">
                                {group.title}
                            </h3>
                        )}
                        <div className="space-y-1">
                            {group.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) => cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden",
                                        isActive
                                            ? "bg-brand-600 text-white shadow-lg shadow-brand-900/20"
                                            : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                                    )}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <item.icon size={20} className={cn("transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-brand-400")} />

                                            {isOpen && (
                                                <span className="font-medium truncate animate-fade-in">{item.label}</span>
                                            )}

                                            {/* Active Indicator & Hover Effect */}
                                            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-r-full blur-[2px]" />}
                                        </>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-slate-800/50">
                <div className={cn(
                    "flex items-center gap-3 p-2 rounded-xl transition-all",
                    isOpen ? "bg-slate-800/50" : "justify-center hover:bg-slate-800/50"
                )}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-500 to-social-500 flex items-center justify-center text-white text-xs font-bold shadow-lg ring-2 ring-slate-900">
                        JP
                    </div>
                    {isOpen && (
                        <div className="overflow-hidden animate-fade-in">
                            <p className="text-sm font-medium text-white truncate">Jose Perez</p>
                            <p className="text-xs text-slate-400 truncate">Coordinador Técnico</p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
