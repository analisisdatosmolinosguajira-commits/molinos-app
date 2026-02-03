
-- SCHEMA COMPILADO DE LA HISTORIA DEL CHAT
-- Nota: No se pudo descargar el esquema completo via MCP por errores de permiso (403/401).
-- Este archivo recopila las definiciones dadas por el usuario.

-- 1. PUMP (Dada en Step 152)
create table public.pump (
  pump_id serial not null,
  serial_number character varying(100) null,
  origin character varying(30) not null,
  supplier_id integer null,
  manufacture_date date null,
  status character varying(30) not null,
  notes text null,
  manufacturing_order_id integer null,
  storage_location character varying null,
  model text null,
  constraint pump_pkey primary key (pump_id),
  constraint pump_serial_number_key unique (serial_number),
  constraint chk_pump_origin check (origin::text = any (array['nueva', 'fabricada', 'reparada']::text[])),
  constraint chk_pump_status check (status::text = any (array['instalada', 'almacenada', 'en_reparacion', 'descartada']::text[]))
);

-- 2. MOVEMENT (Dada en Step 169)
create table public.movement (
  movement_id serial not null,
  start_date date null,
  end_date date null,
  objective character varying(50) null,
  vehicle_info character varying(255) null,
  geotracker_file_url character varying(500) null,
  notes text null,
  created_at timestamp without time zone null,
  updated_at timestamp without time zone null,
  constraint movement_pkey primary key (movement_id),
  constraint chk_movement_objective check (objective::text = any (array['inspeccion', 'diagnostico', 'concertacion', 'mixto']::text[]))
);

-- 3. MOVEMENT RELATIONS (Dadas en Step 169)
create table public.movement_community (
  id serial not null,
  movement_id integer not null,
  community_id integer not null,
  constraint movement_community_pkey primary key (id)
);

create table public.movement_concertation (
  id serial not null,
  movement_id integer not null,
  concertation_id integer not null,
  constraint movement_concertation_pkey primary key (id)
);

create table public.movement_diagnosis (
  id serial not null,
  movement_id integer not null,
  diagnosis_id integer not null,
  constraint movement_diagnosis_pkey primary key (id)
);

create table public.movement_gps_point (
  id serial not null,
  movement_id integer not null,
  latitude numeric(10, 6) not null,
  longitude numeric(10, 6) not null,
  recorded_at timestamp without time zone not null,
  constraint movement_gps_point_pkey primary key (id)
);

create table public.movement_manufacturing_order (
  id serial not null,
  movement_id integer not null,
  mo_id integer not null,
  constraint movement_manufacturing_order_pkey primary key (id)
);

create table public.movement_person (
  id serial not null,
  movement_id integer not null,
  person_id integer not null,
  role character varying(50) null,
  crew_id integer null,
  constraint movement_person_pkey primary key (id)
);

create table public.movement_work_order (
  id serial not null,
  movement_id integer not null,
  work_order_id integer not null,
  constraint movement_work_order_pkey primary key (id)
);

-- 4. TABLAS INFERIDAS (No provistas explícitamente, pero referenciadas)
-- Estas definiciones pueden estar incompletas o ser incorrectas.
/*
create table public.community (
  community_id serial pk,
  name text unique not null
  -- municipality? No (Error 42703)
  -- department? No (Error 42703)
);

create table public.mill (
  mill_id serial pk,
  code text unique,
  name text,
  community_name text, -- Inferido de MillService (y error community_id no existe)
  status text
);

create table public.person (
  person_id serial pk,
  first_name text, -- Corregido de 'name'
  last_name text,
  role text,
  document_id text not null -- Descubierto por Error 23502
);

create table public.crew (
  crew_id serial pk,
  name text
  -- type? No (Error 42703)
);
*/
