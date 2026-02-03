import React from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const colorMap = {
    blue: 'bg-technical-100 text-technical-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-social-100 text-social-600',
};

// Simple utility if clsx is not available
const cn = (...classes) => classes.filter(Boolean).join(' ');

export default function StatCard({ title, value, icon: Icon, color = 'blue', trend, subtitle, onClick }) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 relative overflow-hidden group",
                onClick && "cursor-pointer"
            )}
        >
            <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-xl transition-colors", colorMap[color])}>
                    <Icon size={24} />
                </div>
                {trend && (
                    <div className={cn(
                        "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                        trend.includes('+') ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                    )}>
                        {trend.includes('+') ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {trend}
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">{title}</p>

                {subtitle && (
                    <p className="text-xs text-slate-400 mt-2 font-medium border-t border-slate-50 pt-2">
                        {subtitle}
                    </p>
                )}
            </div>

            {/* Decorative background element */}
            <div className="absolute -right-4 -bottom-4 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none">
                <Icon size={120} />
            </div>
        </div>
    );
}
