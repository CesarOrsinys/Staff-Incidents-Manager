-- ============================================================================
-- STAFF INCIDENTS MANAGER - FULL SUPABASE SETUP SCRIPT (SCHEMA + SEED)
-- Pegar y ejecutar directamente en el "SQL Editor" de tu proyecto de Supabase
-- Entorno: Generalitat Valenciana - Castellón de la Plana
-- ============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Limpieza limpia para evitar conflictos de re-ejecución
DROP VIEW IF EXISTS v_monthly_incidents_report;
DROP TABLE IF EXISTS incident_audit_logs CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS work_centers CASCADE;
DROP TABLE IF EXISTS manager_users CASCADE;

DROP TYPE IF EXISTS incident_category CASCADE;
DROP TYPE IF EXISTS contract_type_enum CASCADE;

-- 2. ENUMS
CREATE TYPE incident_category AS ENUM (
  'SUBSTITUTION',       -- Sustitución por cobertura de puesto/baja (quien cubre gana horas extras, sustituido debe)
  'VACATION',           -- Vacaciones anuales reglamentarias
  'PERSONAL_MATTERS',   -- Permiso por asuntos propios / moscosos
  'LEAVE_OR_DEATH',     -- Incapacidad temporal (IT), baja médica o permiso por defunción
  'CONTRACT_END',       -- Finalización de contrato temporal o relevo
  'OVERTIME'            -- Horas extraordinarias / guardias de refuerzo
);

CREATE TYPE contract_type_enum AS ENUM (
  'INDEFINIDO',         -- Personal laboral fijo / funcionario de carrera
  'TEMPORAL',           -- Funcionario interino / contrato laboral temporal
  'SUPLENCIA',          -- Contrato de sustitución / interinidad
  'PRACTICAS',          -- Contrato formativo / prácticas curriculares
  'FORMACION',          -- Formación dual
  'FIJO_DISCONTINUO'    -- Campaña o refuerzo estacional
);

-- 3. TABLA: CENTROS DE TRABAJO
CREATE TABLE work_centers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  entity_type VARCHAR(100) DEFAULT 'Generalitat Valenciana',
  address VARCHAR(255) NOT NULL,
  postal_code VARCHAR(10) DEFAULT '12003',
  city VARCHAR(100) DEFAULT 'Castellón de la Plana',
  province VARCHAR(100) DEFAULT 'Castelló',
  phone VARCHAR(30),
  email VARCHAR(150),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABLA: TRABAJADORES Y PLANTILLA
CREATE TABLE workers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dni VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(150) NOT NULL,
  full_name VARCHAR(255) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  work_center_id TEXT REFERENCES work_centers(id) ON DELETE SET NULL,
  contract_type contract_type_enum NOT NULL DEFAULT 'INDEFINIDO',
  job_category VARCHAR(150) DEFAULT 'Personal de Servicios / Auxiliar',
  email VARCHAR(150),
  phone VARCHAR(30),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TABLA: GESTORES Y GERENCIA
CREATE TABLE manager_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username VARCHAR(60) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  full_name VARCHAR(200) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'MANAGER',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. TABLA: INCIDENCIAS Y PARTES
CREATE TABLE incidents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  work_center_id TEXT NOT NULL REFERENCES work_centers(id) ON DELETE CASCADE,
  incident_type incident_category NOT NULL,
  is_date_range BOOLEAN NOT NULL DEFAULT FALSE,
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME WITHOUT TIME ZONE,
  end_time TIME WITHOUT TIME ZONE,
  total_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  substituted_worker_id TEXT REFERENCES workers(id) ON DELETE SET NULL,
  observations TEXT,
  period_month SMALLINT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year SMALLINT NOT NULL CHECK (period_year BETWEEN 2020 AND 2040),
  created_by TEXT DEFAULT 'Gerente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT chk_date_consistency CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT chk_substitute_different CHECK (
    substituted_worker_id IS NULL OR substituted_worker_id <> worker_id
  )
);

-- 7. AUDITORÍA
CREATE TABLE incident_audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  incident_id TEXT REFERENCES incidents(id) ON DELETE CASCADE,
  action VARCHAR(40) NOT NULL,
  performed_by VARCHAR(150) NOT NULL DEFAULT 'Sistema',
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. ÍNDICES DE RENDIMIENTO
CREATE INDEX idx_incidents_period ON incidents (period_year, period_month);
CREATE INDEX idx_incidents_worker ON incidents (worker_id);
CREATE INDEX idx_incidents_center ON incidents (work_center_id);
CREATE INDEX idx_incidents_type ON incidents (incident_type);
CREATE INDEX idx_incidents_start_date ON incidents (start_date);
CREATE INDEX idx_workers_center ON workers (work_center_id);
CREATE INDEX idx_workers_active ON workers (active);

-- 9. VISTA OFICIAL DE BALANCE MENSUAL
CREATE OR REPLACE VIEW v_monthly_incidents_report AS
SELECT
  w.id AS worker_id,
  w.full_name AS worker_name,
  w.dni AS worker_dni,
  w.contract_type,
  wc.id AS work_center_id,
  wc.name AS work_center_name,
  wc.code AS work_center_code,
  i.period_month,
  i.period_year,
  COALESCE(SUM(CASE WHEN i.incident_type = 'OVERTIME' THEN i.total_hours ELSE 0 END), 0) AS total_overtime_hours,
  COALESCE(SUM(CASE WHEN i.incident_type = 'SUBSTITUTION' THEN i.total_hours ELSE 0 END), 0) AS total_substitution_hours,
  COALESCE(COUNT(CASE WHEN i.incident_type = 'VACATION' THEN 1 END), 0) AS total_vacation_entries,
  COALESCE(COUNT(CASE WHEN i.incident_type = 'PERSONAL_MATTERS' THEN 1 END), 0) AS total_personal_matters_entries,
  COALESCE(COUNT(CASE WHEN i.incident_type = 'LEAVE_OR_DEATH' THEN 1 END), 0) AS total_leave_entries,
  COUNT(i.id) AS total_incidents_count
FROM workers w
JOIN work_centers wc ON w.work_center_id = wc.id
LEFT JOIN incidents i ON w.id = i.worker_id
GROUP BY
  w.id, w.full_name, w.dni, w.contract_type,
  wc.id, wc.name, wc.code,
  i.period_month, i.period_year;

-- 10. SEGURIDAD (ROW LEVEL SECURITY)
ALTER TABLE work_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on work_centers" ON work_centers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write on work_centers" ON work_centers FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on workers" ON workers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write on workers" ON workers FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on incidents" ON incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write on incidents" ON incidents FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on audit_logs" ON incident_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on audit_logs" ON incident_audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Acceso anónimo para dev / app web
CREATE POLICY "Allow anon read for dev work_centers" ON work_centers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon write for dev work_centers" ON work_centers FOR ALL TO anon USING (true);
CREATE POLICY "Allow anon read for dev workers" ON workers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon write for dev workers" ON workers FOR ALL TO anon USING (true);
CREATE POLICY "Allow anon read for dev incidents" ON incidents FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon write for dev incidents" ON incidents FOR ALL TO anon USING (true);

-- ============================================================================
-- 11. DATOS DE PRUEBA (SEED) - GOBIERNO EN CASTELLÓN DE LA PLANA
-- ============================================================================

-- Gestores
INSERT INTO manager_users (id, username, email, full_name, password_hash, role, active)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'gerente',
    'gerencia.castello@gva.es',
    'Administrador Territorial Castelló',
    '$2b$10$wN9P31WJ7b9p8KxQJ.E3k.l6h0pW4t3kK3yP1k3yP1k3yP1k3yP1k', -- admin123
    'MANAGER',
    true
  );

-- Centros de Trabajo (Castellón)
INSERT INTO work_centers (id, code, name, entity_type, address, postal_code, city, province, phone, email, active)
VALUES
  (
    'wc_borrull',
    'BOR-001',
    'Edificio Juez Borrull',
    'Generalitat Valenciana',
    'Plaza del Juez Borrull, 1',
    '12003',
    'Castellón de la Plana',
    'Castelló',
    '964 39 90 00',
    'juez_borrull@gva.es',
    true
  ),
  (
    '11111111-1111-1111-1111-111111110001',
    'CA-PROP-01',
    'Complex Administratiu PROP Castelló - Generalitat Valenciana',
    'Generalitat Valenciana',
    'Carrer Major, 76',
    '12001',
    'Castellón de la Plana',
    'Castelló',
    '964 33 30 00',
    'prop_castello@gva.es',
    true
  ),
  (
    '11111111-1111-1111-1111-111111110002',
    'CA-CONSELL-02',
    'Casa dels Caragols - Seu del Consell de la Generalitat a Castelló',
    'Presidència de la Generalitat',
    'Carrer Major, 78',
    '12001',
    'Castellón de la Plana',
    'Castelló',
    '964 35 80 00',
    'delegacio_consell.castello@gva.es',
    true
  ),
  (
    '11111111-1111-1111-1111-111111110003',
    'CA-HUG-03',
    'Hospital General Universitari de Castelló - Conselleria de Sanitat',
    'Conselleria de Sanitat Universal',
    'Avinguda de Benicàssim, 128',
    '12004',
    'Castellón de la Plana',
    'Castelló',
    '964 72 65 00',
    'rh_hospital_castello@san.gva.es',
    true
  ),
  (
    '11111111-1111-1111-1111-111111110004',
    'CA-JUST-04',
    'Ciutat de la Justícia de Castelló - Palau de Justícia',
    'Conselleria de Justícia i Interior',
    'Bulevard Blasco Ibáñez, 10',
    '12003',
    'Castellón de la Plana',
    'Castelló',
    '964 62 10 00',
    'justicia_castello@gva.es',
    true
  ),
  (
    '11111111-1111-1111-1111-111111110006',
    'CA-IGUALTAT-06',
    'Direcció Territorial de Serveis Socials i Igualtat',
    'Conselleria de Serveis Socials',
    'Avinguda Germans Bou, 81',
    '12003',
    'Castellón de la Plana',
    'Castelló',
    '964 73 80 00',
    'igualtat_castello@gva.es',
    true
  ),
  (
    '11111111-1111-1111-1111-111111110007',
    'CA-AJUNT-07',
    'Palau Municipal - Ajuntament de Castelló de la Plana',
    'Ajuntament de Castelló',
    'Plaça Major, 1',
    '12001',
    'Castellón de la Plana',
    'Castelló',
    '964 35 51 00',
    'personal@castello.es',
    true
  );

-- Plantilla de Personal (Edificio Juez Borrull y sedes de Castellón)
INSERT INTO workers (id, dni, first_name, last_name, work_center_id, contract_type, job_category, email, phone, active)
VALUES
  (
    'w_aurora',
    '18942103K',
    'Aurora',
    'Belmonte',
    'wc_borrull',
    'INDEFINIDO',
    'Personal de Servicios / Auxiliar',
    'aurora.belmonte@gva.es',
    '620112233',
    true
  ),
  (
    'w_elizabeth',
    '18999888E',
    'Elizabeth',
    'Vasquez',
    'wc_borrull',
    'INDEFINIDO',
    'Personal de Servicios / Auxiliar',
    'elizabeth.vasquez@gva.es',
    '620998877',
    true
  ),
  (
    'w_yris',
    '18911222Y',
    'Yris Marlenys',
    'Orsinys',
    'wc_borrull',
    'INDEFINIDO',
    'Personal de Servicios / Mantenimiento',
    'yris.orsinys@gva.es',
    '620111222',
    true
  ),
  (
    'w_rafael',
    '18955444R',
    'Rafael',
    'Arismendi',
    'wc_borrull',
    'INDEFINIDO',
    'Auxiliar de Mantenimiento',
    'rafael.arismendi@gva.es',
    '620334455',
    true
  ),
  (
    'w_dulce',
    '18977888D',
    'Dulce Tibisay',
    'Guerrero',
    'wc_borrull',
    'TEMPORAL',
    'Auxiliar de Refuerzo',
    'dulce.guerrero@gva.es',
    '620556677',
    true
  ),
  (
    'w_liliana',
    '19011333L',
    'Liliana',
    'Savu',
    'wc_borrull',
    'INDEFINIDO',
    'Personal de Servicios',
    'liliana.savu@gva.es',
    '620778899',
    true
  ),
  (
    'w_mohamed',
    '19022444M',
    'Mohamed',
    'Ouahabi Naouer',
    'wc_borrull',
    'INDEFINIDO',
    'Personal de Servicios',
    'mohamed.ouahabi@gva.es',
    '620889900',
    true
  ),
  (
    'w_osayande',
    '19033555O',
    'Osayande',
    'Egharevba',
    'wc_borrull',
    'INDEFINIDO',
    'Personal de Servicios',
    'osayande@gva.es',
    '620001122',
    true
  ),
  (
    'w_adriana',
    '19044666A',
    'Adriana',
    'Valencia',
    'wc_borrull',
    'TEMPORAL',
    'Auxiliar de Refuerzo',
    'adriana.valencia@gva.es',
    '620223344',
    true
  ),
  (
    'w_isabel',
    '19055777I',
    'Isabel',
    'Serradilla',
    'wc_borrull',
    'TEMPORAL',
    'Auxiliar de Servicios',
    'isabel.serradilla@gva.es',
    '620445566',
    true
  ),
  (
    'w_ada',
    '19066888G',
    'Ada',
    'Gonzalez',
    'wc_borrull',
    'TEMPORAL',
    'Personal de Servicios',
    'ada.gonzalez@gva.es',
    '620667788',
    true
  ),
  (
    'w_anaya',
    '19077999N',
    'Anaya',
    'Navarro',
    'wc_borrull',
    'INDEFINIDO',
    'Personal de Servicios',
    'anaya.navarro@gva.es',
    '620889911',
    true
  ),
  (
    '22222222-2222-2222-2222-222222220002',
    '19875412M',
    'Vicent',
    'Sales Albiol',
    '11111111-1111-1111-1111-111111110002',
    'INDEFINIDO',
    'Tècnic de Gestió Administrativa del Consell',
    'vicent.sales@gva.es',
    '630223344',
    true
  ),
  (
    '22222222-2222-2222-2222-222222220003',
    '20456789L',
    'Mireia',
    'Garcia Nebot',
    '11111111-1111-1111-1111-111111110003',
    'TEMPORAL',
    'Infermera de Reforç Urgències Hospitalàries',
    'mireia.garcia@san.gva.es',
    '640334455',
    true
  );

-- Incidencias reales para Octubre 2026
INSERT INTO incidents (
  id,
  worker_id,
  work_center_id,
  incident_type,
  is_date_range,
  start_date,
  end_date,
  start_time,
  end_time,
  total_hours,
  substituted_worker_id,
  observations,
  period_month,
  period_year,
  created_by
)
VALUES
  -- 1. Suplencia clave: Elizabeth cubre a Aurora (13:30 - 18:00 = 4.5 horas extras ganadas)
  (
    'inc_borrull_sub_01',
    'w_elizabeth',
    'wc_borrull',
    'SUBSTITUTION',
    false,
    '2026-10-05',
    '2026-10-05',
    '13:30',
    '18:00',
    4.50,
    'w_aurora',
    '13:30-18:00 Por Aurora.',
    10,
    2026,
    'Gerente'
  ),
  -- 2. Rafael Arismendi: Vacaciones reglamentarias (del 14 al 16 de Octubre)
  (
    'inc_borrull_vac_01',
    'w_rafael',
    'wc_borrull',
    'VACATION',
    true,
    '2026-10-14',
    '2026-10-16',
    null,
    null,
    0.00,
    null,
    'Días de vacaciones pendientes segundo semestre',
    10,
    2026,
    'Gerente'
  ),
  -- 3. Aurora Belmonte: Permiso por Asuntos Propios (Día 22 de Octubre)
  (
    'inc_borrull_ap_01',
    'w_aurora',
    'wc_borrull',
    'PERSONAL_MATTERS',
    false,
    '2026-10-22',
    '2026-10-22',
    null,
    null,
    0.00,
    null,
    'Día de asuntos propios reglamentario',
    10,
    2026,
    'Gerente'
  ),
  -- 4. Dulce Tibisay Guerrero: Baja médica (del 19 al 23 de Octubre)
  (
    'inc_borrull_baja_01',
    'w_dulce',
    'wc_borrull',
    'LEAVE_OR_DEATH',
    true,
    '2026-10-19',
    '2026-10-23',
    null,
    null,
    0.00,
    null,
    'Baja médica por IT con justificante',
    10,
    2026,
    'Gerente'
  ),
  -- 5. Adriana Valencia: Fin de Contrato temporal (Día 31 de Octubre)
  (
    'inc_borrull_fc_01',
    'w_adriana',
    'wc_borrull',
    'CONTRACT_END',
    false,
    '2026-10-31',
    '2026-10-31',
    null,
    null,
    0.00,
    null,
    'Fin de contrato de interinidad',
    10,
    2026,
    'Gerente'
  );

-- 12. LOG DE AUDITORÍA INICIAL
INSERT INTO incident_audit_logs (incident_id, action, performed_by, payload)
VALUES
  (
    'inc_borrull_sub_01',
    'CREATED',
    'gerente',
    '{"reason": "Carga inicial de datos de prueba - Edificio Juez Borrull (Castellón de la Plana)"}'::jsonb
  );
