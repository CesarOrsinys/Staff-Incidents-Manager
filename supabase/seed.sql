-- ============================================================================
-- STAFF INCIDENTS MANAGER - TEST DATA (SEED)
-- Entorno: Generalitat Valenciana / Administració Pública
-- Municipi: Castelló de la Plana (Comunitat Valenciana)
-- ============================================================================

-- 1. USUARIOS DE GERENCIA Y ADMINISTRACIÓN
INSERT INTO manager_users (id, username, email, full_name, password_hash, role, active)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'gerente',
    'gerencia.castello@gva.es',
    'Administrador Territorial Castelló',
    '$2b$10$hcFPlXkY/LGCI308x5xfHuLIoDo9Ga3CpFx7cZhfLKAexRqAGHcB6', -- admin123
    'MANAGER',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'rrhh_castello',
    'rrhh.generalitat@castello.es',
    'Coordinadora RRHH Personal Castelló',
    '$2b$10$hcFPlXkY/LGCI308x5xfHuLIoDo9Ga3CpFx7cZhfLKAexRqAGHcB6', -- admin123
    'MANAGER',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Borrull',
    'yris.orsinys@borrull.gva.es',
    'Yris Orsinys',
    '$2b$10$wDMbwfFLaZN.X8yQOmrRc.i15O2f8Ht8lTTcZFC80ubO9f/bSLbpy', -- 2026
    'MANAGER',
    true
  )
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash;

-- 2. CENTROS DE TRABAJO (SEDES OFICIALES DE LA ADMINISTRACIÓN EN CASTELLÓN)
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
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  city = EXCLUDED.city;

-- 3. PLANTILLA Y PERSONAL ASIGNADO (EDIFICIO JUEZ BORRULL Y SEDES DE CASTELLÓN)
INSERT INTO workers (id, dni, first_name, last_name, work_center_id, contract_type, job_category, email, phone, active)
VALUES
  -- Personal del Centro Oficial: Edificio Juez Borrull
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

  -- Empleados Públicos en otras sedes de Castellón
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
  ),
  (
    '22222222-2222-2222-2222-222222220005',
    '19012345C',
    'Elena',
    'Ramos Fabra',
    '11111111-1111-1111-1111-111111110004',
    'INDEFINIDO',
    'Tramitadora Processal i Administrativa',
    'elena.ramos@just.gva.es',
    '660556677',
    true
  )
ON CONFLICT (dni) DO UPDATE SET
  work_center_id = EXCLUDED.work_center_id,
  contract_type = EXCLUDED.contract_type,
  active = EXCLUDED.active;

-- 4. PARTES E INCIDENCIAS DEL MES (OCTUBRE 2026 - EDIFICIO JUEZ BORRULL Y CASTELLÓN)
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
  -- 1. Suplencia clave: Elizabeth Vasquez cubre a Aurora Belmonte (13:30 - 18:00 = 4.5 horas)
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
    'Días de vacaciones pendientes correspondientes al segundo semestre',
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
  -- 4. Dulce Tibisay Guerrero: Baja médica / Incapacidad temporal (del 19 al 23 de Octubre)
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
    'Baja médica por IT con parte de confirmación oficial',
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
    'Fin de contrato de obra y servicio por vencimiento de plazo legal',
    10,
    2026,
    'Gerente'
  ),
  -- 6. Vicent Sales (Casa dels Caragols): Horas extraordinarias por acto institucional
  (
    'inc_castello_ot_01',
    '22222222-2222-2222-2222-222222220002',
    '11111111-1111-1111-1111-111111110002',
    'OVERTIME',
    false,
    '2026-10-08',
    '2026-10-08',
    '16:30',
    '20:30',
    4.00,
    null,
    'Apoyo administrativo y protocolo en visita oficial a la Casa dels Caragols',
    10,
    2026,
    'Gerente'
  ),
  -- 7. Mireia Garcia (Hospital General): Horas extraordinarias de refuerzo
  (
    'inc_castello_ot_02',
    '22222222-2222-2222-2222-222222220003',
    '11111111-1111-1111-1111-111111110003',
    'OVERTIME',
    false,
    '2026-10-12',
    '2026-10-12',
    '15:00',
    '22:00',
    7.00,
    null,
    'Refuerzo festivo en el Hospital General de Castellón',
    10,
    2026,
    'Gerente'
  )
ON CONFLICT (id) DO UPDATE SET
  total_hours = EXCLUDED.total_hours,
  observations = EXCLUDED.observations;

-- 5. AUDITORÍA INICIAL
INSERT INTO incident_audit_logs (incident_id, action, performed_by, payload)
VALUES
  (
    'inc_borrull_sub_01',
    'CREATED',
    'gerente',
    '{"reason": "Carga inicial de datos de prueba - Edificio Juez Borrull (Castellón de la Plana)"}'::jsonb
  );
