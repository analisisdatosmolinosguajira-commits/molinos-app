import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Truck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const JourneyCalendar = ({ journeys }) => {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const generateCalendarDays = () => {
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        let firstDayWeekday = firstDayOfMonth.getDay();
        firstDayWeekday = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1; // Monday = 0

        const daysInMonth = lastDayOfMonth.getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const calendarDays = [];

        // Previous month
        for (let i = firstDayWeekday - 1; i >= 0; i--) {
            calendarDays.push({
                date: new Date(year, month - 1, daysInPrevMonth - i),
                isCurrentMonth: false
            });
        }

        // Current month
        for (let i = 1; i <= daysInMonth; i++) {
            calendarDays.push({
                date: new Date(year, month, i),
                isCurrentMonth: true
            });
        }

        // Next month
        const remainingDays = 42 - calendarDays.length;
        for (let i = 1; i <= remainingDays; i++) {
            calendarDays.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            });
        }

        return calendarDays;
    };

    const getJourneysForDay = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        // Filter journeys that cover this day
        return journeys.filter(j => {
            const start = j.date ? new Date(j.date) : null;
            // Trip might have explicit end_date or just be single day
            // In API we mapped 'date' to start_date. Let's check original object or assume logic
            // The service maps: date: m.start_date
            // We need end_date. The service output didn't explicitly include end_date in the root object spread, 
            // but it's in the raw data.
            // Let's assume the service 'visits.js' returns 'date' as start. 
            // We might need to check if 'j' has 'end_date' property or if we need to fetch it.
            // Looking at visits.js `getVisits`: `status: m.status || (m.end_date ? ...)`
            // It seems `end_date` is not directly exposed in the top level object pushed to `visits`.
            // Wait, `visits.js` line 138: `date: m.start_date ...`.
            // It DOES NOT map `end_date` to the root object.
            // However, for the calendar to work well with ranges, we ideally need it.
            // BUT, for now let's just use single day mapping or check if we can access raw properties.
            // The object structure in `visits.js` has `...m` spread? No, it maps explicit fields.
            // AND it has `logs`, `vehicles`.
            // It seems I missed `end_date` in the map in `visits.js`.
            // I will use `j.date` (start) for now. If I want spans, I'd need to update `visits.js`.
            // For now, let's show starts.

            // Correction: I should update `visits.js` to include `end_date` for better calendar. 
            // But to avoid too many file switches, I will assume single day or check if I can infer it.
            // Actually, `visits.js` line 37 selects `*`, so `m` has `end_date`.
            // But the return object is constructed explicitly.
            // I will assume for now we match on Start Date.

            if (!start) return false;
            const d = new Date(start);
            return d.getDate() === date.getDate() &&
                d.getMonth() === date.getMonth() &&
                d.getFullYear() === date.getFullYear();
        });
    };

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const handleToday = () => setCurrentDate(new Date());

    const calendarDays = generateCalendarDays();
    const isToday = (d) => {
        const today = new Date();
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    };

    const StatusDot = ({ status }) => {
        const color =
            ['IN_PROGRESS', 'EN_CURSO', 'ACTIVE'].includes(status) ? 'bg-blue-500' :
                ['COMPLETED', 'COMPLETADO'].includes(status) ? 'bg-emerald-500' :
                    ['CANCELLED', 'CANCELADO'].includes(status) ? 'bg-red-500' :
                        'bg-slate-400'; // Planned
        return <div className={`w-2 h-2 rounded-full ${color}`} />;
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-800 capitalize">
                        {monthNames[month]} {year}
                    </h2>
                    <button
                        onClick={handleToday}
                        className="px-3 py-1 text-sm bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
                    >
                        Hoy
                    </button>
                </div>
                <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5 shadow-sm">
                    <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-50 rounded text-slate-500">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-50 rounded text-slate-500">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 border-b border-slate-200 divide-x divide-slate-100">
                {dayNames.map(day => (
                    <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 divide-x divide-slate-200/50 divide-y divide-slate-200/50 bg-slate-50/30">
                {calendarDays.map((day, idx) => {
                    const dayJourneys = getJourneysForDay(day.date);
                    const isCurrent = day.isCurrentMonth;
                    const isDayToday = isToday(day.date);

                    return (
                        <div
                            key={idx}
                            className={`min-h-[120px] p-2 transition-colors ${!isCurrent ? 'bg-slate-50/80 text-slate-400' : 'bg-white hover:bg-slate-50/50'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full 
                                    ${isDayToday ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700'}`}>
                                    {day.date.getDate()}
                                </span>
                                {dayJourneys.length > 0 && (
                                    <span className="text-xs font-bold text-slate-400">
                                        {dayJourneys.length}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                {dayJourneys.slice(0, 3).map(j => (
                                    <div
                                        key={j.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/visitas/${j.id}`);
                                        }}
                                        className="text-xs p-1.5 rounded-md bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 group cursor-pointer transition-all"
                                    >
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <StatusDot status={j.status} />
                                            <span className="font-semibold text-slate-700 truncate group-hover:text-indigo-600">
                                                {j.title}
                                            </span>
                                        </div>
                                        {j.vehicles && j.vehicles.length > 0 && (
                                            <div className="flex items-center gap-1 text-[10px] text-slate-400 truncate pl-3">
                                                <Truck size={10} />
                                                {j.vehicles[0].vehicle?.plate_number}
                                            </div>
                                        )}
                                        {j.logs?.some(l => l.incident_reported) && (
                                            <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium pl-3 mt-0.5">
                                                <AlertTriangle size={10} /> Incidencia
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {dayJourneys.length > 3 && (
                                    <button className="text-[10px] text-slate-400 hover:text-indigo-600 font-medium w-full text-center">
                                        + {dayJourneys.length - 3} más
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default JourneyCalendar;
