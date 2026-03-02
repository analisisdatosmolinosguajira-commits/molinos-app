import React, { useState } from 'react';
import { Target, BarChart3 } from 'lucide-react';
import GoalsTab from '../../components/reports/GoalsTab';
import ReportsTab from '../../components/reports/ReportsTab';

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState('reports');

    const tabs = [
        { id: 'reports', label: 'Reportes', icon: BarChart3 },
        { id: 'goals', label: 'Metas', icon: Target },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reportes y Metas</h1>
                <p className="text-slate-500 mt-1">Indicadores de gestión, metas del proyecto y análisis de datos</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all
                                ${activeTab === tab.id
                                    ? 'bg-white text-brand-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            {activeTab === 'reports' && <ReportsTab />}
            {activeTab === 'goals' && <GoalsTab />}
        </div>
    );
}
