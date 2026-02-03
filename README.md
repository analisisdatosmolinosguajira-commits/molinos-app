# Molinos App - Sistema de Gestión de Infraestructura Hídrica Comunitaria

Sistema de gestión integral para el mantenimiento de molinos de viento y bombas de agua en comunidades de La Guajira, Venezuela.

## 📋 Descripción

Aplicación web premium para gestionar todo el ciclo de vida de la infraestructura hídrica comunitaria, desde el diagnóstico hasta la concertación de servicios, con enfoque en tres pilares fundamentales:

- **🔧 Técnico**: Gestión de activos (molinos, bombas), órdenes de trabajo, diagnósticos, inventario y fabricación
- **👥 Social**: Administración de comunidades, miembros y personal operativo
- **📍 Territorial**: Registro de visitas, desplazamientos y georeferenciación

## ✨ Características Principales

### Trabajo en Campo
- **Visitas & Desplazamientos**: Seguimiento GPS de movilizaciones con objetivos (inspección, diagnóstico, concertación, mixto)
- **Órdenes de Trabajo**: Gestión completa del ciclo de vida de órdenes de mantenimiento
- **Diagnósticos**: Evaluaciones técnicas de molinos y bombas
- **Concertaciones**: Acuerdos de servicio con comunidades
- **Personal Operativo**: Gestión de cuadrillas, técnicos y roles

### Gestión de Activos
- **Molinos**: 103 molinos registrados con ubicación, estado y historial
- **Bombas**: Inventario de bombas (nuevas, fabricadas, reparadas) con trazabilidad

### Taller
- **Inventario Unificado**: Control de stock de materiales, piezas, herramientas y EPP
- **Fabricación**: Gestión de órdenes de fabricación de piezas

### Social
- **Comunidades**: Registro de comunidades beneficiarias con ubicación y contacto
- **Miembros**: Gestión de voceros y directiva comunitaria

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** + **Vite** - Framework y bundler
- **React Router** - Navegación SPA
- **Lucide React** - Iconografía moderna
- **Tailwind CSS** - Estilos utilitarios

### Backend
- **Supabase** (PostgreSQL) - Base de datos relacional
- **PostgREST** - API REST automática
- **Row Level Security (RLS)** - Seguridad a nivel de filas

### Arquitectura
- Arquitectura cliente-servidor
- Frontend: Solo visualización y trigger de acciones
- Backend (Supabase): Toda la lógica de negocio

## 📦 Instalación

### Prerrequisitos
- Node.js 18+ y npm
- Cuenta de Supabase (Free tier)

### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/TU_USUARIO/molinos-app.git
cd molinos-app
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crear archivo `.env.local` en la raíz:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

4. **Ejecutar la aplicación**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 🗄️ Base de Datos

### Tablas Principales
- `mill` - Molinos de viento
- `pump` - Bombas de agua
- `community` - Comunidades beneficiarias
- `person` - Personas (técnicos, voceros, miembros)
- `crew` - Cuadrillas de trabajo
- `movement` - Visitas/desplazamientos
- `work_order` - Órdenes de trabajo
- `diagnosis_visit` - Diagnósticos técnicos
- `concertation` - Acuerdos de servicio
- `manufacturing_order` - Órdenes de fabricación
- `piece`, `material`, `tool`, `safety_equipment` - Inventario

### Scripts SQL
Los scripts de inicialización están en `/seeds/`:
- `initial_data.sql` - Datos base
- `populate_operational_staff.sql` - Personal operativo
- `seed_automation.sql` - Automatización de datos

## 📁 Estructura del Proyecto

```
molinos-app/
├── src/
│   ├── components/
│   │   ├── layout/         # AppLayout, Sidebar
│   │   ├── modals/         # Modales reutilizables
│   │   └── ui/             # Componentes UI base
│   ├── pages/
│   │   ├── dashboard/      # Panel de control
│   │   ├── operations/     # Visitas, órdenes, diagnósticos
│   │   ├── assets/         # Molinos, bombas
│   │   ├── fabrication/    # Fabricación de piezas
│   │   ├── inventory/      # Inventario unificado
│   │   └── admin/          # Comunidades
│   ├── services/           # Capa de servicios Supabase
│   └── App.jsx             # Routing principal
├── seeds/                  # Scripts SQL de datos
├── .env.local              # Variables de entorno (no versionado)
└── package.json
```

## 🎨 Diseño UI/UX

- **Estética premium** con gradientes, glassmorphism y micro-animaciones
- **Paleta de colores** curada (HSL personalizada)
- **Tipografía moderna** (Google Fonts)
- **Dark mode** ready
- **Responsive** - Mobile first

## 🚀 Estado del Proyecto

### Módulos Implementados ✅
- ✅ Dashboard con métricas
- ✅ Gestión de Molinos (103 registrados)
- ✅ Gestión de Bombas
- ✅ Visitas y Desplazamientos
- ✅ Órdenes de Trabajo
- ✅ Diagnósticos
- ✅ Concertaciones
- ✅ Personal Operativo (111 técnicos)
- ✅ Comunidades
- ✅ Inventario Unificado (materiales, piezas, herramientas, EPP)
- ✅ Fabricación (órdenes de manufactura)

### Pendiente 🚧
- Modales de creación/edición completos
- Reportes y métricas avanzadas
- Exportación de datos
- Sistema de notificaciones

## 📄 Licencia

Este proyecto es de uso interno para la gestión de infraestructura hídrica comunitaria en La Guajira.

## 👥 Contacto

**Email**: analisisdatosmolinosguajira@gmail.com

---

Desarrollado con ❤️ para las comunidades de La Guajira
