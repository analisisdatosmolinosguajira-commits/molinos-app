import { useState, useEffect } from 'react';
import { Users, ChevronDown, User } from 'lucide-react';
import { CrewService } from '../../services/crews';

const CrewAssignmentSelector = ({ value, onChange, disabled = false }) => {
    const [crews, setCrews] = useState([]);
    const [selectedCrew, setSelectedCrew] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        loadCrews();
    }, []);

    useEffect(() => {
        if (value && crews.length > 0) {
            const crew = crews.find(c => c.crew_id === value);
            setSelectedCrew(crew);
        }
    }, [value, crews]);

    const loadCrews = async () => {
        try {
            setLoading(true);
            const data = await CrewService.getActiveCrews();
            setCrews(data);
        } catch (error) {
            console.error('Error loading crews:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (crew) => {
        setSelectedCrew(crew);
        onChange?.(crew.crew_id);
        setIsOpen(false);
    };

    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="h-10 bg-gray-200 rounded-lg"></div>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Selector Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border rounded-lg text-left transition-colors ${disabled
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    } ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300'}`}
            >
                <div className="flex items-center gap-3">
                    <Users size={18} className={selectedCrew ? 'text-blue-600' : 'text-gray-400'} />
                    <div>
                        {selectedCrew ? (
                            <div>
                                <div className="font-medium text-slate-900">{selectedCrew.name}</div>
                                <div className="text-xs text-slate-500">
                                    {selectedCrew.memberCount || 0} miembros
                                </div>
                            </div>
                        ) : (
                            <span className="text-slate-500">Seleccionar cuadrilla...</span>
                        )}
                    </div>
                </div>
                <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown */}
            {isOpen && !disabled && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    ></div>

                    {/* Options */}
                    <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {crews.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                No hay cuadrillas disponibles
                            </div>
                        ) : (
                            crews.map((crew) => (
                                <button
                                    key={crew.crew_id}
                                    type="button"
                                    onClick={() => handleSelect(crew)}
                                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 ${selectedCrew?.crew_id === crew.crew_id ? 'bg-blue-50' : ''
                                        }`}
                                >
                                    <Users size={18} className="text-blue-600 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="font-medium text-slate-900">{crew.name}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            {crew.memberCount || 0} miembros
                                        </div>
                                        {crew.members && crew.members.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {crew.members.slice(0, 3).map((member, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-full text-xs text-slate-600"
                                                    >
                                                        <User size={10} />
                                                        {member.name}
                                                    </span>
                                                ))}
                                                {crew.members.length > 3 && (
                                                    <span className="text-xs text-slate-500 px-2 py-0.5">
                                                        +{crew.members.length - 3} más
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default CrewAssignmentSelector;
