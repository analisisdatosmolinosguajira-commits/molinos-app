import { X, Calendar } from 'lucide-react';
import ActivityCard from './ActivityCard';

const DayActivitiesModal = ({ isOpen, onClose, day, onEditActivity, onDeleteActivity, onLinkMovement }) => {
    if (!isOpen || !day) return null;

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('es-CO', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-slate-50">
                        <div className="flex items-center gap-3">
                            <Calendar size={24} className="text-brand-600" />
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 capitalize">
                                    {formatDate(day.date)}
                                </h2>
                                <p className="text-sm text-slate-600 mt-0.5">
                                    {day.activities.length} {day.activities.length === 1 ? 'actividad' : 'actividades'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Activities List */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {day.activities.map((activity) => (
                                <ActivityCard
                                    key={activity.activity_id}
                                    activity={activity}
                                    onEdit={onEditActivity}
                                    onDelete={onDeleteActivity}
                                    onLinkMovement={onLinkMovement}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DayActivitiesModal;
