# 📊 GUÍA DE VISUALIZACIÓN - 5 BOMBAS CREADAS

## ✅ CORRECCIONES IMPLEMENTADAS

### 1. **Errores Corregidos en pumps.js**
- ✅ Error PGRST116 eliminado: Cambiado de `.single()` a `.limit(1)` con manejo de múltiples filas
- ✅ `getPerformanceMetrics()` ahora maneja correctamente bombas con datos duplicados
- ✅ `getCurrentInstallation()` toma la instalación más reciente cuando hay múltiples activas
- ✅ Función `_parseMetrics()` creada para parsear consistentemente los datos
- ✅ Función `_getDefaultMetrics()` para valores por defecto

### 2. **Datos Limpiados**
- ✅ Bomba pump_id=24: Instalación duplicada (id=10) marcada como removida

---

## 🔧 BOMBAS CREADAS Y QUÉ DEBERÍAS VER

### **BOMBA 1: P-FAB-2025-001** (ID: 33)
**Tipo:** Fabricada recientemente, En Operación

#### 📌 Pestaña: Vista General
- **Estado:** Operativa (verde) ✅
- **Origen:** `fabricada`
- **Total en operación:** ~245 días
- **Instalación Actual:** 
  - Molino: MOL-026 - Molino 26
  - Instalada desde: 10 de junio de 2025
  - Días operando: ~245 días

#### 📊 Pestaña: Analíticas
- **Edad Total:** ~400 días (desde fabricación 15 de enero de 2025)
- **Días Activos:** ~245 días
- **Tiempo de Actividad (Uptime):** ~61%
- **Instalación Actual:** 245 días
- **Promedio por Instalación:** 245 días
- **Órdenes de Trabajo:** 1 (1 completada)
- **Eventos Totales:** 3
- **Instalaciones:** 1
- **Remociones:** 0

#### ⚙️ Pestaña: Especificaciones
- **Serial Number:** P-FAB-2025-001
- **Modelo:** Bomba Manual India Mark II
- **Origen:** fabricada
- **Estado:** instalada
- **Fecha de Fabricación:** 15 de enero de 2025
- **Almacenamiento:** N/A (instalada)

#### 🕐 Pestaña: Historial
- ✅ **Instalación** - 10 de junio de 2025 en MOL-026
- 🔧 **Mantenimiento** - 1 de septiembre de 2025
- 🔍 **Inspección** - 1 de diciembre de 2025

#### 📋 Pestaña: Órdenes de Trabajo
- **WO-2025-FAB-001** - Instalación (COMPLETED)

---

### **BOMBA 2: P-NEW-2024-050** (ID: 34)
**Tipo:** Nueva, Almacenada, Lista para Instalar

#### 📌 Pestaña: Vista General
- **Estado:** Operativa (verde) ✅
- **Origen:** `nueva`
- **Total en operación:** 0 días
- **Sin instalación actual**

#### 📊 Pestaña: Analíticas
- **Edad Total:** ~690 días (desde 20 de marzo de 2024)
- **Días Activos:** 0
- **Tiempo de Actividad (Uptime):** 0%
- **Instalaciones:** 0
- **Órdenes de Trabajo:** 1 (1 pendiente)

#### ⚙️ Pestaña: Especificaciones
- **Serial Number:** P-NEW-2024-050
- **Modelo:** Grundfos SQ Flex 2.5
- **Origen:** nueva
- **Estado:** almacenada
- **Fecha de Fabricación:** 20 de marzo de 2024
- **Almacenamiento:** Almacén Principal - Estante A3

#### 🕐 Pestaña: Historial
- *Sin historial previo*

#### 📋 Pestaña: Órdenes de Trabajo
- **WO-2026-INST-050** - Instalación programada (PENDING)
  - Programada para: 15 de febrero de 2026
  - Molino: MOL-034

---

### **BOMBA 3: P-REP-2022-015** (ID: 35)
**Tipo:** Reparada, En Reparación, Con Historial Extenso

#### 📌 Pestaña: Vista General
- **Estado:** Requiere Atención (rojo/amarillo) ⚠️
- **Origen:** `reparada`
- **Total en operación:** ~583 días
- **Sin instalación actual** (en reparación)

#### 📊 Pestaña: Analíticas
- **Edad Total:** ~1276 días (desde 10 de agosto de 2022)
- **Días Activos:** ~583 días
- **Tiempo de Actividad (Uptime):** ~46%
- **Instalaciones:** 2
- **Remociones:** 2
- **Órdenes de Trabajo:** 3 (todas completadas)
- **Eventos Totales:** 7

#### ⚙️ Pestaña: Especificaciones
- **Serial Number:** P-REP-2022-015
- **Modelo:** Afridev Standard
- **Origen:** reparada
- **Estado:** en_reparacion
- **Fecha de Fabricación:** 10 de agosto de 2022
- **Almacenamiento:** Taller - Área de Reparaciones

#### 🕐 Pestaña: Historial (debe mostrar 7 eventos en orden cronológico descendente)
1. **REPAIR** - 5 de diciembre de 2025 - Reparación en curso
2. **REMOVAL** - 30 de noviembre de 2025 en MOL-038
3. **INSTALLATION** - 20 de junio de 2024 en MOL-038
4. **REPAIR** - 20 de mayo de 2024 - Reparación general
5. **REMOVAL** - 15 de mayo de 2024 en MOL-035
6. **MAINTENANCE** - 15 de abril de 2023 en MOL-035
7. **INSTALLATION** - 1 de octubre de 2022 en MOL-035

#### 📋 Pestaña: Órdenes de Trabajo
- **WO-2025-REM-035B** - Remoción por falla (COMPLETED)
- **WO-2024-INST-035** - Instalación reparada (COMPLETED)
- **WO-2024-REM-035A** - Remoción por desgaste (COMPLETED)

---

### **BOMBA 4: P-OLD-2020-007** (ID: 36)
**Tipo:** Antigua con Historial Muy Extenso, En Operación

#### 📌 Pestaña: Vista General
- **Estado:** Operativa (verde) ✅
- **Origen:** `nueva`
- **Total en operación:** ~1552 días
- **Instalación Actual:**
  - Molino: MOL-048 - Molino 48
  - Instalada desde: 1 de julio de 2023
  - Días operando: ~919 días

#### 📊 Pestaña: Analíticas
- **Edad Total:** ~2220 días (desde 10 de enero de 2020)
- **Días Activos:** ~1552 días (4.2 años)
- **Tiempo de Actividad (Uptime):** ~70%
- **Instalación Actual:** 919 días
- **Promedio por Instalación:** ~517 días
- **Instalaciones:** 3
- **Remociones:** 2
- **Órdenes de Trabajo:** 4 (todas completadas)
- **Eventos Totales:** 15

#### ⚙️ Pestaña: Especificaciones
- **Serial Number:** P-OLD-2020-007
- **Modelo:** Afridev Classic
- **Origen:** nueva
- **Estado:** instalada
- **Fecha de Fabricación:** 10 de enero de 2020

#### 🕐 Pestaña: Historial (15 eventos, los más recientes primero)
1. **INSPECTION** - 10 de agosto de 2025
2. **MAINTENANCE** - 25 de enero de 2025
3. **MAINTENANCE** - 20 de julio de 2024
4. **MAINTENANCE** - 15 de enero de 2024
5. **INSTALLATION** - 1 de julio de 2023
6. **REPAIR** - 15 de junio de 2023
7. **REMOVAL** - 10 de junio de 2023
... (etc)

#### 📋 Pestaña: Órdenes de Trabajo
- **WO-2023-INST-036B** - Instalación reparada (COMPLETED)
- **WO-2023-REM-036** - Remoción por desgaste (COMPLETED)
- **WO-2021-INST-036A** - Instalación reubicada (COMPLETED)
- **WO-2021-RELOC-036** - Reubicación (COMPLETED)

---

### **BOMBA 5: P-NEW-2025-100** (ID: 37)
**Tipo:** Nueva, Recién Recibida, en Almacén

#### 📌 Pestaña: Vista General
- **Estado:** Operativa (verde) ✅
- **Origen:** `nueva`
- **Total en operación:** 0 días
- **Sin instalación actual**

#### 📊 Pestaña: Analíticas
- **Edad Total:** ~98 días (desde 1 de noviembre de 2025)
- **Días Activos:** 0
- **Tiempo de Actividad (Uptime):** 0%
- **Instalaciones:** 0
- **Órdenes de Trabajo:** 2 (2 pendientes)

#### ⚙️ Pestaña: Especificaciones
- **Serial Number:** P-NEW-2025-100
- **Modelo:** Vergnet Hydro
- **Origen:** nueva
- **Estado:** almacenada
- **Fecha de Fabricación:** 1 de noviembre de 2025
- **Almacenamiento:** Almacén Temporal B - En Espera de Asignación

#### 🕐 Pestaña: Historial
1. **INSPECTION** - 6 de noviembre de 2025 - Inspección aprobada
2. **RECEPTION** - 5 de noviembre de 2025 - Recibida del proveedor

#### 📋 Pestaña: Órdenes de Trabajo
- **WO-2026-ALTINST-037** - Instalación alternativa (PENDING)
- **WO-2026-INST-037** - Instalación programada (PENDING)

---

## 🎯 RESUMEN DE CASOS DE USO CUBIERTOS

1. **Bomba 1 (33):** Fabricada recientemente, funcionando
2. **Bomba 2 (34):** Nueva sin usar, lista para instalar
3. **Bomba 3 (35):** En reparación, múltiples ciclos
4. **Bomba 4 (36):** Veterana con 5+ años de operación
5. **Bomba 5 (37):** Nueva recién recibida

## IDs de las Bombas para Navegación
- `/bombas/33` - P-FAB-2025-001
- `/bombas/34` - P-NEW-2024-050
- `/bombas/35` - P-REP-2022-015
- `/bombas/36` - P-OLD-2020-007
- `/bombas/37` - P-NEW-2025-100

## 🔍 NOTA IMPORTANTE
La edad en días se calcula desde `manufacture_date` hasta hoy (7 de febrero de 2026). Si ves "0 días", verifica que:
1. El campo `manufacture_date` existe en la bomba
2. La vista `pump_performance_metrics` está calculando correctamente `age_days`
3. El servicio `pumps.js` está parseando el campo correctamente con `parseFloat()`
