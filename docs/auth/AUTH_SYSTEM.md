# Sistema de Autenticación y Autorización
## Molinos App — Documentación Técnica

> **Última actualización**: 2026-02-22
> **Estado**: Planificación completada, implementación pendiente
> **Responsable**: Equipo de desarrollo

---

## Índice

1. [Visión General](#visión-general)
2. [Modelo de Datos](#modelo-de-datos)
3. [Relación person ↔ user_profile](#relación-person--user_profile)
4. [Roles y Permisos](#roles-y-permisos)
5. [Fases de Implementación](#fases-de-implementación)
6. [Componentes Frontend](#componentes-frontend)
7. [Decisiones de Diseño](#decisiones-de-diseño)

---

## Visión General

El sistema de auth se construye sobre **Supabase Auth** (tabla `auth.users`) vinculado a la tabla `person` existente a través de una tabla intermedia `user_profile`. 

**Principio clave**: No toda `person` tiene usuario. La tabla `person` es un registro general de personas (técnicos, miembros de comunidad, operarios) que pueden o no tener acceso al sistema. Solo las personas que necesitan acceso a la app se vinculan con cuentas de usuario.

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  auth.users  │────▶│  user_profile    │────▶│    person     │
│  (Supabase)  │     │  (1:1 auth.uid)  │     │  (registro   │
│              │     │  person_id (opt)  │     │   general)   │
│  email       │     │  app_role        │     │  first_name  │
│  password    │     │  avatar_url      │     │  last_name   │
│  uuid        │     │  onboarding      │     │  document_id │
└──────────────┘     └──────────────────┘     │  role_id     │
                                               │  email       │
                                               │  active      │
                                               └──────────────┘
                                                     ▲
                                              NO todos tienen
                                              user_profile
```

---

## Modelo de Datos

### Tabla `user_profile` (NUEVA)

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | UUID PK | NO | — | = `auth.uid()`, referencia `auth.users` |
| `person_id` | INT FK | **SÍ** | NULL | Referencia a `person`. NULL hasta que el usuario vincule su perfil |
| `app_role` | TEXT | NO | `'operativo'` | Rol en la app: `supervisor`, `ing_lider`, `social_lider`, `inventario_lider`, `operativo` |
| `avatar_url` | TEXT | SÍ | NULL | URL de foto de perfil en Supabase Storage |
| `onboarding_complete` | BOOL | NO | false | ¿El usuario ya completó su perfil (vinculó person)? |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Fecha de creación |

**Nota sobre `person_id`**: Es nullable porque:
- Al registrarse, el usuario aún no ha seleccionado qué `person` es
- Un supervisor debe aprobar la vinculación (Fase 2) o el usuario la selecciona en onboarding
- No todas las personas en `person` serán seleccionables (solo activas sin usuario asignado)

### Tabla `app_permission` (FASE 2)

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL PK | — |
| `role` | TEXT | Rol: `supervisor`, `ing_lider`, etc. |
| `module` | TEXT | Módulo: `inventario`, `diagnosticos`, `fabricacion`, etc. |
| `can_create` | BOOL | Puede crear registros |
| `can_update` | BOOL | Puede editar registros |
| `can_delete` | BOOL | Puede eliminar registros |

**UNIQUE** constraint en `(role, module)`.

### Triggers

```sql
-- Auto-crear user_profile al registrarse en Supabase Auth
CREATE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profile (id) VALUES (NEW.id);
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### RLS Policies

```sql
-- user_profile: cada usuario lee/edita solo su perfil
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON user_profile
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON user_profile
  FOR UPDATE USING (auth.uid() = id);

-- Supervisores leen todos los perfiles (para gestión)
CREATE POLICY "Supervisors read all profiles" ON user_profile
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profile WHERE id = auth.uid() AND app_role = 'supervisor')
  );
```

---

## Relación person ↔ user_profile

### Caso de uso: Quién tiene usuario y quién no

| Tipo de persona | ¿Tiene user? | Ejemplo |
|---|---|---|
| Ingeniero Líder | ✅ Sí | Accede a la app, gestiona OTs |
| Líder Social | ✅ Sí | Accede a la app, gestiona concertaciones |
| Supervisor | ✅ Sí | Accede a todo |
| Técnico en cuadrilla | ❌ No | Solo aparece en asignaciones |
| Miembro de comunidad | ❌ No | Solo aparece en registros |
| Operario | ⚠️ Opcional | Puede o no necesitar acceso |
| Conductor | ❌ No | Solo se referencia en jornadas |

### Tablas que referencian `person` como responsable/creador

Estas tablas usan `person_id` para asignar responsables. En Fase 3, los selectores filtrarán para mostrar preferentemente personas **con usuario activo**:

| Tabla | Columna | Uso |
|---|---|---|
| `diagnosis` | `created_by` | Quién creó el diagnóstico |
| `work_order` | `created_by` | Quién creó la OT |
| `planned_activity` | `responsible_person_id` | Responsable de actividad |
| `planned_activity` | `created_by` | Quién planificó |
| `movement` | `trip_manager_id` | Jefe de jornada |
| `movement_person` | `person_id` | Personas en jornada |
| `movement_vehicle` | `driver_person_id` | Conductor |
| `crew_member` | `person_id` | Miembro de cuadrilla |
| `safety_assignment` | `person_id` | Asignación de EPP |
| `concertation_person` | `person_id` | Personas en concertación |
| `community_member` | `person_id` | Miembros de comunidad |
| `activity_comment` | `person_id` | Quién comentó |
| `community_social_situation` | `reported_by_person_id` | Quién reportó |

---

## Roles y Permisos

### Roles principales del sistema (`app_role`)

| Rol | Código | Descripción |
|---|---|---|
| **Supervisor** | `supervisor` | Acceso total. Gestiona usuarios y configuración |
| **Ingeniero Líder** | `ing_lider` | Responsable técnico: diagnósticos, OTs, fabricación |
| **Líder Social** | `social_lider` | Responsable social: concertaciones, comunidades, jornadas |
| **Líder de Inventario** | `inventario_lider` | Responsable logístico: inventario, compras, fabricación |
| **Operativo** | `operativo` | Solo lectura. Visualiza toda la app |

### Matriz de permisos por módulo

| Módulo (`module`) | supervisor | ing_lider | social_lider | inventario_lider | operativo |
|---|:---:|:---:|:---:|:---:|:---:|
| `dashboard` | CRU | CRU | CRU | CRU | R |
| `molinos` | CRUD | CRUD | R | R | R |
| `bombas` | CRUD | CRUD | R | R | R |
| `jornadas` | CRUD | CRUD | CRUD | R | R |
| `ordenes_trabajo` | CRUD | CRUD | R | R | R |
| `diagnosticos` | CRUD | CRUD | R | R | R |
| `concertaciones` | CRUD | R | CRUD | R | R |
| `comunidades` | CRUD | R | CRUD | R | R |
| `inventario` | CRUD | R | — | CRUD | R |
| `fabricacion` | CRUD | CRUD | — | CRUD | R |
| `cuadrillas` | CRUD | CRUD | CRU | R | R |
| `reportes` | CRUD | CRU | CRU | CRU | — |
| `admin_usuarios` | CRUD | — | — | — | — |

> **C** = Create, **R** = Read, **U** = Update, **D** = Delete, **—** = Sin acceso

### Roles de `person_role` existentes vs `app_role`

La tabla `person_role` existente (Técnico, Ingeniero, Operario, Conductor, etc.) describe el **rol laboral** de la persona. El `app_role` en `user_profile` define qué **permisos tiene en la aplicación**. Son independientes:

- Un "Técnico" (`person_role`) puede tener `app_role = 'operativo'` (solo ve)
- Un "Ingeniero" (`person_role`) con `app_role = 'ing_lider'` (opera módulos de ingeniería)

---

## Fases de Implementación

### FASE 1 — Auth Básico para Producción

**Objetivo**: Login/logout funcional, usuario visible en header, perfil básico, app protegida.

**Lo que NO cambia en Fase 1**:
- Todos los usuarios ven TODO (sin restricción de módulos)
- No hay gestión de roles desde la UI
- No hay filtro de permisos en botones CRUD

**Lo que SÍ se implementa**:

| # | Archivo | Acción | Descripción |
|---|---|---|---|
| 1 | SQL: `user_profile` | CREATE | Tabla + trigger + RLS |
| 2 | `src/contexts/AuthContext.jsx` | NEW | Provider + useAuth hook |
| 3 | `src/pages/auth/LoginPage.jsx` | NEW | Login con email+password |
| 4 | `src/components/auth/ProtectedRoute.jsx` | NEW | Guardia de rutas |
| 5 | `src/pages/profile/ProfilePage.jsx` | NEW | Perfil del usuario (lectura) |
| 6 | `src/main.jsx` | MODIFY | Wrap con AuthProvider |
| 7 | `src/App.jsx` | MODIFY | Rutas /login, /perfil, ProtectedRoute |
| 8 | `src/components/layout/AppLayout.jsx` | MODIFY | Avatar, dropdown, nombre en header |
| 9 | `src/components/layout/Sidebar.jsx` | MODIFY | Link perfil, info usuario |

### FASE 2 — Roles y Permisos

**Objetivo**: Control granular de acciones por rol.

| # | Tarea | Descripción |
|---|---|---|
| 1 | Tabla `app_permission` | Crear y poblar con matriz |
| 2 | `usePermissions` hook | Consulta permisos del usuario |
| 3 | Componentes CRUD | Ocultar/deshabilitar según permisos |
| 4 | `UserManagement.jsx` | Gestión de usuarios (solo supervisor) |
| 5 | Onboarding | Flujo de vinculación person ↔ user |

### FASE 3 — Delegación y Notificaciones

**Objetivo**: Líderes crean sub-roles y delegan permisos.

| # | Tarea | Descripción |
|---|---|---|
| 1 | Delegación de permisos | Líderes asignan permisos a su equipo |
| 2 | Notificaciones | Sistema real de notificaciones en app |
| 3 | Filtro "solo con usuario" | Asignar responsable solo a personas activas |
| 4 | Actividad del perfil | Historial de acciones por usuario |

---

## Componentes Frontend

### AuthContext (Fase 1)

```
useAuth() → {
  user,           // auth.users record
  profile,        // user_profile record
  person,         // person record (si vinculado)
  loading,        // boolean
  signIn(email, password),
  signOut(),
  updateProfile(data),
}
```

### ProtectedRoute (Fase 1)

```jsx
<ProtectedRoute>
  <AppLayout />   // Solo accesible si logueado
</ProtectedRoute>
```

### usePermissions (Fase 2)

```
usePermissions('inventario') → {
  canCreate: true,
  canUpdate: true,
  canDelete: false,
  canRead: true,
}
```

---

## Decisiones de Diseño

1. **`person_id` nullable en `user_profile`**: Permite crear la cuenta antes de vincular con person. El onboarding guía al usuario a seleccionarse.

2. **`app_role` vs `person_role`**: Son conceptos diferentes. `person_role` es el cargo laboral (Técnico, Ingeniero). `app_role` es el nivel de acceso en la aplicación.

3. **Fase 1 sin restricciones de módulo**: Para la demo/presentación, todos los usuarios ven todo. Esto permite mostrar la app completa sin preocuparse por permisos faltantes.

4. **Trigger auto-crear perfil**: Garantiza que toda cuenta en `auth.users` tiene su `user_profile` correspondiente, evitando estados inconsistentes.

5. **Permisos en tabla separada (no hardcoded)**: La tabla `app_permission` permite ajustar permisos sin cambiar código. Los líderes pueden delegar permisos en Fase 3.
