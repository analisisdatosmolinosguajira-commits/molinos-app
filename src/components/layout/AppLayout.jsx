import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, X, Bell, Search } from 'lucide-react';

export default function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

            {/* Main Content Wrapper */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-out ${sidebarOpen ? 'ml-72' : 'ml-20'}`}>

                {/* Top Header - Glass Effect */}
                <header className="h-20 sticky top-0 z-30 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-slate-200/50 supports-[backdrop-filter]:bg-white/60">

                    {/* Left: Toggle & Page Title (Optional) */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>

                        {/* Search Bar - Global */}
                        <div className="hidden md:flex items-center relative group">
                            <Search size={18} className="absolute left-3 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar OTs, Molinos, Personas..."
                                className="pl-10 pr-4 py-2 w-64 bg-slate-100/50 border border-slate-200 rounded-full text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-200 transition-all placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-4">
                        <button className="relative p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                    </div>
                </header>

                {/* Dynamic Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
                    <div className="max-w-7xl mx-auto animate-fade-in">
                        <Outlet />
                    </div>
                </main>

            </div>
        </div>
    );
}
