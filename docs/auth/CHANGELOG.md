# Auth System — Changelog

> Registro de todos los cambios relacionados con el sistema de autenticación y autorización.

---

## [Unreleased] — Fase 1: Auth Básico

### Planificado
- Tabla `user_profile` (vinculación auth.users ↔ person)
- Trigger `handle_new_user` para auto-crear perfil
- `AuthContext.jsx` con useAuth hook
- `LoginPage.jsx` con email + contraseña
- `ProtectedRoute.jsx` para guardia de rutas
- `ProfilePage.jsx` con vista de perfil (lectura)
- Header actualizado con avatar/nombre/dropdown
- Sidebar con link a perfil e info de usuario

---

## 2026-02-22 — Planificación Inicial

### Documentación
- Creado `docs/auth/AUTH_SYSTEM.md` con:
  - Modelo de datos completo (user_profile, app_permission)
  - Relación person ↔ user_profile (no todos tienen usuario)
  - 5 roles principales: supervisor, ing_lider, social_lider, inventario_lider, operativo
  - Matriz de permisos por módulo (13 módulos × 5 roles)
  - Plan de 3 fases (básico → permisos → delegación)
  - Decisiones de diseño y justificaciones
  - Listado de 13 tablas que referencian `person`
