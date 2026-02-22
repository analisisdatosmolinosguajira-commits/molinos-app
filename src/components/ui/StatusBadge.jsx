import React from 'react';

const statusStyles = {
    // Legacy / Generic
    abierta: 'bg-blue-100 text-blue-700 border-blue-200',
    en_proceso: 'bg-blue-100 text-blue-700 border-blue-200',
    programada: 'bg-slate-100 text-slate-700 border-slate-200',
    cerrada: 'bg-green-100 text-green-700 border-green-200',
    atrasada: 'bg-rose-100 text-rose-700 border-rose-200',
    critica: 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse',

    // Assets
    operativo: 'bg-green-100 text-green-700 border-green-200',
    operational: 'bg-green-100 text-green-700 border-green-200',
    mantenimiento: 'bg-amber-100 text-amber-700 border-amber-200',
    maintenance: 'bg-amber-100 text-amber-700 border-amber-200',
    inactivo: 'bg-rose-100 text-rose-700 border-rose-200',
    inactive: 'bg-rose-100 text-rose-700 border-rose-200',
    damaged: 'bg-rose-100 text-rose-700 border-rose-200',

    // Concertation
    activa: 'bg-purple-100 text-purple-700 border-purple-200',
    firmada: 'bg-purple-100 text-purple-700 border-purple-200',
    signed: 'bg-purple-100 text-purple-700 border-purple-200',
    pendiente: 'bg-slate-100 text-slate-600 border-slate-200',
    finalizada: 'bg-green-100 text-green-700 border-green-200',
    cancelada: 'bg-red-50 text-red-700 border-red-200',

    // DB Values - Work Orders (English)
    pending: 'bg-blue-50 text-blue-700 border-blue-200',
    in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-slate-50 text-slate-500 border-slate-200',
    on_hold: 'bg-slate-50 text-slate-500 border-slate-200',

    // Priorities
    critical: 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-blue-100 text-blue-700 border-blue-200',
    low: 'bg-slate-100 text-slate-700 border-slate-200',

    // DB Values - Pumps
    instalada: 'bg-green-50 text-green-700 border-green-200',
    installed: 'bg-green-50 text-green-700 border-green-200',
    almacenada: 'bg-blue-50 text-blue-700 border-blue-200',
    in_stock: 'bg-blue-50 text-blue-700 border-blue-200',
    available: 'bg-blue-50 text-blue-700 border-blue-200',
    en_reparacion: 'bg-amber-50 text-amber-700 border-amber-200',
    descartada: 'bg-red-50 text-red-700 border-red-200',
    discarded: 'bg-red-50 text-red-700 border-red-200'
};

const labels = {
    abierta: 'Abierta',
    en_proceso: 'En Proceso',
    programada: 'Programada',
    cerrada: 'Cerrada',
    atrasada: 'Atrasada',
    critica: 'Crítica',
    operativo: 'Operativo',
    mantenimiento: 'En Mantenimiento',
    inactivo: 'Inactivo',
    activa: 'Activa',
    firmada: 'Firmada',

    // English Mappings
    operational: 'Operativo',
    maintenance: 'En Mantenimiento',
    inactive: 'Inactivo',
    damaged: 'Dañado',
    active: 'Activa',
    signed: 'Firmada',

    // Priorities
    critical: 'Crítica',
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',

    // DB Mappings
    pending: 'Pendiente',
    in_progress: 'En Progreso',
    completed: 'Completada',
    cancelled: 'Cancelada',
    on_hold: 'En Espera',

    instalada: 'Instalada',
    installed: 'Instalada',
    almacenada: 'En Almacén',
    in_stock: 'En Almacén',
    available: 'Disponible',
    en_reparacion: 'En Reparación',
    descartada: 'Descartada',
    discarded: 'Descartada',

    finalizada: 'Finalizada'
};

export default function StatusBadge({ status, size = 'md', className = '' }) {
    if (!status) return null;
    const normalized = status.toLowerCase();
    const style = statusStyles[normalized] || 'bg-slate-100 text-slate-600 border-slate-200';
    const label = labels[normalized] || status;
    const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

    return (
        <span className={`inline-flex items-center justify-center font-semibold rounded-lg border ${style} ${sizeClass} ${className}`}>
            {label}
        </span>
    );
}
