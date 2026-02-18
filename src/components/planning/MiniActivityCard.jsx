const MiniActivityCard = ({ activity, onClick }) => {
    const priorityColors = {
        BAJA: 'bg-green-100 border-green-300 text-green-800',
        MEDIA: 'bg-yellow-100 border-yellow-300 text-yellow-800',
        ALTA: 'bg-orange-100 border-orange-300 text-orange-800',
        CRITICA: 'bg-red-100 border-red-300 text-red-800'
    };

    const statusIcons = {
        PLANIFICADA: '📋',
        ASIGNADA: '👤',
        EN_EJECUCION: '⚙️',
        COMPLETADA: '✅',
        CANCELADA: '❌'
    };

    return (
        <div
            onClick={onClick}
            className={`px-2 py-1 rounded border text-xs cursor-pointer hover:shadow-sm transition-shadow ${priorityColors[activity.priority] || 'bg-gray-100 border-gray-300 text-gray-800'
                }`}
            title={`${activity.title} - ${activity.activityTypeName || 'Sin tipo'}`}
        >
            <div className="flex items-center gap-1">
                <span className="text-xs">{statusIcons[activity.status] || '📋'}</span>
                <span className="truncate font-medium flex-1">
                    {activity.title}
                </span>
            </div>
        </div>
    );
};

export default MiniActivityCard;
