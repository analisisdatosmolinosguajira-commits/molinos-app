import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import MiniActivityCard from './MiniActivityCard';
import DayActivitiesModal from './DayActivitiesModal';

const MonthlyCalendar = ({ activities, onEditActivity, onDeleteActivity, onLinkMovement }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);
    const [isDayModalOpen, setIsDayModalOpen] = useState(false);

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    // Get year and month from currentDate
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Calculate calendar grid
    const generateCalendarDays = () => {
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        // Get day of week (0 = Sunday, adjust to Monday = 0)
        let firstDayWeekday = firstDayOfMonth.getDay();
        firstDayWeekday = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1; // Monday = 0

        const daysInMonth = lastDayOfMonth.getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const calendarDays = [];

        // Previous month days
        for (let i = firstDayWeekday - 1; i >= 0; i--) {
            calendarDays.push({
                date: new Date(year, month - 1, daysInPrevMonth - i),
                isCurrentMonth: false
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            calendarDays.push({
                date: new Date(year, month, i),
                isCurrentMonth: true
            });
        }

        // Next month days to complete grid
        const remainingDays = 42 - calendarDays.length; // 6 weeks * 7 days
        for (let i = 1; i <= remainingDays; i++) {
            calendarDays.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            });
        }

        return calendarDays;
    };

    const getActivitiesForDay = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return activities.filter(activity => {
            if (!activity.planned_start_week) return false;

            const startDate = new Date(activity.planned_start_week);
            const endDate = activity.planned_end_week
                ? new Date(activity.planned_end_week)
                : startDate;

            // Check if date is within activity range
            const checkDate = new Date(dateStr);
            return checkDate >= startDate && checkDate <= endDate;
        });
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const handleDayClick = (date, dayActivities) => {
        if (dayActivities.length > 0) {
            setSelectedDay({ date, activities: dayActivities });
            setIsDayModalOpen(true);
        }
    };

    const isToday = (date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const calendarDays = generateCalendarDays();

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-slate-900">
                        {monthNames[month]} {year}
                    </h2>
                    <button
                        onClick={handleToday}
                        className="px-3 py-1.5 text-sm bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 transition-colors font-medium"
                    >
                        Hoy
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrevMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Mes anterior"
                    >
                        <ChevronLeft size={20} className="text-slate-700" />
                    </button>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Mes siguiente"
                    >
                        <ChevronRight size={20} className="text-slate-700" />
                    </button>
                </div>
            </div>

            {/* Day names header */}
            <div className="grid grid-cols-7 border-b border-gray-200">
                {dayNames.map(day => (
                    <div
                        key={day}
                        className="py-2 px-1 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide bg-slate-50"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                    const dayActivities = getActivitiesForDay(day.date);
                    const hasActivities = dayActivities.length > 0;
                    const isTodayDate = isToday(day.date);

                    return (
                        <div
                            key={index}
                            className={`min-h-[100px] p-2 border-r border-b border-gray-200 ${!day.isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                                } ${hasActivities ? 'cursor-pointer hover:bg-brand-50' : ''} transition-colors`}
                            onClick={() => handleDayClick(day.date, dayActivities)}
                        >
                            {/* Day number */}
                            <div className="flex items-center justify-between mb-1">
                                <span
                                    className={`text-sm font-medium ${!day.isCurrentMonth
                                            ? 'text-gray-400'
                                            : isTodayDate
                                                ? 'bg-brand-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs'
                                                : 'text-slate-700'
                                        }`}
                                >
                                    {day.date.getDate()}
                                </span>
                                {hasActivities && (
                                    <span className="text-xs text-slate-500 font-medium">
                                        {dayActivities.length}
                                    </span>
                                )}
                            </div>

                            {/* Activities */}
                            <div className="space-y-1">
                                {dayActivities.slice(0, 3).map((activity) => (
                                    <MiniActivityCard
                                        key={activity.activity_id}
                                        activity={activity}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEditActivity(activity);
                                        }}
                                    />
                                ))}
                                {dayActivities.length > 3 && (
                                    <div className="text-xs text-slate-500 font-medium pl-1">
                                        +{dayActivities.length - 3} más
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Day Activities Modal */}
            <DayActivitiesModal
                isOpen={isDayModalOpen}
                onClose={() => setIsDayModalOpen(false)}
                day={selectedDay}
                onEditActivity={onEditActivity}
                onDeleteActivity={onDeleteActivity}
                onLinkMovement={onLinkMovement}
            />
        </div>
    );
};

export default MonthlyCalendar;
