import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import './MigrationsTestPage.css';

const MigrationsTestPage = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ total: 0, passed: 0, failed: 0 });

    const addResult = (category, testName, success, message, data = null) => {
        const result = {
            id: Date.now() + Math.random(),
            category,
            testName,
            success,
            message,
            data,
            timestamp: new Date().toLocaleTimeString()
        };
        setResults(prev => [result, ...prev]);
        setStats(prev => ({
            total: prev.total + 1,
            passed: success ? prev.passed + 1 : prev.passed,
            failed: success ? prev.failed : prev.failed + 1
        }));
    };

    const clearResults = () => {
        setResults([]);
        setStats({ total: 0, passed: 0, failed: 0 });
    };

    // ============================================
    // WORK ORDER TESTS (Migration 004)
    // ============================================
    const testWorkOrderTimestamps = async () => {
        try {
            // Get a mill
            const { data: mill } = await supabase.from('mill').select('mill_id').limit(1).single();

            if (!mill) throw new Error('No mill found');

            // Create work order
            const { data: wo, error: createError } = await supabase
                .from('work_order')
                .insert({
                    mill_id: mill.mill_id,
                    type: 'preventivo',
                    status: 'PENDING',
                    description: 'Test timestamps'
                })
                .select('work_order_id, created_at, updated_at')
                .single();

            if (createError) throw createError;

            const originalUpdatedAt = wo.updated_at;

            // Wait and update
            await new Promise(resolve => setTimeout(resolve, 100));

            const { data: updated, error: updateError } = await supabase
                .from('work_order')
                .update({ status: 'IN_PROGRESS' })
                .eq('work_order_id', wo.work_order_id)
                .select('updated_at')
                .single();

            if (updateError) throw updateError;

            // Cleanup (silently catch errors)
            await supabase.from('work_order').delete().eq('work_order_id', wo.work_order_id).then(() => { }).catch(() => { });

            const timestampChanged = new Date(updated.updated_at) > new Date(originalUpdatedAt);

            addResult(
                'Work Order',
                'Timestamp Auto-Update',
                timestampChanged,
                timestampChanged ? 'updated_at changed automatically' : 'Trigger did not fire',
                { original: originalUpdatedAt, updated: updated.updated_at }
            );
        } catch (error) {
            addResult('Work Order', 'Timestamp Auto-Update', false, error.message);
        }
    };

    const testWorkOrderPumpColumns = async () => {
        try {
            const { data: mill } = await supabase.from('mill').select('mill_id').limit(1).single();
            const { data: pump } = await supabase.from('pump').select('pump_id').limit(1).single();

            const { data: wo, error } = await supabase
                .from('work_order')
                .insert({
                    mill_id: mill.mill_id,
                    type: 'correctivo',
                    status: 'PENDING',
                    description: 'Test pump columns',
                    pump_id_to_install: pump.pump_id,
                    pump_installation_notes: 'Test notes for pump installation'
                })
                .select('*')
                .single();

            if (error) throw error;

            // Cleanup
            await supabase.from('work_order').delete().eq('work_order_id', wo.work_order_id);

            const hasColumns = wo.pump_id_to_install && wo.pump_installation_notes;

            addResult(
                'Work Order',
                'Pump Lifecycle Columns',
                hasColumns,
                hasColumns ? 'Pump columns working' : 'Missing pump columns',
                { pump_id_to_install: wo.pump_id_to_install, notes: wo.pump_installation_notes }
            );
        } catch (error) {
            addResult('Work Order', 'Pump Lifecycle Columns', false, error.message);
        }
    };

    const testWorkOrderInvalidPumpFK = async () => {
        try {
            const { data: mill } = await supabase.from('mill').select('mill_id').limit(1).single();

            const { error } = await supabase
                .from('work_order')
                .insert({
                    mill_id: mill.mill_id,
                    type: 'correctivo',
                    status: 'PENDING',
                    pump_id_to_install: 99999 // Invalid pump_id
                });

            const constraintWorked = error && error.code === '23503'; // FK violation

            addResult(
                'Work Order',
                'FK Constraint (Invalid Pump)',
                constraintWorked,
                constraintWorked ? 'FK constraint blocked invalid pump_id' : 'FK constraint failed',
                { errorCode: error?.code }
            );
        } catch (error) {
            addResult('Work Order', 'FK Constraint (Invalid Pump)', false, error.message);
        }
    };

    // ============================================
    // DIAGNOSIS COMPONENT STATUS (Migration 005)
    // ============================================
    const testDiagnosisComponentStatus = async () => {
        try {
            const { data: diagnosis } = await supabase
                .from('diagnosis')
                .select('diagnosis_id')
                .limit(1)
                .single();

            const { data: component } = await supabase
                .from('mill_component')
                .select('component_id')
                .limit(1)
                .single();

            if (!diagnosis || !component) {
                throw new Error('Missing diagnosis or component data');
            }

            const { data: observation, error } = await supabase
                .from('diagnosis_component_status')
                .insert({
                    diagnosis_id: diagnosis.diagnosis_id,
                    component_id: component.component_id,
                    status: 'FUNCIONAL',
                    observation: 'Test observation',
                    deterioration_notes: 'No issues detected'
                })
                .select()
                .single();

            if (error) throw error;

            // Cleanup
            await supabase.from('diagnosis_component_status').delete().eq('id', observation.id);

            addResult(
                'Diagnosis Component',
                'Create Observation',
                true,
                'Component observation created successfully',
                observation
            );
        } catch (error) {
            addResult('Diagnosis Component', 'Create Observation', false, error.message);
        }
    };

    const testDiagnosisComponentInvalidStatus = async () => {
        try {
            const { data: diagnosis } = await supabase.from('diagnosis').select('diagnosis_id').limit(1).single();
            const { data: component } = await supabase.from('mill_component').select('component_id').limit(1).single();

            const { error } = await supabase
                .from('diagnosis_component_status')
                .insert({
                    diagnosis_id: diagnosis.diagnosis_id,
                    component_id: component.component_id,
                    status: 'INVALID_STATUS' // Should fail CHECK constraint
                });

            const constraintWorked = error && error.code === '23514'; // CHECK violation

            addResult(
                'Diagnosis Component',
                'CHECK Constraint (Invalid Status)',
                constraintWorked,
                constraintWorked ? 'CHECK constraint blocked invalid status' : 'CHECK constraint failed',
                { errorCode: error?.code }
            );
        } catch (error) {
            addResult('Diagnosis Component', 'CHECK Constraint (Invalid Status)', false, error.message);
        }
    };

    // ============================================
    // ANALYTICAL VIEWS (Migration 006)
    // ============================================
    const testMillProfileView = async () => {
        try {
            const { data, error } = await supabase
                .from('mill_profile')
                .select('*')
                .limit(5);

            if (error) throw error;

            const hasData = data && data.length > 0;
            const hasStats = data[0]?.total_work_orders !== undefined;

            addResult(
                'Views',
                'mill_profile',
                hasData && hasStats,
                hasData ? `Retrieved ${data.length} mills with statistics` : 'No data returned',
                data[0]
            );
        } catch (error) {
            addResult('Views', 'mill_profile', false, error.message);
        }
    };

    const testPumpPerformanceView = async () => {
        try {
            const { data, error } = await supabase
                .from('pump_performance_metrics')
                .select('*')
                .limit(5);

            if (error) throw error;

            const hasData = data && data.length > 0;
            const hasMetrics = data[0]?.total_installations !== undefined;

            addResult(
                'Views',
                'pump_performance_metrics',
                hasData && hasMetrics,
                hasData ? `Retrieved ${data.length} pumps with metrics` : 'No data returned',
                data[0]
            );
        } catch (error) {
            addResult('Views', 'pump_performance_metrics', false, error.message);
        }
    };

    const testComponentHistoryView = async () => {
        try {
            const { data, error } = await supabase
                .from('component_state_history')
                .select('*')
                .limit(10);

            if (error) throw error;

            const hasData = data && data.length > 0;

            addResult(
                'Views',
                'component_state_history',
                hasData,
                hasData ? `Retrieved ${data.length} component observations` : 'No data returned',
                data[0]
            );
        } catch (error) {
            addResult('Views', 'component_state_history', false, error.message);
        }
    };

    // ============================================
    // TRIGGER TESTS (Migration 007)
    // ============================================
    const testPumpLifecycleTrigger = async () => {
        try {
            // Get a pump in storage and a mill
            const { data: pump } = await supabase
                .from('pump')
                .select('pump_id')
                .eq('status', 'almacenada')
                .limit(1)
                .single();

            const { data: mill } = await supabase.from('mill').select('mill_id').limit(1).single();

            if (!pump || !mill) {
                throw new Error('No pump in storage or mill available for testing');
            }

            // Create work order
            const { data: wo, error: woError } = await supabase
                .from('work_order')
                .insert({
                    mill_id: mill.mill_id,
                    type: 'correctivo',
                    status: 'IN_PROGRESS',
                    pump_id_to_install: pump.pump_id,
                    pump_installation_notes: 'Trigger test installation'
                })
                .select()
                .single();

            if (woError) throw woError;

            // Complete work order (should trigger pump lifecycle)
            await supabase
                .from('work_order')
                .update({ status: 'COMPLETED', end_date: new Date().toISOString() })
                .eq('work_order_id', wo.work_order_id);

            // Wait for trigger to execute
            await new Promise(resolve => setTimeout(resolve, 500));

            // Check pump status changed
            const { data: updatedPump } = await supabase
                .from('pump')
                .select('status')
                .eq('pump_id', pump.pump_id)
                .single();

            // Check pump_event created
            const { data: events } = await supabase
                .from('pump_event')
                .select('*')
                .eq('pump_id', pump.pump_id)
                .eq('event_type', 'installation')
                .order('event_date', { ascending: false })
                .limit(1);

            const triggerWorked = updatedPump.status === 'instalada' && events.length > 0;

            // Cleanup (silently catch errors)
            await supabase.from('work_order').delete().eq('work_order_id', wo.work_order_id).then(() => { }).catch(() => { });
            if (events && events.length > 0) {
                await supabase.from('pump_event').delete().eq('event_id', events[0].event_id).then(() => { }).catch(() => { });
            }
            await supabase.from('mill_pump').delete().eq('pump_id', pump.pump_id).eq('mill_id', mill.mill_id).then(() => { }).catch(() => { });
            await supabase.from('pump').update({ status: 'almacenada' }).eq('pump_id', pump.pump_id).then(() => { }).catch(() => { });

            addResult(
                'Triggers',
                'Pump Lifecycle (Installation)',
                triggerWorked,
                triggerWorked
                    ? 'Trigger updated pump status and created event'
                    : 'Trigger did not execute properly',
                { pumpStatus: updatedPump.status, eventCreated: events.length > 0 }
            );
        } catch (error) {
            addResult('Triggers', 'Pump Lifecycle (Installation)', false, error.message);
        }
    };

    // ============================================
    // MILL ENHANCEMENTS (Migration 002)
    // ============================================
    const testMillStatusConstraint = async () => {
        try {
            const { error } = await supabase
                .from('mill')
                .insert({
                    code: 'TEST-INVALID',
                    name: 'Test Invalid Status',
                    status: 'INVALID_STATUS' // Should fail
                });

            const constraintWorked = error && error.code === '23514';

            addResult(
                'Mill Constraints',
                'Status CHECK Constraint',
                constraintWorked,
                constraintWorked ? 'CHECK constraint blocked invalid status' : 'CHECK failed',
                { errorCode: error?.code }
            );
        } catch (error) {
            addResult('Mill Constraints', 'Status CHECK Constraint', false, error.message);
        }
    };

    const testMillCommunityFK = async () => {
        try {
            const { error } = await supabase
                .from('mill')
                .insert({
                    code: 'TEST-FK',
                    name: 'Test FK',
                    status: 'OPERATIONAL',
                    community_id: 99999 // Invalid
                });

            const constraintWorked = error && error.code === '23503';

            addResult(
                'Mill Constraints',
                'Community FK Constraint',
                constraintWorked,
                constraintWorked ? 'FK constraint blocked invalid community_id' : 'FK failed',
                { errorCode: error?.code }
            );
        } catch (error) {
            addResult('Mill Constraints', 'Community FK Constraint', false, error.message);
        }
    };

    // ============================================
    // RUN ALL TESTS
    // ============================================
    const runAllTests = async () => {
        setLoading(true);
        clearResults();

        const tests = [
            // Work Order Tests
            testWorkOrderTimestamps,
            testWorkOrderPumpColumns,
            testWorkOrderInvalidPumpFK,

            // Diagnosis Component Tests
            testDiagnosisComponentStatus,
            testDiagnosisComponentInvalidStatus,

            // View Tests
            testMillProfileView,
            testPumpPerformanceView,
            testComponentHistoryView,

            // Trigger Tests
            testPumpLifecycleTrigger,

            // Mill Constraint Tests
            testMillStatusConstraint,
            testMillCommunityFK
        ];

        for (const test of tests) {
            await test();
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        setLoading(false);
    };

    return (
        <div className="migrations-test-page">
            <div className="test-header">
                <div className="header-content">
                    <h1>🧪 Migrations Testing Suite</h1>
                    <p>Comprehensive testing for migrations 001-007</p>
                </div>

                <div className="test-actions">
                    <button
                        onClick={runAllTests}
                        disabled={loading}
                        className="btn-run-all"
                    >
                        {loading ? '⏳ Running Tests...' : '▶️ Run All Tests'}
                    </button>
                    <button
                        onClick={clearResults}
                        className="btn-clear"
                    >
                        🗑️ Clear Results
                    </button>
                </div>
            </div>

            <div className="info-banner" style={{
                background: '#fff3cd',
                border: '1px solid #ffc107',
                padding: '12px 20px',
                margin: '20px',
                borderRadius: '8px',
                display: 'flex',
                gap: '12px',
                alignItems: 'start'
            }}>
                <div style={{ fontSize: '24px' }}>ℹ️</div>
                <div style={{ flex: 1 }}>
                    <strong>Expected Console Warnings</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#856404' }}>
                        You may see HTTP 400/409 errors in the browser console. These are <strong>normal and expected</strong> -
                        they're from constraint validation tests that intentionally try to insert invalid data to verify
                        database constraints are working correctly. All tests should still pass. ✅
                    </p>
                </div>
            </div>

            <div className="test-categories">
                <button onClick={testWorkOrderTimestamps}>Work Order Timestamps</button>
                <button onClick={testWorkOrderPumpColumns}>Work Order Pump Columns</button>
                <button onClick={testDiagnosisComponentStatus}>Diagnosis Component</button>
                <button onClick={testMillProfileView}>mill_profile View</button>
                <button onClick={testPumpPerformanceView}>pump_performance View</button>
                <button onClick={testComponentHistoryView}>component_history View</button>
                <button onClick={testPumpLifecycleTrigger}>Pump Lifecycle Trigger</button>
                <button onClick={testMillStatusConstraint}>Mill Status Constraint</button>
            </div>

            <div className="test-stats">
                <div className="stat-box">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Total Tests</div>
                </div>
                <div className="stat-box stat-passed">
                    <div className="stat-value">{stats.passed}</div>
                    <div className="stat-label">Passed</div>
                </div>
                <div className="stat-box stat-failed">
                    <div className="stat-value">{stats.failed}</div>
                    <div className="stat-label">Failed</div>
                </div>
            </div>

            <div className="test-results">
                <h2>Test Results</h2>
                {results.length === 0 ? (
                    <div className="no-results">
                        <p>No tests run yet. Click "Run All Tests" to begin.</p>
                    </div>
                ) : (
                    <div className="results-list">
                        {results.map(result => (
                            <div
                                key={result.id}
                                className={`result-item ${result.success ? 'success' : 'failure'}`}
                            >
                                <div className="result-header">
                                    <div className="result-icon">
                                        {result.success ? '✅' : '❌'}
                                    </div>
                                    <div className="result-info">
                                        <div className="result-title">
                                            <span className="category">{result.category}</span>
                                            <span className="test-name">{result.testName}</span>
                                        </div>
                                        <div className="result-message">{result.message}</div>
                                    </div>
                                    <div className="result-time">{result.timestamp}</div>
                                </div>
                                {result.data && (
                                    <details className="result-data">
                                        <summary>View Details</summary>
                                        <pre>{JSON.stringify(result.data, null, 2)}</pre>
                                    </details>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MigrationsTestPage;
