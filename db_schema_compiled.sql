-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.community (
  community_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying UNIQUE,
  location_description character varying,
  latitude numeric,
  longitude numeric,
  notes text,
  CONSTRAINT community_pkey PRIMARY KEY (community_id)
);
CREATE TABLE public.community_concertation (
  concertation_id integer NOT NULL DEFAULT nextval('community_concertation_concertation_id_seq'::regclass),
  diagnosis_id integer NOT NULL,
  community_id integer NOT NULL,
  meeting_date date,
  decision character varying,
  conditions text,
  notes text,
  act_url character varying,
  status character varying DEFAULT 'pendiente'::character varying CHECK (status::text = ANY (ARRAY['pendiente'::text, 'en_proceso'::text, 'finalizada'::text, 'cancelada'::text])),
  crew_id integer,
  CONSTRAINT community_concertation_pkey PRIMARY KEY (concertation_id),
  CONSTRAINT fk_concertation_diagnosis FOREIGN KEY (diagnosis_id) REFERENCES public.diagnosis_visit(diagnosis_id),
  CONSTRAINT fk_concertation_community FOREIGN KEY (community_id) REFERENCES public.community(community_id),
  CONSTRAINT fk_concertation_crew FOREIGN KEY (crew_id) REFERENCES public.crew(crew_id)
);
CREATE TABLE public.community_member (
  id integer NOT NULL DEFAULT nextval('community_member_id_seq'::regclass),
  community_id integer NOT NULL,
  person_id integer NOT NULL,
  role_id integer,
  status text DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text])),
  joined_at date DEFAULT CURRENT_DATE,
  CONSTRAINT community_member_pkey PRIMARY KEY (id),
  CONSTRAINT community_member_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.community(community_id),
  CONSTRAINT community_member_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(person_id),
  CONSTRAINT community_member_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.community_role(role_id)
);
CREATE TABLE public.community_role (
  role_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying UNIQUE,
  description text,
  CONSTRAINT community_role_pkey PRIMARY KEY (role_id)
);
CREATE TABLE public.concertation_community_member (
  id integer NOT NULL DEFAULT nextval('concertation_community_member_id_seq'::regclass),
  concertation_id integer NOT NULL,
  community_member_id integer NOT NULL,
  CONSTRAINT concertation_community_member_pkey PRIMARY KEY (id),
  CONSTRAINT fk_ccm_concertation FOREIGN KEY (concertation_id) REFERENCES public.community_concertation(concertation_id)
);
CREATE TABLE public.concertation_person (
  id integer NOT NULL DEFAULT nextval('concertation_person_id_seq'::regclass),
  concertation_id integer NOT NULL,
  person_id integer NOT NULL,
  CONSTRAINT concertation_person_pkey PRIMARY KEY (id),
  CONSTRAINT fk_cp_concertation FOREIGN KEY (concertation_id) REFERENCES public.community_concertation(concertation_id),
  CONSTRAINT fk_cp_person FOREIGN KEY (person_id) REFERENCES public.person(person_id)
);
CREATE TABLE public.crew (
  crew_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  description text,
  active boolean DEFAULT true,
  CONSTRAINT crew_pkey PRIMARY KEY (crew_id)
);
CREATE TABLE public.crew_member (
  crew_member_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  crew_id integer NOT NULL,
  person_id integer NOT NULL,
  role_in_crew character varying,
  start_date date NOT NULL,
  end_date date,
  CONSTRAINT crew_member_pkey PRIMARY KEY (crew_member_id),
  CONSTRAINT fk_crew_member_person FOREIGN KEY (person_id) REFERENCES public.person(person_id),
  CONSTRAINT fk_crew_member_crew FOREIGN KEY (crew_id) REFERENCES public.crew(crew_id)
);
CREATE TABLE public.crew_safety_equipment_assignment (
  id integer NOT NULL DEFAULT nextval('crew_safety_equipment_assignment_id_seq'::regclass),
  crew_id integer NOT NULL,
  safety_id integer NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  start_date date NOT NULL,
  end_date date,
  CONSTRAINT crew_safety_equipment_assignment_pkey PRIMARY KEY (id),
  CONSTRAINT fk_csea_crew FOREIGN KEY (crew_id) REFERENCES public.crew(crew_id),
  CONSTRAINT fk_csea_safety FOREIGN KEY (safety_id) REFERENCES public.safety_equipment(safety_id)
);
CREATE TABLE public.crew_tool_assignment (
  id integer NOT NULL DEFAULT nextval('crew_tool_assignment_id_seq'::regclass),
  crew_id integer NOT NULL,
  tool_id integer NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  start_date date NOT NULL,
  end_date date,
  CONSTRAINT crew_tool_assignment_pkey PRIMARY KEY (id),
  CONSTRAINT fk_cta_crew FOREIGN KEY (crew_id) REFERENCES public.crew(crew_id),
  CONSTRAINT fk_cta_tool FOREIGN KEY (tool_id) REFERENCES public.tool(tool_id)
);
CREATE TABLE public.crew_work_order_log (
  log_id bigint NOT NULL DEFAULT nextval('crew_work_order_log_log_id_seq'::regclass),
  crew_id bigint NOT NULL,
  work_order_id bigint NOT NULL,
  check_in timestamp without time zone,
  check_out timestamp without time zone,
  CONSTRAINT crew_work_order_log_pkey PRIMARY KEY (log_id)
);
CREATE TABLE public.diagnosis_component_status (
  id integer NOT NULL DEFAULT nextval('diagnosis_component_status_id_seq'::regclass),
  diagnosis_id integer NOT NULL,
  component_id integer NOT NULL,
  status character varying NOT NULL CHECK (status::text = ANY (ARRAY['FUNCIONAL'::character varying, 'DANADO'::character varying, 'DESGASTADO'::character varying, 'AUSENTE'::character varying, 'NO_INSPECCIONADO'::character varying]::text[])),
  observation text,
  deterioration_notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT diagnosis_component_status_pkey PRIMARY KEY (id),
  CONSTRAINT fk_diagnosis_component_diagnosis FOREIGN KEY (diagnosis_id) REFERENCES public.diagnosis_visit(diagnosis_id),
  CONSTRAINT fk_diagnosis_component_component FOREIGN KEY (component_id) REFERENCES public.mill_component(component_id)
);
CREATE TABLE public.diagnosis_visit (
  diagnosis_id integer NOT NULL DEFAULT nextval('diagnosis_visit_diagnosis_id_seq'::regclass),
  mill_id integer NOT NULL,
  work_order_id integer,
  type character varying,
  scheduled_date date,
  status character varying CHECK (status::text = ANY (ARRAY['programado'::character varying, 'en_proceso'::character varying, 'finalizado'::character varying, 'cancelado'::character varying]::text[])),
  crew_id integer NOT NULL,
  notes text,
  CONSTRAINT diagnosis_visit_pkey PRIMARY KEY (diagnosis_id),
  CONSTRAINT fk_diagnosis_mill FOREIGN KEY (mill_id) REFERENCES public.mill(mill_id),
  CONSTRAINT fk_diagnosis_work_order FOREIGN KEY (work_order_id) REFERENCES public.work_order(work_order_id),
  CONSTRAINT fk_diagnosis_crew FOREIGN KEY (crew_id) REFERENCES public.crew(crew_id)
);
CREATE TABLE public.failure_report (
  report_id integer NOT NULL DEFAULT nextval('failure_report_report_id_seq'::regclass),
  mill_id integer NOT NULL,
  reported_by_name character varying,
  description text NOT NULL,
  priority character varying CHECK (priority::text = ANY (ARRAY['BAJA'::character varying, 'MEDIA'::character varying, 'ALTA'::character varying, 'CRITICA'::character varying]::text[])),
  status character varying CHECK (status::text = ANY (ARRAY['PENDIENTE'::character varying, 'REVISADO'::character varying, 'EN_PROCESO'::character varying, 'RESUELTO'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT failure_report_pkey PRIMARY KEY (report_id),
  CONSTRAINT failure_report_mill_id_fkey FOREIGN KEY (mill_id) REFERENCES public.mill(mill_id)
);
CREATE TABLE public.manufacturing_order (
  mo_id integer NOT NULL DEFAULT nextval('manufacturing_order_mo_id_seq'::regclass),
  piece_id integer NOT NULL,
  work_order_id integer,
  quantity_planned integer NOT NULL,
  quantity_completed integer NOT NULL DEFAULT 0,
  status character varying NOT NULL CHECK (status::text = ANY (ARRAY['planificada'::character varying, 'en_proceso'::character varying, 'terminada'::character varying]::text[])),
  start_date date,
  end_date date,
  crew_id integer,
  notes text,
  CONSTRAINT manufacturing_order_pkey PRIMARY KEY (mo_id),
  CONSTRAINT fk_mo_piece FOREIGN KEY (piece_id) REFERENCES public.piece(piece_id),
  CONSTRAINT fk_mo_work_order FOREIGN KEY (work_order_id) REFERENCES public.work_order(work_order_id),
  CONSTRAINT fk_mo_crew FOREIGN KEY (crew_id) REFERENCES public.crew(crew_id)
);
CREATE TABLE public.material (
  material_id integer NOT NULL DEFAULT nextval('material_material_id_seq'::regclass),
  code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  description text,
  unit character varying NOT NULL,
  min_stock numeric NOT NULL DEFAULT 0,
  location character varying,
  supplier_id integer,
  CONSTRAINT material_pkey PRIMARY KEY (material_id),
  CONSTRAINT fk_material_supplier FOREIGN KEY (supplier_id) REFERENCES public.supplier(supplier_id)
);
CREATE TABLE public.material_stock (
  material_id integer NOT NULL,
  quantity_available numeric NOT NULL DEFAULT 0 CHECK (quantity_available >= 0::numeric),
  min_stock numeric NOT NULL DEFAULT 0,
  CONSTRAINT material_stock_pkey PRIMARY KEY (material_id),
  CONSTRAINT material_stock_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.material(material_id)
);
CREATE TABLE public.material_stock_movement (
  movement_id integer NOT NULL DEFAULT nextval('material_stock_movement_movement_id_seq'::regclass),
  material_id integer NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['IN'::character varying, 'OUT'::character varying, 'ADJUST'::character varying]::text[])),
  quantity numeric NOT NULL CHECK (quantity > 0::numeric),
  reference_type character varying,
  reference_id integer,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  CONSTRAINT material_stock_movement_pkey PRIMARY KEY (movement_id),
  CONSTRAINT material_stock_movement_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.material(material_id)
);
CREATE TABLE public.mill (
  mill_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  code character varying UNIQUE,
  registration_number character varying,
  name character varying,
  community_name character varying,
  location_description character varying,
  latitude numeric,
  longitude numeric,
  model character varying,
  manufacturer character varying,
  installation_date date,
  status character varying CHECK (status::text = ANY (ARRAY['OPERATIONAL'::character varying, 'NON_OPERATIONAL'::character varying, 'UNDER_MAINTENANCE'::character varying, 'DECOMMISSIONED'::character varying]::text[])),
  last_maintenance_reported_date date,
  notes text,
  community_id integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  technical_specs_url text,
  CONSTRAINT mill_pkey PRIMARY KEY (mill_id),
  CONSTRAINT mill_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.community(community_id),
  CONSTRAINT fk_mill_community FOREIGN KEY (community_id) REFERENCES public.community(community_id)
);
CREATE TABLE public.mill_community (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  mill_id integer NOT NULL,
  community_id integer NOT NULL,
  CONSTRAINT mill_community_pkey PRIMARY KEY (id),
  CONSTRAINT fk_millcommunity_community FOREIGN KEY (community_id) REFERENCES public.community(community_id),
  CONSTRAINT fk_millcommunity_mill FOREIGN KEY (mill_id) REFERENCES public.mill(mill_id)
);
CREATE TABLE public.mill_component (
  component_id integer NOT NULL DEFAULT nextval('mill_component_component_id_seq'::regclass),
  name character varying NOT NULL UNIQUE,
  code character varying NOT NULL UNIQUE,
  CONSTRAINT mill_component_pkey PRIMARY KEY (component_id)
);
CREATE TABLE public.mill_has_component (
  id integer NOT NULL DEFAULT nextval('mill_has_component_id_seq'::regclass),
  mill_id integer NOT NULL,
  component_id integer NOT NULL,
  installed_date date,
  status character varying,
  CONSTRAINT mill_has_component_pkey PRIMARY KEY (id),
  CONSTRAINT fk_mhc_component FOREIGN KEY (component_id) REFERENCES public.mill_component(component_id),
  CONSTRAINT fk_mhc_mill FOREIGN KEY (mill_id) REFERENCES public.mill(mill_id)
);
CREATE TABLE public.mill_pump (
  id integer NOT NULL DEFAULT nextval('mill_pump_id_seq'::regclass),
  mill_id integer NOT NULL,
  pump_id integer NOT NULL,
  installed_date date NOT NULL,
  removed_date date,
  removal_reason character varying,
  work_order_id integer,
  current_status character varying DEFAULT 'instalada'::character varying CHECK (current_status::text = ANY (ARRAY['instalada'::text, 'almacenada'::text, 'en_reparacion'::text, 'descartada'::text])),
  diagnosis_id integer,
  CONSTRAINT mill_pump_pkey PRIMARY KEY (id),
  CONSTRAINT fk_mill_pump_mill FOREIGN KEY (mill_id) REFERENCES public.mill(mill_id),
  CONSTRAINT fk_mill_pump_pump FOREIGN KEY (pump_id) REFERENCES public.pump(pump_id),
  CONSTRAINT fk_mill_pump_wo FOREIGN KEY (work_order_id) REFERENCES public.work_order(work_order_id),
  CONSTRAINT fk_mill_pump_diagnosis FOREIGN KEY (diagnosis_id) REFERENCES public.diagnosis_visit(diagnosis_id)
);
CREATE TABLE public.mo_inventory_movement (
  movement_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  mo_consumption_id integer NOT NULL,
  item_type character varying NOT NULL CHECK (item_type::text = 'material'::text),
  item_id integer NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['IN'::character varying, 'OUT'::character varying, 'ADJUST'::character varying, 'LOSS'::character varying, 'WEAR'::character varying, 'CONSUME'::character varying]::text[])),
  reference_type character varying CHECK (reference_type::text = 'manufacturing_order'::text),
  reference_id integer,
  crew_id integer,
  quantity numeric NOT NULL CHECK (quantity > 0::numeric),
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  CONSTRAINT mo_inventory_movement_pkey PRIMARY KEY (movement_id),
  CONSTRAINT mo_inventory_movement_mo_consumption_id_fkey FOREIGN KEY (mo_consumption_id) REFERENCES public.mo_material_consumption(id),
  CONSTRAINT mo_inventory_movement_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.material(material_id),
  CONSTRAINT mo_inventory_movement_reference_id_fkey FOREIGN KEY (reference_id) REFERENCES public.manufacturing_order(mo_id),
  CONSTRAINT mo_inventory_movement_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES public.crew(crew_id)
);
CREATE TABLE public.mo_material_consumption (
  id integer NOT NULL DEFAULT nextval('mo_material_consumption_id_seq'::regclass),
  mo_id integer NOT NULL,
  material_id integer NOT NULL,
  quantity_used numeric NOT NULL CHECK (quantity_used >= 0::numeric),
  date date NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT mo_material_consumption_pkey PRIMARY KEY (id),
  CONSTRAINT fk_mo_mat_mo FOREIGN KEY (mo_id) REFERENCES public.manufacturing_order(mo_id),
  CONSTRAINT fk_mo_mat_material FOREIGN KEY (material_id) REFERENCES public.material(material_id)
);
CREATE TABLE public.mo_piece_consumption (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  mo_id integer NOT NULL,
  piece_instance_id integer NOT NULL,
  quantity_used integer NOT NULL CHECK (quantity_used > 0),
  movement_type character varying NOT NULL CHECK (movement_type::text = ANY (ARRAY['USE'::character varying, 'LOSS'::character varying, 'ADJUST'::character varying]::text[])),
  crew_id integer,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  CONSTRAINT mo_piece_consumption_pkey PRIMARY KEY (id),
  CONSTRAINT mo_piece_consumption_piece_instance_id_fkey FOREIGN KEY (piece_instance_id) REFERENCES public.piece_instance(piece_instance_id),
  CONSTRAINT mo_piece_consumption_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES public.crew(crew_id),
  CONSTRAINT mo_piece_consumption_mo_id_fkey FOREIGN KEY (mo_id) REFERENCES public.manufacturing_order(mo_id)
);
CREATE TABLE public.mo_piece_inventory_movement (
  movement_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  mo_piece_consumption_id integer NOT NULL,
  item_type character varying NOT NULL CHECK (item_type::text = 'piece'::text),
  item_id integer NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['IN'::character varying, 'OUT'::character varying, 'ADJUST'::character varying, 'LOSS'::character varying, 'USE'::character varying]::text[])),
  reference_type character varying CHECK (reference_type::text = 'manufacturing_order'::text),
  reference_id integer,
  crew_id integer,
  quantity integer NOT NULL CHECK (quantity > 0),
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  CONSTRAINT mo_piece_inventory_movement_pkey PRIMARY KEY (movement_id),
  CONSTRAINT mo_piece_inventory_movement_mo_piece_consumption_id_fkey FOREIGN KEY (mo_piece_consumption_id) REFERENCES public.mo_piece_consumption(id),
  CONSTRAINT mo_piece_inventory_movement_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.piece_instance(piece_instance_id),
  CONSTRAINT mo_piece_inventory_movement_reference_id_fkey FOREIGN KEY (reference_id) REFERENCES public.manufacturing_order(mo_id),
  CONSTRAINT mo_piece_inventory_movement_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES public.crew(crew_id)
);
CREATE TABLE public.movement (
  movement_id integer NOT NULL DEFAULT nextval('movement_movement_id_seq'::regclass),
  start_date date,
  end_date date,
  objective character varying CHECK (objective::text = ANY (ARRAY['inspeccion'::character varying, 'diagnostico'::character varying, 'concertacion'::character varying, 'mixto'::character varying]::text[])),
  vehicle_info character varying,
  geotracker_file_url character varying,
  notes text,
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  CONSTRAINT movement_pkey PRIMARY KEY (movement_id)
);
CREATE TABLE public.movement_community (
  id integer NOT NULL DEFAULT nextval('movement_community_id_seq'::regclass),
  movement_id integer NOT NULL,
  community_id integer NOT NULL,
  CONSTRAINT movement_community_pkey PRIMARY KEY (id),
  CONSTRAINT fk_movement_community_movement FOREIGN KEY (movement_id) REFERENCES public.movement(movement_id),
  CONSTRAINT fk_movement_community_community FOREIGN KEY (community_id) REFERENCES public.community(community_id)
);
CREATE TABLE public.movement_concertation (
  id integer NOT NULL DEFAULT nextval('movement_concertation_id_seq'::regclass),
  movement_id integer NOT NULL,
  concertation_id integer NOT NULL,
  CONSTRAINT movement_concertation_pkey PRIMARY KEY (id),
  CONSTRAINT fk_movement_concertation_movement FOREIGN KEY (movement_id) REFERENCES public.movement(movement_id),
  CONSTRAINT fk_movement_concertation_concertation FOREIGN KEY (concertation_id) REFERENCES public.community_concertation(concertation_id)
);
CREATE TABLE public.movement_diagnosis (
  id integer NOT NULL DEFAULT nextval('movement_diagnosis_id_seq'::regclass),
  movement_id integer NOT NULL,
  diagnosis_id integer NOT NULL,
  CONSTRAINT movement_diagnosis_pkey PRIMARY KEY (id),
  CONSTRAINT fk_movement_diagnosis_movement FOREIGN KEY (movement_id) REFERENCES public.movement(movement_id),
  CONSTRAINT fk_movement_diagnosis_diagnosis FOREIGN KEY (diagnosis_id) REFERENCES public.diagnosis_visit(diagnosis_id)
);
CREATE TABLE public.movement_gps_point (
  id integer NOT NULL DEFAULT nextval('movement_gps_point_id_seq'::regclass),
  movement_id integer NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  recorded_at timestamp without time zone NOT NULL,
  CONSTRAINT movement_gps_point_pkey PRIMARY KEY (id),
  CONSTRAINT fk_movement_gps_movement FOREIGN KEY (movement_id) REFERENCES public.movement(movement_id)
);
CREATE TABLE public.movement_manufacturing_order (
  id integer NOT NULL DEFAULT nextval('movement_manufacturing_order_id_seq'::regclass),
  movement_id integer NOT NULL,
  mo_id integer NOT NULL,
  CONSTRAINT movement_manufacturing_order_pkey PRIMARY KEY (id),
  CONSTRAINT fk_movement_mo_movement FOREIGN KEY (movement_id) REFERENCES public.movement(movement_id),
  CONSTRAINT fk_movement_mo_mo FOREIGN KEY (mo_id) REFERENCES public.manufacturing_order(mo_id)
);
CREATE TABLE public.movement_person (
  id integer NOT NULL DEFAULT nextval('movement_person_id_seq'::regclass),
  movement_id integer NOT NULL,
  person_id integer NOT NULL,
  role character varying,
  crew_id integer,
  CONSTRAINT movement_person_pkey PRIMARY KEY (id),
  CONSTRAINT fk_movement_person_movement FOREIGN KEY (movement_id) REFERENCES public.movement(movement_id),
  CONSTRAINT fk_movement_person_person FOREIGN KEY (person_id) REFERENCES public.person(person_id),
  CONSTRAINT movement_person_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES public.crew(crew_id)
);
CREATE TABLE public.movement_work_order (
  id integer NOT NULL DEFAULT nextval('movement_work_order_id_seq'::regclass),
  movement_id integer NOT NULL,
  work_order_id integer NOT NULL,
  CONSTRAINT movement_work_order_pkey PRIMARY KEY (id),
  CONSTRAINT fk_movement_wo_movement FOREIGN KEY (movement_id) REFERENCES public.movement(movement_id),
  CONSTRAINT fk_movement_wo_work_order FOREIGN KEY (work_order_id) REFERENCES public.work_order(work_order_id)
);
CREATE TABLE public.person (
  person_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  document_id character varying NOT NULL UNIQUE,
  specialty character varying,
  phone character varying,
  email character varying,
  active boolean DEFAULT true,
  role_id integer,
  CONSTRAINT person_pkey PRIMARY KEY (person_id),
  CONSTRAINT person_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.person_role(role_id)
);
CREATE TABLE public.person_role (
  role_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL UNIQUE,
  description text,
  CONSTRAINT person_role_pkey PRIMARY KEY (role_id)
);
CREATE TABLE public.piece (
  piece_id integer NOT NULL DEFAULT nextval('piece_piece_id_seq'::regclass),
  code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  description text,
  drawing_code character varying,
  unit character varying,
  min_stock integer DEFAULT 0,
  image_url character varying,
  supplier_id integer,
  origin character varying CHECK (origin::text = ANY (ARRAY['comprado'::character varying, 'fabricado'::character varying, 'recuperado'::character varying]::text[])),
  CONSTRAINT piece_pkey PRIMARY KEY (piece_id),
  CONSTRAINT fk_piece_supplier FOREIGN KEY (supplier_id) REFERENCES public.supplier(supplier_id)
);
CREATE TABLE public.piece_instance (
  piece_instance_id integer NOT NULL DEFAULT nextval('piece_instance_piece_instance_id_seq'::regclass),
  piece_id integer NOT NULL,
  origin character varying NOT NULL CHECK (origin::text = ANY (ARRAY['comprado'::character varying, 'fabricado'::character varying, 'recuperado'::character varying]::text[])),
  supplier_id integer,
  manufacturing_order_id integer,
  recovered_from_instance_id integer,
  status character varying NOT NULL CHECK (status::text = ANY (ARRAY['almacenada'::character varying, 'instalada'::character varying, 'descartada'::character varying]::text[])),
  created_date date DEFAULT CURRENT_DATE,
  notes text,
  CONSTRAINT piece_instance_pkey PRIMARY KEY (piece_instance_id),
  CONSTRAINT fk_pi_piece FOREIGN KEY (piece_id) REFERENCES public.piece(piece_id),
  CONSTRAINT fk_pi_supplier FOREIGN KEY (supplier_id) REFERENCES public.supplier(supplier_id),
  CONSTRAINT fk_pi_mo FOREIGN KEY (manufacturing_order_id) REFERENCES public.manufacturing_order(mo_id),
  CONSTRAINT fk_pi_recovered FOREIGN KEY (recovered_from_instance_id) REFERENCES public.piece_instance(piece_instance_id)
);
CREATE TABLE public.piece_material (
  id integer NOT NULL DEFAULT nextval('piece_material_id_seq'::regclass),
  piece_id integer NOT NULL,
  material_id integer NOT NULL,
  quantity_required numeric NOT NULL,
  CONSTRAINT piece_material_pkey PRIMARY KEY (id),
  CONSTRAINT fk_piece_material_piece FOREIGN KEY (piece_id) REFERENCES public.piece(piece_id),
  CONSTRAINT fk_piece_material_material FOREIGN KEY (material_id) REFERENCES public.material(material_id)
);
CREATE TABLE public.piece_stock (
  piece_id integer NOT NULL,
  current_stock integer NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  min_stock integer DEFAULT 0,
  CONSTRAINT piece_stock_pkey PRIMARY KEY (piece_id),
  CONSTRAINT fk_piece_stock_piece FOREIGN KEY (piece_id) REFERENCES public.piece(piece_id)
);
CREATE TABLE public.piece_stock_movement (
  movement_id integer NOT NULL DEFAULT nextval('piece_stock_movement_movement_id_seq'::regclass),
  piece_id integer NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['IN'::character varying, 'OUT'::character varying, 'ADJUST'::character varying]::text[])),
  quantity integer NOT NULL CHECK (quantity > 0),
  reference_type character varying,
  reference_id integer,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  CONSTRAINT piece_stock_movement_pkey PRIMARY KEY (movement_id),
  CONSTRAINT fk_piece_stock_movement_piece FOREIGN KEY (piece_id) REFERENCES public.piece(piece_id)
);
CREATE TABLE public.pump (
  pump_id integer NOT NULL DEFAULT nextval('pump_pump_id_seq'::regclass),
  serial_number character varying UNIQUE,
  origin character varying NOT NULL CHECK (origin::text = ANY (ARRAY['nueva'::character varying, 'fabricada'::character varying, 'reparada'::character varying]::text[])),
  supplier_id integer,
  manufacture_date date,
  status character varying NOT NULL CHECK (status::text = ANY (ARRAY['instalada'::character varying, 'almacenada'::character varying, 'en_reparacion'::character varying, 'descartada'::character varying]::text[])),
  notes text,
  manufacturing_order_id integer,
  storage_location character varying,
  model text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pump_pkey PRIMARY KEY (pump_id),
  CONSTRAINT fk_pump_supplier FOREIGN KEY (supplier_id) REFERENCES public.supplier(supplier_id),
  CONSTRAINT fk_pump_mo FOREIGN KEY (manufacturing_order_id) REFERENCES public.manufacturing_order(mo_id)
);
CREATE TABLE public.pump_event (
  event_id integer NOT NULL DEFAULT nextval('pump_event_event_id_seq'::regclass),
  pump_id integer NOT NULL,
  event_type character varying NOT NULL,
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  mill_id integer,
  work_order_id integer,
  notes text,
  diagnosis_id integer,
  CONSTRAINT pump_event_pkey PRIMARY KEY (event_id),
  CONSTRAINT fk_pump_event_pump FOREIGN KEY (pump_id) REFERENCES public.pump(pump_id),
  CONSTRAINT fk_pump_event_mill FOREIGN KEY (mill_id) REFERENCES public.mill(mill_id),
  CONSTRAINT fk_pump_event_wo FOREIGN KEY (work_order_id) REFERENCES public.work_order(work_order_id),
  CONSTRAINT pump_event_diagnosis_id_fkey FOREIGN KEY (diagnosis_id) REFERENCES public.diagnosis_visit(diagnosis_id)
);
CREATE TABLE public.safety_assignment (
  safety_assignment_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  crew_id integer NOT NULL,
  person_id integer NOT NULL,
  start_date date NOT NULL,
  end_date date,
  CONSTRAINT safety_assignment_pkey PRIMARY KEY (safety_assignment_id),
  CONSTRAINT fk_safety_assignment_crew FOREIGN KEY (crew_id) REFERENCES public.crew(crew_id),
  CONSTRAINT fk_safety_assignment_person FOREIGN KEY (person_id) REFERENCES public.person(person_id)
);
CREATE TABLE public.safety_equipment (
  safety_id integer NOT NULL DEFAULT nextval('safety_equipment_safety_id_seq'::regclass),
  code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  description text,
  unit character varying,
  min_stock integer NOT NULL DEFAULT 0,
  supplier_id integer,
  CONSTRAINT safety_equipment_pkey PRIMARY KEY (safety_id),
  CONSTRAINT safety_equipment_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.supplier(supplier_id)
);
CREATE TABLE public.safety_equipment_stock (
  safety_id integer NOT NULL,
  quantity_available integer NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  min_stock integer NOT NULL DEFAULT 0,
  CONSTRAINT safety_equipment_stock_pkey PRIMARY KEY (safety_id),
  CONSTRAINT safety_equipment_stock_safety_id_fkey FOREIGN KEY (safety_id) REFERENCES public.safety_equipment(safety_id)
);
CREATE TABLE public.safety_inventory_movement (
  movement_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  safety_id integer NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['IN'::character varying, 'OUT'::character varying, 'ADJUST'::character varying, 'LOSS'::character varying, 'WEAR'::character varying]::text[])),
  quantity integer NOT NULL CHECK (quantity > 0),
  reference_type character varying,
  reference_id integer,
  crew_id integer,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  CONSTRAINT safety_inventory_movement_pkey PRIMARY KEY (movement_id),
  CONSTRAINT safety_inventory_movement_safety_id_fkey FOREIGN KEY (safety_id) REFERENCES public.safety_equipment(safety_id),
  CONSTRAINT safety_inventory_movement_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES public.crew(crew_id)
);
CREATE TABLE public.supplier (
  supplier_id integer NOT NULL DEFAULT nextval('supplier_supplier_id_seq'::regclass),
  name character varying NOT NULL UNIQUE,
  supplier_type character varying,
  contact_name character varying,
  phone character varying,
  email character varying,
  address text,
  notes text,
  CONSTRAINT supplier_pkey PRIMARY KEY (supplier_id)
);
CREATE TABLE public.tool (
  tool_id integer NOT NULL DEFAULT nextval('tool_tool_id_seq'::regclass),
  code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  type character varying NOT NULL,
  serial_number character varying,
  status character varying NOT NULL CHECK (status::text = ANY (ARRAY['disponible'::character varying::text, 'asignada'::character varying::text])),
  location character varying,
  notes text,
  supplier_id integer,
  CONSTRAINT tool_pkey PRIMARY KEY (tool_id)
);
CREATE TABLE public.tool_stock (
  tool_id integer NOT NULL,
  quantity_available integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  CONSTRAINT tool_stock_pkey PRIMARY KEY (tool_id),
  CONSTRAINT fk_tool_stock_tool FOREIGN KEY (tool_id) REFERENCES public.tool(tool_id)
);
CREATE TABLE public.tool_stock_movement (
  movement_id integer NOT NULL DEFAULT nextval('tool_stock_movement_movement_id_seq'::regclass),
  tool_id integer NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['IN'::character varying, 'OUT'::character varying, 'ADJUST'::character varying]::text[])),
  quantity integer NOT NULL CHECK (quantity > 0),
  reference_type character varying,
  reference_id integer,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  CONSTRAINT tool_stock_movement_pkey PRIMARY KEY (movement_id),
  CONSTRAINT tool_stock_movement_tool_id_fkey FOREIGN KEY (tool_id) REFERENCES public.tool(tool_id)
);
CREATE TABLE public.work_order (
  work_order_id integer NOT NULL DEFAULT nextval('work_order_work_order_id_seq'::regclass),
  mill_id integer NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['preventivo'::character varying, 'correctivo'::character varying]::text[])),
  is_reintervention boolean DEFAULT false,
  priority character varying,
  status character varying NOT NULL CHECK (status::text = ANY (ARRAY['PENDING'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying, 'ON_HOLD'::character varying]::text[])),
  description text,
  diagnosis text,
  scheduled_date date,
  start_date date,
  end_date date,
  crew_id integer,
  created_by integer,
  report_url character varying,
  notes text,
  code text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  pump_id_to_install integer,
  pump_id_to_remove integer,
  pump_installation_notes text,
  CONSTRAINT work_order_pkey PRIMARY KEY (work_order_id),
  CONSTRAINT fk_work_order_mill FOREIGN KEY (mill_id) REFERENCES public.mill(mill_id),
  CONSTRAINT fk_work_order_crew FOREIGN KEY (crew_id) REFERENCES public.crew(crew_id),
  CONSTRAINT fk_work_order_created_by FOREIGN KEY (created_by) REFERENCES public.person(person_id),
  CONSTRAINT work_order_pump_id_to_install_fkey FOREIGN KEY (pump_id_to_install) REFERENCES public.pump(pump_id),
  CONSTRAINT work_order_pump_id_to_remove_fkey FOREIGN KEY (pump_id_to_remove) REFERENCES public.pump(pump_id)
);
CREATE TABLE public.work_order_component_status (
  id integer NOT NULL DEFAULT nextval('work_order_component_status_id_seq'::regclass),
  work_order_id integer NOT NULL,
  component_id integer NOT NULL,
  status character varying NOT NULL CHECK (status::text = ANY (ARRAY['FUNCIONAL'::character varying, 'DANADO'::character varying, 'REQUIERE_CAMBIO'::character varying, 'NO_INSTALADO'::character varying]::text[])),
  observation text,
  damage_description text,
  CONSTRAINT work_order_component_status_pkey PRIMARY KEY (id),
  CONSTRAINT fk_wocs_component FOREIGN KEY (component_id) REFERENCES public.mill_component(component_id),
  CONSTRAINT fk_wocs_work_order FOREIGN KEY (work_order_id) REFERENCES public.work_order(work_order_id)
);
CREATE TABLE public.work_order_piece (
  id integer NOT NULL DEFAULT nextval('work_order_piece_id_seq'::regclass),
  work_order_id integer NOT NULL,
  piece_id integer NOT NULL,
  quantity_used integer NOT NULL,
  CONSTRAINT work_order_piece_pkey PRIMARY KEY (id),
  CONSTRAINT fk_wop_work_order FOREIGN KEY (work_order_id) REFERENCES public.work_order(work_order_id),
  CONSTRAINT fk_wop_piece FOREIGN KEY (piece_id) REFERENCES public.piece(piece_id)
);
CREATE TABLE public.work_order_safety_requirement (
  wo_safety_id bigint NOT NULL DEFAULT nextval('work_order_safety_requirement_wo_safety_id_seq'::regclass),
  work_order_id bigint NOT NULL,
  safety_id bigint NOT NULL,
  quantity_required integer NOT NULL CHECK (quantity_required > 0),
  CONSTRAINT work_order_safety_requirement_pkey PRIMARY KEY (wo_safety_id),
  CONSTRAINT work_order_safety_requirement_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.work_order(work_order_id),
  CONSTRAINT work_order_safety_requirement_safety_id_fkey FOREIGN KEY (safety_id) REFERENCES public.safety_equipment(safety_id)
);
CREATE TABLE public.work_order_safety_reservation (
  reservation_id bigint NOT NULL DEFAULT nextval('work_order_safety_reservation_reservation_id_seq'::regclass),
  work_order_id bigint NOT NULL,
  safety_id bigint NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT work_order_safety_reservation_pkey PRIMARY KEY (reservation_id)
);
CREATE TABLE public.work_order_tool_reservation (
  reservation_id bigint NOT NULL DEFAULT nextval('work_order_tool_reservation_reservation_id_seq'::regclass),
  work_order_id bigint NOT NULL,
  tool_id bigint NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT work_order_tool_reservation_pkey PRIMARY KEY (reservation_id)
);