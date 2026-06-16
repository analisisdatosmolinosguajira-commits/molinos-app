import React, { useState } from 'react';
import { Save, Upload, Edit3, X, User } from 'lucide-react';
import { CrewService } from '../../services/crews';

export default function CrewSignatureEditor({ crew, onUpdated }) {
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const [leaderName, setLeaderName] = useState(crew?.leader_name || '');
    const [leaderDocument, setLeaderDocument] = useState(crew?.leader_document || '');
    const [leaderRole, setLeaderRole] = useState(crew?.leader_role || '');
    const [signatureUrl, setSignatureUrl] = useState(crew?.signature_url || '');
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const signatureData = {
                leader_name: leaderName,
                leader_document: leaderDocument,
                leader_role: leaderRole,
                signature_url: signatureUrl
            };
            const updated = await CrewService.updateCrewSignature(crew.crew_id, signatureData, imageFile);
            setSignatureUrl(updated.signature_url);
            setIsEditing(false);
            if (onUpdated) onUpdated(updated);
            alert("Firma actualizada correctamente.");
        } catch (error) {
            console.error("Error saving signature:", error);
            alert("Error al guardar la firma.");
        } finally {
            setSaving(false);
        }
    };

    if (!isEditing) {
        return (
            <div className="p-6 border-t border-slate-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Firma Autorizada</h3>
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="text-brand-600 text-sm font-semibold flex items-center gap-1 hover:text-brand-700"
                    >
                        <Edit3 size={16} /> Editar Firma
                    </button>
                </div>
                
                {signatureUrl ? (
                    <div className="flex items-start gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex-1">
                            <p className="font-bold text-slate-800">{leaderName}</p>
                            <p className="text-sm text-slate-500">{leaderRole}</p>
                            <p className="text-xs text-slate-400 mt-1">CC: {leaderDocument}</p>
                        </div>
                        <div className="w-32 h-20 bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-center">
                            <img src={signatureUrl} alt="Firma" className="max-w-full max-h-full object-contain" />
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500">
                        No hay firma registrada para esta cuadrilla.
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-6 border-t border-slate-100 bg-brand-50/30">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Editar Firma Autorizada</h3>
                <button 
                    onClick={() => setIsEditing(false)}
                    className="text-slate-400 hover:text-slate-600"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Nombre Completo</label>
                    <input 
                        type="text" 
                        value={leaderName}
                        onChange={e => setLeaderName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" 
                        placeholder="Ej: Juan Pérez"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Cédula</label>
                    <input 
                        type="text" 
                        value={leaderDocument}
                        onChange={e => setLeaderDocument(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" 
                        placeholder="Ej: 12345678"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Cargo</label>
                    <input 
                        type="text" 
                        value={leaderRole}
                        onChange={e => setLeaderRole(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" 
                        placeholder="Ej: Técnico Líder"
                    />
                </div>
            </div>

            <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 mb-1">Imagen de Firma (Fondo blanco o transparente)</label>
                <div className="flex items-center gap-4">
                    <label className="flex-1 border-2 border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 hover:border-brand-400 transition-colors">
                        <Upload className="mx-auto text-slate-400 mb-2" size={24} />
                        <span className="text-sm font-medium text-brand-600">Subir nueva imagen</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </label>
                    {(previewUrl || signatureUrl) && (
                        <div className="w-32 h-20 bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center shrink-0 shadow-sm">
                            <img src={previewUrl || signatureUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end">
                <button 
                    onClick={handleSave}
                    disabled={saving || (!leaderName && !imageFile && !signatureUrl)}
                    className="bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-brand-700 disabled:opacity-50"
                >
                    {saving ? <Upload size={16} className="animate-pulse" /> : <Save size={16} />}
                    {saving ? 'Guardando...' : 'Guardar Firma'}
                </button>
            </div>
        </div>
    );
}
