import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import OnboardingModal from '../auth/OnboardingModal';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, X, Search, User, LogOut, ChevronDown } from 'lucide-react';
import NotificationBell from '../notifications/NotificationBell';

export default function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const { displayName, initials, roleName, profile, signOut } = useAuth();
    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    // Sync sidebar state on mount and resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 1024 && sidebarOpen) {
                setSidebarOpen(false);
            } else if (window.innerWidth > 1024 && !sidebarOpen) {
                setSidebarOpen(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [sidebarOpen]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/login');
        } catch (err) { console.error(err); }
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-out ${sidebarOpen ? 'ml-72' : 'ml-20'}`}>
                {/* Top Header */}
                <header className="h-20 sticky top-0 z-30 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-slate-200/50 supports-[backdrop-filter]:bg-white/60">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <div className="hidden md:flex items-center relative group">
                            <Search size={18} className="absolute left-3 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar OTs, Molinos, Personas..."
                                className="pl-10 pr-4 py-2 w-64 bg-slate-100/50 border border-slate-200 rounded-full text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-200 transition-all placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    {/* Right: User actions */}
                    <div className="flex items-center gap-3">
                        {/* Notifications bell */}
                        <NotificationBell />

                        {/* User dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-social-500 flex items-center justify-center text-white text-xs font-bold">
                                        {initials}
                                    </div>
                                )}
                                <div className="hidden md:block text-left">
                                    <p className="text-sm font-medium text-slate-700 leading-tight">{displayName}</p>
                                    <p className="text-xs text-slate-400 leading-tight">{roleName}</p>
                                </div>
                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown */}
                            {dropdownOpen && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in">
                                    <div className="px-4 py-2 border-b border-slate-100">
                                        <p className="text-sm font-semibold text-slate-700">{displayName}</p>
                                        <p className="text-xs text-slate-400">{roleName}</p>
                                    </div>
                                    <button
                                        onClick={() => { navigate('/perfil'); setDropdownOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                                    >
                                        <User size={16} /> Mi Perfil
                                    </button>
                                    <div className="border-t border-slate-100 mt-1 pt-1">
                                        <button
                                            onClick={handleSignOut}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <LogOut size={16} /> Cerrar Sesión
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
                    <div className="max-w-7xl mx-auto animate-fade-in">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Onboarding modal for new users */}
            <OnboardingModal />
        </div>
    );
}
