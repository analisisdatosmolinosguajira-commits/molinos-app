# Módulo de Control de Operaciones — Bitácora de Auditoría
## Molinos App — Documentación Técnica

> **Última actualización**: 2026-02-22
> **Estado**: Planificado (se implementa en Fase 1 del Auth)
> **Acceso**: Solo rol `supervisor`

---

## Índice

1. [Objetivo](#objetivo)
2. [Modelo de Datos](#modelo-de-datos)
3. [Tablas Auditadas](#tablas-auditadas)
4. [Triggers de Auditoría](#triggers-de-auditoría)
5. [Vista de Resumen](#vista-de-resumen)
6. [Componente Frontend](#componente-frontend)
7. [Ejemplos de Consultas](#ejemplos-de-consultas)

---

## Objetivo

Registrar **toda acción** que cualquier usuario realice sobre las tablas críticas del sistema: creaciones, ediciones y eliminaciones. Cada registro incluye:

- **Quién** lo hizo (`auth.uid()` + nombre de la persona)
- **Qué** hizo (INSERT, UPDATE, DELETE)
- **En qué tabla** y registro
- **Cuándo** exactamente (timestamp con zona)
- **Qué cambió** (valor anterior vs nuevo en JSON)

Esto permite al supervisor:
- Ver actividad reciente de todo el equipo
- Filtrar acciones por usuario, módulo, tipo o fecha
- Detectar comportamientos anómalos
- Generar reportes de actividad para auditorías externas
- Rastrear quién modificó un registro específico

---

## Modelo de Datos

### Tabla `audit_log`

```sql
CREATE TABLE audit_log (
    log_id        BIGSERIAL PRIMARY KEY,
    -- QUIÉN
    user_id       UUID REFERENCES auth.users(id),  -- auth.uid()
    user_email    TEXT,                              -- snapshot del email
    person_name   TEXT,                              -- snapshot del nombre
    -- QUÉ
    action        TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    table_name    TEXT NOT NULL,
    record_id     TEXT,                              -- PK del registro afectado
    -- DATOS
    old_data      JSONB,                             -- estado anterior (UPDATE/DELETE)
    new_data      JSONB,                             -- estado nuevo (INSERT/UPDATE)
    changed_fields TEXT[],                           -- campos modificados (UPDATE)
    -- CUÁNDO
    created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
    -- CONTEXTO
    ip_address    TEXT,
    module        TEXT                               -- módulo desde el que se ejecutó
);

-- Índices para consultas frecuentes
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_date ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_record ON audit_log(table_name, record_id);
```

### Campos explicados

| Campo | Descripción |
|---|---|
| `user_id` | UUID del usuario de Supabase Auth que ejecutó la acción |
| `user_email` | Snapshot del email al momento de la acción (no se pierde si cambia) |
| `person_name` | Snapshot del nombre completo (`first_name \|\| last_name` de person) |
| `action` | `INSERT`, `UPDATE`, o `DELETE` |
| `table_name` | Nombre de la tabla afectada (ej: `work_order`, `diagnosis`) |
| `record_id` | ID primario del registro afectado (como texto para universalidad) |
| `old_data` | Estado completo del registro ANTES del cambio (JSONB) |
| `new_data` | Estado completo del registro DESPUÉS del cambio (JSONB) |
| `changed_fields` | Array con los nombres de columnas que cambiaron (solo UPDATE) |
| `created_at` | Timestamp exacto de la acción |
| `module` | Categoría funcional: `inventario`, `campo`, `fabricacion`, etc. (opcional) |

---

## Tablas Auditadas

No todas las 92 tablas necesitan auditoría. Se auditarán **tablas de negocio críticas** en las que un cambio impacta operaciones.

### Prioridad ALTA (Fase 1)

| Tabla | Módulo | Justificación |
|---|---|---|
| `work_order` | campo | OTs son el core operativo |
| `diagnosis` | campo | Diagnósticos técnicos |
| `movement` | campo | Jornadas de campo |
| `community_concertation` | social | Concertaciones con comunidades |
| `manufacturing_order` | fabricación | Órdenes de fabricación |
| `pump` | activos | Bombas (activos valiosos) |
| `mill` | activos | Molinos (activos principales) |
| `person` | admin | Cambios en personal |
| `user_profile` | auth | Cambios de rol/perfil |

### Prioridad MEDIA (Fase 2)

| Tabla | Módulo | Justificación |
|---|---|---|
| `material` | inventario | Catálogo de materiales |
| `piece` | inventario | Catálogo de piezas |
| `material_stock_movement` | inventario | Movimientos de stock |
| `piece_stock_movement` | inventario | Movimientos de piezas |
| `planned_activity` | campo | Actividades planificadas |
| `crew` | cuadrillas | Cambios en cuadrillas |
| `crew_member` | cuadrillas | Asignación de miembros |
| `pump_model` | fabricación | Modelos de bomba |

### NO auditadas (tablas de soporte)

- `debug_log`, vistas, tablas de stock denormalizado (`material_stock`, `piece_stock`)
- Tablas junction/intermedias de solo-lectura

---

## Triggers de Auditoría

### Función genérica

```sql
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_person_name TEXT;
    v_record_id TEXT;
    v_changed TEXT[];
    v_old JSONB;
    v_new JSONB;
    v_key TEXT;
BEGIN
    -- Obtener usuario actual
    v_user_id := auth.uid();

    -- Obtener email y nombre
    IF v_user_id IS NOT NULL THEN
        SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_user_id;
        SELECT (p.first_name || ' ' || p.last_name) INTO v_person_name
        FROM user_profile up JOIN person p ON up.person_id = p.person_id
        WHERE up.id = v_user_id;
    END IF;

    -- Determinar datos según operación
    IF TG_OP = 'INSERT' THEN
        v_new := to_jsonb(NEW);
        v_record_id := v_new ->> TG_ARGV[0];  -- nombre de la PK como argumento
    ELSIF TG_OP = 'UPDATE' THEN
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
        v_record_id := v_new ->> TG_ARGV[0];
        -- Detectar campos cambiados
        v_changed := ARRAY[]::TEXT[];
        FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
            IF v_old ->> v_key IS DISTINCT FROM v_new ->> v_key THEN
                v_changed := v_changed || v_key;
            END IF;
        END LOOP;
    ELSIF TG_OP = 'DELETE' THEN
        v_old := to_jsonb(OLD);
        v_record_id := v_old ->> TG_ARGV[0];
    END IF;

    -- Insertar log
    INSERT INTO audit_log (user_id, user_email, person_name, action, table_name, record_id, old_data, new_data, changed_fields)
    VALUES (v_user_id, v_email, v_person_name, TG_OP, TG_TABLE_NAME, v_record_id, v_old, v_new, v_changed);

    -- Retornar según operación
    IF TG_OP = 'DELETE' THEN RETURN OLD;
    ELSE RETURN NEW;
    END IF;
END;
$$;
```

### Aplicar triggers a cada tabla

```sql
-- Ejemplo para work_order (PK = work_order_id)
CREATE TRIGGER trg_audit_work_order
    AFTER INSERT OR UPDATE OR DELETE ON work_order
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('work_order_id');

-- Ejemplo para diagnosis (PK = diagnosis_id)
CREATE TRIGGER trg_audit_diagnosis
    AFTER INSERT OR UPDATE OR DELETE ON diagnosis
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('diagnosis_id');

-- Se repite para cada tabla auditada, pasando el nombre de su PK
```

---

## Vista de Resumen

### Vista `audit_log_summary` (stats por usuario/día)

```sql
CREATE VIEW audit_log_summary AS
SELECT
    user_id,
    person_name,
    user_email,
    date_trunc('day', created_at) AS day,
    table_name,
    action,
    COUNT(*) AS action_count
FROM audit_log
GROUP BY user_id, person_name, user_email, date_trunc('day', created_at), table_name, action
ORDER BY day DESC, action_count DESC;
```

### Vista `audit_log_recent` (últimas 500 acciones)

```sql
CREATE VIEW audit_log_recent AS
SELECT
    log_id, user_id, person_name, user_email,
    action, table_name, record_id,
    changed_fields,
    created_at
FROM audit_log
ORDER BY created_at DESC
LIMIT 500;
```

---

## Componente Frontend

### `OperationsControlPage.jsx` (Solo Supervisor)

**Características**:

1. **Panel de resumen**: Total de acciones hoy, esta semana, este mes. Gráfico de barras por día.
2. **Feed de actividad**: Lista cronológica de todas las acciones con:
   - Avatar/nombre del usuario
   - Tipo de acción (ícono + badge colorizado)
   - Tabla y registro afectado
   - Timestamp relativo ("hace 5 minutos")
   - Expandible para ver `old_data` vs `new_data` (diff visual)
3. **Filtros avanzados**:
   - Por usuario
   - Por módulo/tabla
   - Por tipo de acción (INSERT/UPDATE/DELETE)
   - Por rango de fechas
4. **Vista por usuario**: Ver toda la actividad de un usuario específico
5. **Exportar**: Descargar log filtrado como CSV (para auditoría externa)

### Ubicación en la app

- Sidebar → Sección "Administración" → "Control de Operaciones"
- Solo visible para `supervisor` (Fase 2 con permisos, Fase 1 visible para todos)
- Ruta: `/admin/operaciones`

---

## Ejemplos de Consultas

```sql
-- Actividad de un usuario en los últimos 7 días
SELECT * FROM audit_log
WHERE user_id = 'UUID_AQUI'
AND created_at > now() - interval '7 days'
ORDER BY created_at DESC;

-- Quién modificó una OT específica
SELECT person_name, action, changed_fields, created_at
FROM audit_log
WHERE table_name = 'work_order' AND record_id = '42'
ORDER BY created_at;

-- Top 10 usuarios más activos esta semana
SELECT person_name, COUNT(*) AS total
FROM audit_log
WHERE created_at > date_trunc('week', now())
GROUP BY person_name
ORDER BY total DESC
LIMIT 10;

-- Todas las eliminaciones del mes
SELECT person_name, table_name, record_id, old_data, created_at
FROM audit_log
WHERE action = 'DELETE'
AND created_at > date_trunc('month', now())
ORDER BY created_at DESC;
```

---

## Consideraciones de Rendimiento

| Aspecto | Decisión |
|---|---|
| **Almacenamiento** | JSONB comprimido. ~1KB por registro. 1000 acciones/día = ~365KB/día |
| **Retención** | Sin límite en Fase 1. En producción: archivar registros > 6 meses |
| **Índices** | 5 índices creados para consultas frecuentes |
| **Impacto en rendimiento** | Triggers `AFTER` — no bloquean la operación principal |
| **RLS** | Solo `supervisor` puede leer `audit_log` |
