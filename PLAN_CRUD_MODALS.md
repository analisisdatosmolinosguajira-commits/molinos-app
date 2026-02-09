# 📋 PLAN DE IMPLEMENTACIÓN: MODALES CRUD COMPLETOS

## ✅ ESTADO ACTUAL

### Modales Existentes:
1. **PumpFormModal.jsx** ✅ - Formulario básico de bombas
   - ❌ FALTA: Campos completos según esquema de BD
   - ❌ FALTA: `manufacture_date`, `storage_location`, `supplier_id`, `manufacturing_order_id`

2. **MillFormModal.jsx** ✅- Formulario básico de molinos  
   - ❌ FALTA: Campos completos según esquema de BD
   - ❌ FALTA: `registration_number`, `latitude`, `longitude`, `model`, `manufacturer`, `notes`, `technical_specs_url`
   - ❌ FALTA: Registro de componentes en `mill_has_component`

---

## 🎯 TAREAS PENDIENTES

### FASE 1: Actualizar PumpFormModal ✅ COMPLETAR

**Campos faltantes a agregar:**
- ✅ `serial_number` (ya existe)
- ✅ `model` (ya existe)
- ✅ `origin` (ya existe)
- ❌ **`supplier_id`** - Select de proveedores
- ❌ **`manufacture_date`** - Input date
- ✅ `status` (ya existe)
- ✅ `notes` (ya existe)
- ❌ **`manufacturing_order_id`** - Select opcional de órdenes de fabricación
- ❌ **`storage_location`** - Input text

**Validaciones:**
- Serial number único
- manufacture_date < today
- storage_location si status = 'almacenada'

---

### FASE 2: Actualizar MillFormModal ✅ COMPLETAR

**Campos faltantes a agregar:**
- ✅ `code` (ya existe)
- ❌ **`registration_number`** - Input text
- ✅ `name` (ya existe)
- ✅ `community_name` (derivado de community_id)
- ❌ **`location_description`** (ya existe como location_details REVISAR)
- ❌ **`latitude`** - Input number (decimal)
- ❌ **`longitude`** - Input number (decimal)
- ❌ **`model`** - Input text
- ❌ **`manufacturer`** - Input text
- ✅ `installation_date` (ya existe)
- ✅ `status` (ya existe)
- ✅ `last_maintenance_reported_date` (ya existe)
- ❌ **`notes`** - Textarea
- ❌ **`community_id`** (ya existe)
- ❌ **`technical_specs_url`** - Input URL

**Funcionalidad Adicional:**
❌ **COMPONENTES DEL MOLINO:**
- Sección para seleccionar componentes de `mill_component`
- Multi-select con estado y fecha de instalación
- Guardar en `mill_has_component` al crear/editar molino

---

### FASE 3: Nueva Pestaña "Componentes" en Mills ✅ CREAR

**Ubicación:** Página de listado de molinos (Mills.jsx)

**Funcionalidad:**
1. Nueva tab "Componentes" que muestre tabla de `mill_component`
2. CRUD completo de componentes:
   - **Crear componente:** name, code
   - **Editar componente:** Modificar name/code
   - **Eliminar componente:** Solo si no está en uso

**UI:**
- Tabla con columnas: Code, Name, # Molinos que lo usan, Acciones
- Botón "Agregar Componente"
- Modal `ComponentFormModal.jsx` (crear)

---

### FASE 4: Verificar y actualizar Servicios ✅ VERIFICAR

**pumps.js:**
- ✅ `getAllPumps()`
- ✅ `getPumpById()`
- ❌ Verificar `createPump()` acepta TODOS los campos
- ❌ Verificar `updatePump()` acepta TODOS los campos

**mills.js:**
- ✅ `getAllMills()`
- ✅ `getMillById()`
- ❌ Verificar `createMill()` acepta TODOS los campos
- ❌ Verificar `updateMill()` acepta TODOS los campos
- ❌ **CREAR** `addMillComponent(mill_id, component_id, instalación_date, status)`
- ❌ **CREAR** `removeMillComponent(mill_id, component_id)`
- ❌ **CREAR** `getMillComponents(mill_id)`

**NUEVO: components.js:**
- ❌ **CREAR** `getAllComponents()`
- ❌ **CREAR** `getComponentById(id)`
- ❌ **CREAR** `createComponent(data)`
- ❌ **CREAR** `updateComponent(id, data)`
- ❌ **CREAR** `deleteComponent(id)`

---

## 📊 ESQUEMA DE DATOS - REFERENCIA

### pump (Campos completos):
```sql
- pump_id (PK, auto)
- serial_number (VARCHAR, unique, nullable)
- origin (VARCHAR, required) -- 'nueva', 'fabricada', 'reparada'
- supplier_id (FK, nullable)
- manufacture_date (DATE, nullable)
- status (VARCHAR, required) -- 'instalada', 'almacenada', 'en_reparacion', 'descartada'
- notes (TEXT, nullable)
- manufacturing_order_id (FK, nullable)
- storage_location (VARCHAR, nullable)
- model (TEXT, nullable)
- created_at, updated_at (auto)
```

### mill (Campos completos):
```sql
- mill_id (PK, auto)
- code (VARCHAR, unique)
- registration_number (VARCHAR, nullable)
- name (VARCHAR, nullable)
- community_name (VARCHAR, nullable)
- location_description (VARCHAR, nullable)
- latitude (NUMERIC, nullable)
- longitude (NUMERIC, nullable)
- model (VARCHAR, nullable)
- manufacturer (VARCHAR, nullable)
- installation_date (DATE, nullable)
- status (VARCHAR) -- 'OPERATIONAL', 'NON_OPERATIONAL', 'UNDER_MAINTENANCE', 'DECOMMISSIONED'
- last_maintenance_reported_date (DATE, nullable)
- notes (TEXT, nullable)
- community_id (FK, nullable)
- technical_specs_url (TEXT, nullable)
- created_at, updated_at (auto)
```

### mill_has_component:
```sql
- id (PK, auto)
- mill_id (FK, required)
- component_id (FK, required)
- installed_date (DATE, nullable)
- status (VARCHAR, nullable) -- estado del componente en ese molino
```

### mill_component:
```sql
- component_id (PK, auto)
- name (VARCHAR, required, unique)
- code (VARCHAR, required, unique)
```

---

## 🚀 ORDEN DE IMPLEMENTACIÓN

1. ✅ **PRIMERO:** Crear servicio `components.js` completo
2. ✅ **SEGUNDO:** Actualizar `PumpFormModal` con campos faltantes
3. ✅ **TERCERO:** Actualizar `MillFormModal` con campos faltantes + selector de componentes
4. ✅ **CUARTO:** Crear tab "Componentes" en página Mills
5. ✅ **QUINTO:** Crear `ComponentFormModal.jsx`
6. ✅ **SEXTO:** Actualizar servicios mills.js con funciones de componentes
7. ✅ **SÉPTIMO:** Testing completo de formularios

---

## 📝 NOTAS IMPORTANTES

- ⚠️ **VALIDACIÓN:** Algunos campos tienen CHECK constraints en la BD (origin, status)
- ⚠️ **UNIQUE:** serial_number (pump), code (mill, component), name (component)
- ⚠️ **NULLABLE:** Muchos campos son opcionales
- ⚠️ **CASCADAS:** Verificar qué pasa al eliminar componentes usados en molinos

---

## 🎨 DISEÑO UI

- Mantener estilo consistente con modales existentes
- Secciones colapsables si el formulario es muy largo
- Iconos para cada sección  
- Validación en tiempo real
- Mensajes de error claros
- Loading states durante guardado
