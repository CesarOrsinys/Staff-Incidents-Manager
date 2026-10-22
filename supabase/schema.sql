-- ============================================================================
-- STAFF INCIDENTS MANAGER - SUPABASE DATABASE SCHEMA
-- Target Database: PostgreSQL 15+ / Supabase
-- Region / Context: Administració Pública - Castelló de la Plana
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean existing schema if re-running
DROP VIEW IF EXISTS v_monthly_incidents_report;
DROP TABLE IF EXISTS incident_audit_logs CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS work_centers CASCADE;
DROP TABLE IF EXISTS manager_users CASCADE;

DROP TYPE IF EXISTS incident_category CASCADE;
DROP TYPE IF EXISTS contract_type_enum CASCADE;

-- ============================================================================
-- 2. ENUMS & DOMAIN TYPES
-- ============================================================================
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

-- ============================================================================
-- 3. TABLE: WORK CENTERS (Centros de Trabajo Públicos)
-- ============================================================================
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

-- ============================================================================
-- 4. TABLE: WORKERS (Plantilla de Personal y Empleados Públicos)
-- ============================================================================
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

-- ============================================================================
-- 5. TABLE: MANAGER USERS (Gestores y Gerencia con RBAC)
-- ============================================================================
CREATE TABLE manager_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username VARCHAR(60) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  full_name VARCHAR(200) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'MANAGER', -- 'MANAGER', 'SUPER_ADMIN'
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 6. TABLE: INCIDENTS (Partes de Horas, Ausencias y Sustituciones)
-- ============================================================================
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

  -- Restricción de Integridad: fecha de fin no puede ser anterior a fecha de inicio
  CONSTRAINT chk_date_consistency CHECK (end_date IS NULL OR end_date >= start_date),

  -- Restricción de Integridad: sustituto no puede ser el mismo trabajador
  CONSTRAINT chk_substitute_different CHECK (
    substituted_worker_id IS NULL OR substituted_worker_id <> worker_id
  )
);

-- ============================================================================
-- 7. TABLE: INCIDENT AUDIT LOGS (Auditoría Legal y Trazabilidad)
-- ============================================================================
CREATE TABLE incident_audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  incident_id TEXT REFERENCES incidents(id) ON DELETE CASCADE,
  action VARCHAR(40) NOT NULL, -- 'CREATED', 'UPDATED', 'DELETED', 'EXPORTED'
  performed_by VARCHAR(150) NOT NULL DEFAULT 'Sistema',
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 8. INDEXES FOR HIGH PERFORMANCE
-- ============================================================================
CREATE INDEX idx_incidents_period ON incidents (period_year, period_month);
CREATE INDEX idx_incidents_worker ON incidents (worker_id);
CREATE INDEX idx_incidents_center ON incidents (work_center_id);
CREATE INDEX idx_incidents_type ON incidents (incident_type);
CREATE INDEX idx_incidents_start_date ON incidents (start_date);
CREATE INDEX idx_workers_center ON workers (work_center_id);
CREATE INDEX idx_workers_active ON workers (active);

-- ============================================================================
-- 9. REPORT VIEW: MONTHLY SUMMARY BY WORKER
-- ============================================================================
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

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) FOR SUPABASE
-- ============================================================================
ALTER TABLE work_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow read and write for authenticated users / service_role
CREATE POLICY "Allow authenticated read on work_centers" ON work_centers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write on work_centers" ON work_centers FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on workers" ON workers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write on workers" ON workers FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on incidents" ON incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write on incidents" ON incidents FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on audit_logs" ON incident_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on audit_logs" ON incident_audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Allow anonymous access for demo/dev
CREATE POLICY "Allow anon read for dev work_centers" ON work_centers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon write for dev work_centers" ON work_centers FOR ALL TO anon USING (true);
CREATE POLICY "Allow anon read for dev workers" ON workers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon write for dev workers" ON workers FOR ALL TO anon USING (true);
CREATE POLICY "Allow anon read for dev incidents" ON incidents FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon write for dev incidents" ON incidents FOR ALL TO anon USING (true);
