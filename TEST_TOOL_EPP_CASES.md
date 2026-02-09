# Test Cases para Sistema de Asignación de Herramientas y EPP

## Test 6: Asignación Completa de Recursos
**Estado Inicial**: PENDING
**Propósito**: Probar el flujo completo de asignación cuando se inicia una orden

### Recursos Configurados:
- **Piezas**: 
  - Pieza 1: 3 unidades (consumo permanente)
  - Pieza 2: 2 unidades (consumo permanente)
- **Materiales**:
  - Material 1: 5 unidades (consumo permanente)
  - Material 2: 3 unidades (consumo permanente)
- **Herramientas** (asignación a cuadrilla):
  - Herramienta 3: 2 unidades
  - Herramienta 4: 1 unidad
- **EPP** (asignación a cuadrilla):
  - EPP 3 (Botas): 5 unidades
  - EPP 4: 3 unidades

### Pruebas a Realizar:
1. ✅ Click "Iniciar Orden" → Cambiar a IN_PROGRESS
2. ✅ Verificar que piezas y materiales se CONSUMEN (stock_movement con type='USE')
3. ✅ Verificar que herramientas se ASIGNAN a crew_id=13 (crew_tool_assignment con end_date=NULL)
4. ✅ Verificar que EPP se ASIGNA a crew_id=13 (crew_safety_equipment_assignment con end_date=NULL)
5. ✅ Verificar que tool_stock.quantity_available se decrementa
6. ✅ Verificar que safety_equipment_stock.quantity_available se decrementa

---

## Test 7: Completar Orden y Liberar Recursos
**Estado Inicial**: IN_PROGRESS (recursos ya asignados)
**Propósito**: Probar liberación de herramientas y EPP al completar

### Recursos Pre-Asignados:
- **Herramientas Asignadas**:
  - Herramienta 3: 1 unidad (en crew_tool_assignment)
  - Herramienta 5: 2 unidades (en crew_tool_assignment)
- **EPP Asignado**:
  - EPP 3: 4 unidades (en crew_safety_equipment_assignment)

### Pruebas a Realizar:
1. ✅ Click "Completar Orden" → Cambiar a COMPLETED
2. ✅ Verificar que trigger `close_assignments_on_ot_close` marca end_date en crew_tool_assignment
3. ✅ Verificar que trigger `close_epp_assignments_on_wo_close` marca end_date en crew_safety_equipment_assignment
4. ✅ Verificar que tool_stock.quantity_available se INCREMENTA (herramientas liberadas)
5. ✅ Verificar que safety_equipment_stock.quantity_available se INCREMENTA (EPP liberado)
6. ✅ Verificar movimientos en tool_stock_movement con type='IN' (devolución)

---

## Test 8: Cancelar Orden y Liberar Recursos
**Estado Inicial**: IN_PROGRESS (recursos ya asignados)
**Propósito**: Probar liberación de herramientas y EPP al cancelar

### Recursos Pre-Asignados:
- **Herramientas Asignadas**:
  - Herramienta 4: 3 unidades
  - Herramienta 5: 1 unidad
- **EPP Asignado**:
  - EPP 4: 6 unidades
  - EPP 5: 2 unidades

### Pruebas a Realizar:
1. ✅ Cambiar estado manualmente a CANCELLED (SQL)
2. ✅ Verificar que triggers liberan recursos igual que al completar
3. ✅ Verificar incremento de stock disponible
4. ✅ Verificar que assignments tienen end_date marcado

---

## Comandos SQL para Probar

### Iniciar Test 6:
```sql
UPDATE work_order 
SET status = 'IN_PROGRESS', start_date = CURRENT_DATE
WHERE description = 'Test 6: Asignación Completa de Recursos';
```

### Completar Test 7:
```sql
UPDATE work_order 
SET status = 'COMPLETED', end_date = CURRENT_DATE
WHERE description = 'Test 7: Completar y Liberar Recursos';
```

### Cancelar Test 8:
```sql
UPDATE work_order 
SET status = 'CANCELLED', end_date = CURRENT_DATE
WHERE description = 'Test 8: Cancelar y Liberar Recursos';
```

### Verificar Stock Antes/Después:
```sql
-- Stock de herramientas
SELECT tool_id, name, quantity_available FROM tool_stock WHERE tool_id IN (3,4,5);

-- Stock de EPP
SELECT safety_id, name, quantity_available FROM safety_equipment_stock WHERE safety_id IN (3,4,5);

-- Asignaciones activas de crew 13
SELECT * FROM crew_tool_assignment WHERE crew_id = 13 AND end_date IS NULL;
SELECT * FROM crew_safety_equipment_assignment WHERE crew_id = 13 AND end_date IS NULL;
```
