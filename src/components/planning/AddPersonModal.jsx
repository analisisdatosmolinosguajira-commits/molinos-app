import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../services/supabase';

const AddPersonModal = ({ isOpen, onClose, onAdd, movementId }) => {
    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPerson, setSelectedPerson] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadPeople();
            setSelectedPerson(null);
            setSearchTerm('');
        }
    }, [isOpen]);

    const loadPeople = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('person')
                .select('person_id, first_name, last_name, document_id')
                .order('first_name');

            if (error) throw error;
            setPeople(data || []);
        } catch (error) {
            console.error("Error loading people:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPeople = people.filter(person => {
        const searchLower = searchTerm.toLowerCase();
        const fullName = `${person.first_name} ${person.last_name}`.toLowerCase();
        return (
            fullName.includes(searchLower) ||
            person.document_id?.includes(searchLower)
        );
    });

    const handleConfirm = () => {
        if (selectedPerson) {
            onAdd(selectedPerson.person_id);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Agregar Persona al Viaje</h2>
                        <p className="text-slate-500 text-sm mt-1">Selecciona una persona para controlar su asistencia</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o documento..."
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-50/30">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <div className="animate-spin mb-3">⟳</div>
                            <p>Cargando personas...</p>
                        </div>
                    ) : filteredPeople.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <UserPlus size={48} className="mx-auto mb-3 opacity-20" />
                            <p>No se encontraron personas.</p>
                        </div>
                    ) : (
                        filteredPeople.map(person => (
                            <div
                                key={person.person_id}
                                onClick={() => setSelectedPerson(person)}
                                className={`
                                    relative p-4 rounded-xl border cursor-pointer transition-all duration-200 group
                                    ${selectedPerson?.person_id === person.person_id
                                        ? 'bg-green-50 border-green-500 shadow-md ring-1 ring-green-500'
                                        : 'bg-white border-slate-200 hover:border-green-300 hover:shadow-sm'
                                    }
                                `}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold">
                                            {person.first_name?.[0]}{person.last_name?.[0]}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-800 group-hover:text-green-700 transition-colors">
                                                {person.first_name} {person.last_name}
                                            </div>
                                            <div className="text-xs text-slate-500 font-mono">
                                                {person.document_id || 'Sin documento'}
                                            </div>
                                        </div>
                                    </div>
                                    {selectedPerson?.person_id === person.person_id && (
                                        <div className="bg-green-600 text-white p-1 rounded-full shadow-sm animate-in zoom-in duration-200">
                                            <CheckCircle2 size={14} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 bg-white rounded-b-2xl flex justify-end gap-3 z-10">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedPerson}
                        className={`
                            px-6 py-2.5 rounded-xl font-bold text-white transition-all shadow-lg flex items-center gap-2
                            ${selectedPerson
                                ? 'bg-green-600 hover:bg-green-700 hover:shadow-green-500/25 active:scale-95'
                                : 'bg-slate-300 cursor-not-allowed shadow-none'}
                        `}
                    >
                        <UserPlus size={16} />
                        Agregar Persona
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddPersonModal;
