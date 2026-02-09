# Cambios Manuales para WorkOrderForm.jsx

Sigue estos pasos en orden para agregar el botón eliminar y modal de completion.

---

## PASO 1: Agregar Estados (línea ~20)

Busca donde están los estados iniciales:
```jsx
const [error, setError] = useState(null);
```

**Inmediatamente después**, agrega estos dos estados:
```jsx
const [showCompletionModal, setShowCompletionModal] = useState(false);
const [completionNotes, setCompletionNotes] = useState('');
```

---

## PASO 2: Modificar handleTransitionToCompleted (buscar la función)

**REEMPLAZA** la función completa `handleTransitionToCompleted` con esta nueva versión:

```jsx
const handleTransitionToCompleted = () => {
    // Validate components have been reported
    if (formData.components.length === 0) {
        setError("Debe reportar el estado de los componentes antes de completar");
        return;
    }

    const hasUnreportedComponents = formData.components.some(c => !c.status || c.status === 'FUNCIONAL');
    if (hasUnreportedComponents) {
        const confirmed = window.confirm("Algunos componentes no han sido revisados. ¿Desea continuar?");
        if (!confirmed) return;
    }

    // Show completion modal instead of completing directly
    setShowCompletionModal(true);
};
```

---

## PASO 3: Agregar Nuevas Funciones (después de handleTransitionToCompleted)

**AGREGA** estas dos nuevas funciones justo después de `handleTransitionToCompleted`:

```jsx
const handleConfirmCompletion = async () => {
    if (!completionNotes || completionNotes.trim().length === 0) {
        setError('Las notas de finalización son obligatorias');
        return;
    }

    try {
        setSaving(true);
        setError(null);
        await WorkOrderService.completeWorkOrder(orderId, completionNotes);
        setShowCompletionModal(false);
        setCompletionNotes('');
        // Reload to get updated status
        await loadAllData();
    } catch (err) {
        console.error("Error completing work order:", err);
        setError(err.message || "Error al completar la orden");
    } finally {
        setSaving(false);
    }
};

const handleDeleteOrder = async () => {
    const confirmed = window.confirm(
        "⚠️ ADVERTENCIA: Esto eliminará completamente la orden y todos sus datos asociados. " +
        "Si la orden está en progreso, se liberarán todas las herramientas y EPP asignados. " +
        "\n\n¿Está seguro de que desea eliminar esta orden?"
    );

    if (!confirmed) return;

    try {
        setSaving(true);
        setError(null);
        await WorkOrderService.deleteWorkOrder(orderId);
        // Go back to list after successful deletion
        onBack();
    } catch (err) {
        console.error("Error deleting work order:", err);
        setError(err.message || "Error al eliminar la orden");
    } finally {
        setSaving(false);
    }
};
```

---

## PASO 4: Agregar Botón Eliminar en el Header

Busca donde están los botones del header (cerca de "Iniciar Orden" y "Completar Orden").

**AGREGA** este botón ANTES del botón "Iniciar Orden":

```jsx
{/* Delete Button - Show only if editing existing order */}
{isEditing && (
    <button
        onClick={handleDeleteOrder}
        disabled={saving}
        className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-red-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
    >
        <Trash2 size={20} />
        {saving ? 'Eliminando...' : 'Eliminar Orden'}
    </button>
)}
```

---

## PASO 5: Agregar Modal de Completion (al final del return, antes del último </div>)

Busca el **FINAL del return del componente** (antes del último `</div>` que cierra todo).

**AGREGA** este código del modal:

```jsx
{/* Completion Modal */}
{showCompletionModal && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-in fade-in zoom-in">
            <div className="flex items-center gap-3 mb-4">
                <CheckCircle size={28} className="text-green-500" />
                <h2 className="text-2xl font-bold text-slate-800">Finalizar Orden de Trabajo</h2>
            </div>

            <p className="text-slate-600 mb-6">
                Por favor, escriba las notas conclusivas de esta orden de trabajo. 
                Esta información quedará registrada permanentemente.
            </p>

            <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    Notas Conclusivas <span className="text-red-500">*</span>
                </label>
                <textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="Ejemplo: Se completó el mantenimiento preventivo del molino. Se reemplazaron 3 aspas desgastadas y se lubricaron todos los rodamientos. El molino quedó operativo y funcional."
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px]"
                    rows={5}
                />
                <p className="text-xs text-slate-500 mt-2">
                    Mínimo requerido: Descripción clara del trabajo realizado
                </p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            <div className="flex gap-3 justify-end">
                <button
                    onClick={() => {
                        setShowCompletionModal(false);
                        setCompletionNotes('');
                        setError(null);
                    }}
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-all"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleConfirmCompletion}
                    disabled={saving || !completionNotes.trim()}
                    className="px-6 py-2.5 rounded-xl font-bold text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                    <CheckCircle size={20} />
                    {saving ? 'Finalizando...' : 'Finalizar Orden'}
                </button>
            </div>
        </div>
    </div>
)}
```

---

## ✅ VERIFICACIÓN

Después de hacer los cambios:

1. Guarda el archivo
2. Verifica que no haya errores de syntax en el editor
3. Recarga la app (Ctrl+F5)
4. Prueba:
   - Abrir Test 6 → Ver botón "Eliminar Orden"
   - Click "Iniciar Orden" → Debe funcionar
   - Click "Completar Orden" → Debe mostrar modal con textarea
   - Modal debe requerir notas para finalizar

---

## 🐛 Si hay errores

Si el editor muestra errores de sintaxis:
1. Verifica que copiaste TODO el código de cada bloque
2. Revisa que las llaves `{}` estén balanceadas
3. Comprueba que no duplicaste variables/funciones

**¿Necesitas ayuda?** Avísame qué error específico ves.
