import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, User, CheckCircle, Loader2, X, ArrowRight } from 'lucide-react';

/**
 * OnboardingModal - Shows automatically if profile.onboarding_complete === false
 * Lets the user search and select their person record to link to their account.
 */
export default function OnboardingModal() {
    const { user, profile, refreshProfile } = useAuth();
    const [persons, setPersons] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const isOpen = profile && profile.onboarding_complete === false && !profile.person_id;

    useEffect(() => {
        if (isOpen) loadAvailablePersons();
    }, [isOpen]);

    const loadAvailablePersons = async () => {
        // Get persons NOT already linked to a user_profile
        const { data: linkedIds } = await supabase.from('user_profile').select('person_id').not('person_id', 'is', null);
        const linkedSet = new Set((linkedIds || []).map(r => r.person_id));

        const { data } = await supabase.from('person').select('person_id, first_name, last_name, document_id, email, person_role(name)')
            .eq('active', true).order('first_name');
        setPersons((data || []).filter(p => !linkedSet.has(p.person_id)));
    };

    const handleLink = async () => {
        if (!selectedPerson || !user) return;
        setSaving(true);
        try {
            const { error } = await supabase.from('user_profile')
                .update({ person_id: selectedPerson.person_id, onboarding_complete: true })
                .eq('id', user.id);
            if (error) throw error;
            setSuccess(true);
            setTimeout(() => {
                refreshProfile();
            }, 1500);
        } catch (err) {
            console.error('Onboarding error:', err);
            alert('Error vinculando tu perfil: ' + err.message);
        } finally { setSaving(false); }
    };

    if (!isOpen) return null;

    const filtered = persons.filter(p =>
        `${p.first_name} ${p.last_name} ${p.document_id}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
                    <h2 className="text-xl font-bold">¡Bienvenido a Molinos!</h2>
                    <p className="text-brand-200 text-sm mt-1">
                        Vincula tu cuenta con tu registro de persona para personalizar tu experiencia.
                    </p>
                </div>

                {success ? (
                    <div className="p-8 text-center">
                        <CheckCircle size={48} className="text-emerald-500 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-slate-800">¡Vinculación exitosa!</h3>
                        <p className="text-sm text-slate-500 mt-1">Tu perfil se está actualizando...</p>
                    </div>
                ) : (
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Buscar tu nombre
                            </label>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text"
                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    placeholder="Buscar por nombre o cédula..."
                                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                    autoFocus />
                            </div>
                        </div>

                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                            {filtered.slice(0, 30).map(p => (
                                <button key={p.person_id} onClick={() => setSelectedPerson(p)}
                                    className={`w-full text-left px-3 py-2.5 text-sm border-b border-slate-100 last:border-0 transition-colors ${selectedPerson?.person_id === p.person_id
                                        ? 'bg-brand-50 text-brand-700 font-semibold'
                                        : 'hover:bg-slate-50'
                                        }`}>
                                    <span className="font-medium">{p.first_name} {p.last_name}</span>
                                    <span className="text-slate-400 ml-2 text-xs">CC {p.document_id}</span>
                                </button>
                            ))}
                            {filtered.length === 0 && (
                                <p className="p-3 text-xs text-slate-400 text-center">No se encontraron personas</p>
                            )}
                        </div>

                        {selectedPerson && (
                            <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl">
                                <p className="text-sm font-bold text-brand-700">
                                    {selectedPerson.first_name} {selectedPerson.last_name}
                                </p>
                                <p className="text-xs text-brand-500">CC {selectedPerson.document_id}</p>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                            <p className="text-xs text-slate-400">
                                ¿No te encuentras? Contacta al supervisor.
                            </p>
                            <button onClick={handleLink} disabled={saving || !selectedPerson}
                                className="px-5 py-2.5 bg-brand-600 text-white font-semibold rounded-xl text-sm hover:bg-brand-500 disabled:opacity-40 flex items-center gap-2">
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                                Vincular mi perfil
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
