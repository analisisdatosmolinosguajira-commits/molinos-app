import React, { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Database, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../../services/supabase';

export default function RLSTestPage() {
    const [results, setResults] = useState([]);
    const [testing, setTesting] = useState(false);

    const addResult = (test, success, message, data = null) => {
        setResults(prev => [...prev, {
            test,
            success,
            message,
            data,
            timestamp: new Date().toLocaleTimeString()
        }]);
    };

    const clearResults = () => setResults([]);

    // TEST 1: INSERT Mill
    const testInsertMill = async () => {
        try {
            const { data, error } = await supabase
                .from('mill')
                .insert({
                    code: `TEST-RLS-${Date.now()}`,
                    name: 'Test Mill RLS Verification',
                    status: 'OPERATIONAL',
                    community_name: 'Test Community'
                })
                .select()
                .single();

            if (error) throw error;

            addResult(
                'INSERT Mill',
                true,
                'Mill created successfully!',
                data
            );
            return data;
        } catch (err) {
            addResult(
                'INSERT Mill',
                false,
                `Error: ${err.message}`,
                err
            );
            return null;
        }
    };

    // TEST 2: UPDATE Mill
    const testUpdateMill = async (millId) => {
        try {
            const { data, error } = await supabase
                .from('mill')
                .update({ name: 'Updated Test Mill RLS' })
                .eq('mill_id', millId)
                .select()
                .single();

            if (error) throw error;

            addResult(
                'UPDATE Mill',
                true,
                'Mill updated successfully!',
                data
            );
        } catch (err) {
            addResult(
                'UPDATE Mill',
                false,
                `Error: ${err.message}`,
                err
            );
        }
    };

    // TEST 3: DELETE Mill
    const testDeleteMill = async (millId) => {
        try {
            const { error } = await supabase
                .from('mill')
                .delete()
                .eq('mill_id', millId);

            if (error) throw error;

            addResult(
                'DELETE Mill',
                true,
                'Mill deleted successfully!',
                { millId }
            );
        } catch (err) {
            addResult(
                'DELETE Mill',
                false,
                `Error: ${err.message}`,
                err
            );
        }
    };

    // TEST 4: INSERT Pump
    const testInsertPump = async () => {
        try {
            const { data, error } = await supabase
                .from('pump')
                .insert({
                    serial_number: `TEST-PUMP-${Date.now()}`,
                    model: 'Test Pump Model',
                    origin: 'nueva',
                    status: 'almacenada',
                    storage_location: 'Test Storage'
                })
                .select()
                .single();

            if (error) throw error;

            addResult(
                'INSERT Pump',
                true,
                'Pump created successfully!',
                data
            );
            return data;
        } catch (err) {
            addResult(
                'INSERT Pump',
                false,
                `Error: ${err.message}`,
                err
            );
            return null;
        }
    };

    // TEST 5: UPDATE Pump
    const testUpdatePump = async (pumpId) => {
        try {
            const { data, error } = await supabase
                .from('pump')
                .update({ status: 'en_reparacion' })
                .eq('pump_id', pumpId)
                .select()
                .single();

            if (error) throw error;

            addResult(
                'UPDATE Pump',
                true,
                'Pump updated successfully!',
                data
            );
        } catch (err) {
            addResult(
                'UPDATE Pump',
                false,
                `Error: ${err.message}`,
                err
            );
        }
    };

    // TEST 6: DELETE Pump
    const testDeletePump = async (pumpId) => {
        try {
            const { error } = await supabase
                .from('pump')
                .delete()
                .eq('pump_id', pumpId);

            if (error) throw error;

            addResult(
                'DELETE Pump',
                true,
                'Pump deleted successfully!',
                { pumpId }
            );
        } catch (err) {
            addResult(
                'DELETE Pump',
                false,
                `Error: ${err.message}`,
                err
            );
        }
    };

    // RUN ALL TESTS
    const runAllTests = async () => {
        setTesting(true);
        clearResults();

        // Mill Tests
        const mill = await testInsertMill();
        if (mill) {
            await new Promise(resolve => setTimeout(resolve, 500));
            await testUpdateMill(mill.mill_id);
            await new Promise(resolve => setTimeout(resolve, 500));
            await testDeleteMill(mill.mill_id);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Pump Tests
        const pump = await testInsertPump();
        if (pump) {
            await new Promise(resolve => setTimeout(resolve, 500));
            await testUpdatePump(pump.pump_id);
            await new Promise(resolve => setTimeout(resolve, 500));
            await testDeletePump(pump.pump_id);
        }

        setTesting(false);
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-8 text-white shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                        <Database size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">RLS Policy Testing</h1>
                        <p className="text-brand-100">Verificación de políticas de seguridad en base de datos</p>
                    </div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                    <p className="text-sm text-brand-50">
                        <strong>Migration 001:</strong> Políticas permisivas para desarrollo aplicadas.
                        Este panel verifica que las operaciones INSERT, UPDATE, DELETE funcionan correctamente.
                    </p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Pruebas Disponibles</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <button
                        onClick={testInsertMill}
                        disabled={testing}
                        className="flex items-center gap-2 px-4 py-3 bg-green-50 text-green-700 font-semibold rounded-lg border border-green-200 hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                        <Plus size={18} />
                        INSERT Mill
                    </button>
                    <button
                        onClick={testInsertPump}
                        disabled={testing}
                        className="flex items-center gap-2 px-4 py-3 bg-brand-50 text-brand-700 font-semibold rounded-lg border border-brand-200 hover:bg-brand-100 transition-colors disabled:opacity-50"
                    >
                        <Plus size={18} />
                        INSERT Pump
                    </button>
                    <button
                        onClick={runAllTests}
                        disabled={testing}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/30 disabled:opacity-50 md:col-span-2 lg:col-span-1"
                    >
                        {testing ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Ejecutando...
                            </>
                        ) : (
                            <>
                                <Database size={18} />
                                Ejecutar Todas
                            </>
                        )}
                    </button>
                </div>

                <button
                    onClick={clearResults}
                    className="mt-4 w-full px-4 py-2 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors text-sm"
                >
                    Limpiar Resultados
                </button>
            </div>

            {/* Results */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Resultados de Pruebas</h2>

                {results.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <Database size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No hay resultados aún. Ejecuta una prueba para comenzar.</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {results.map((result, index) => (
                            <div
                                key={index}
                                className={`p-4 rounded-lg border-l-4 ${result.success
                                        ? 'bg-green-50 border-green-500'
                                        : 'bg-red-50 border-red-500'
                                    } animate-slide-up`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-1">
                                        {result.success ? (
                                            <CheckCircle2 size={20} className="text-green-600" />
                                        ) : (
                                            <XCircle size={20} className="text-red-600" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className={`font-bold ${result.success ? 'text-green-900' : 'text-red-900'
                                                }`}>
                                                {result.test}
                                            </h3>
                                            <span className="text-xs text-slate-400">
                                                {result.timestamp}
                                            </span>
                                        </div>
                                        <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'
                                            }`}>
                                            {result.message}
                                        </p>
                                        {result.data && (
                                            <details className="mt-2">
                                                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                                                    Ver datos
                                                </summary>
                                                <pre className="mt-2 p-2 bg-slate-900 text-slate-100 text-xs rounded overflow-x-auto">
                                                    {JSON.stringify(result.data, null, 2)}
                                                </pre>
                                            </details>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Summary */}
                {results.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-200">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-2xl font-bold text-slate-800">
                                    {results.length}
                                </p>
                                <p className="text-xs text-slate-500 uppercase">Total</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-green-600">
                                    {results.filter(r => r.success).length}
                                </p>
                                <p className="text-xs text-slate-500 uppercase">Exitosas</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-red-600">
                                    {results.filter(r => !r.success).length}
                                </p>
                                <p className="text-xs text-slate-500 uppercase">Fallidas</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Documentation */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-3">📋 Qué se está probando</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span><strong>INSERT:</strong> Verifica que se pueden crear registros nuevos en mill y pump</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-brand-600 font-bold">✓</span>
                        <span><strong>UPDATE:</strong> Verifica que se pueden modificar registros existentes</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold">✓</span>
                        <span><strong>DELETE:</strong> Verifica que se pueden eliminar registros de prueba</span>
                    </li>
                </ul>
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800">
                        <strong>Nota:</strong> Las pruebas crean y eliminan datos temporales con prefijo TEST-RLS.
                        Si alguna operación falla, revisa que las políticas RLS estén correctamente configuradas.
                    </p>
                </div>
            </div>
        </div>
    );
}
