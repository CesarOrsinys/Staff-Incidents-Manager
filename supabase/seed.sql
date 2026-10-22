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
    '$2b$10$wN9P31WJ7b9p8KxQJ.E3k.l6h0pW4t3kK3yP1k3yP1k3yP1k3yP1k', -- admin123
    'MANAGER',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'rrhh_castello',
    'rrhh.generalitat@castello.es',
    'Coordinadora RRHH Personal Castelló',
    '$2b$10$wN9P31WJ7b9p8KxQJ.E3k.l6h0pW4t3kK3yP1k3yP1k3yP1k3yP1k',
    'MANAGER',
    true
  )
ON CONFLICT (username) DO NOTHING;

-- 2. CENTROS DE TRABAJO (UBICACIONES DEL GOBIERNO EN CASTELLÓN DE LA PLANA)
INSERT INTO work_centers (id, code, name, entity_type, address, postal_code, city, province, phone, email, active)
VALUES
  (
    '11111111-1111-1111-1111-111111110001',
    'CA-PROP-01',
    'Complex Administratiu PROP Castelló - Generalitat Valenciana',
    'Generalitat Valenciana',
    'Carrer Major, 76',
    '12001',
    'Castelló de la Plana',
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
    'Castelló de la Plana',
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
    'Castelló de la Plana',
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
    'Castelló de la Plana',
    'Castelló',
    '964 62 10 00',
    'justicia_castello@gva.es',
    true
  ),
  (
    '11111111-1111-1111-1111-111111110005',
    'CA-BORRULL-05',
    'Edifici Administratiu del Govern Valencià (Antic Jutge Borrull)',
    'Generalitat Valenciana',
    'Plaça del Jutge Borrull, 1',
    '12003',
    'Castelló de la Plana',
    'Castelló',
    '964 39 90 00',
    'borrull_administracio@gva.es',
    true
  ),
  (
    '11111111-1111-1111-1111-111111110006',
    'CA-IGUALTAT-06',
    'Direcció Territorial de Serveis Socials i Igualtat',
    'Conselleria de Serveis Socials',
    'Avinguda Germans Bou, 81',
    '12003',
    'Castelló de la Plana',
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
    'Castelló de la Plana',
    'Castelló',
    '964 35 51 00',
    'personal@castello.es',
    true
  )
ON CONFLICT (code) DO NOTHING;

-- 3. TRABAJADORES Y EMPLEADOS PÚBLICOS EN CASTELLÓN
INSERT INTO workers (id, dni, first_name, last_name, work_center_id, contract_type, job_category, email, phone, active)
VALUES
  (
    '22222222-2222-2222-2222-222222220001',
    '18942103K',
    'Aurora',
    'Beltrán Ferrando',
    '11111111-1111-1111-1111-111111110001',
    'INDEFINIDO',
    'Auxiliar de Gestió Tributària i Registre',
    'aurora.beltran@gva.es',
    '620112233',
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
  ),
  (
    '22222222-2222-2222-2222-222222220004',
    '18965432B',
    'Marc',
    'Roig Ramos',
    '11111111-1111-1111-1111-111111110003',
    'INDEFINIDO',
    'Zelador d''Admissions i Consultes Externes',
    'marc.roig@san.gva.es',
    '650445566',
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
  ),
  (
    '22222222-2222-2222-2222-222222220006',
    '20123987R',
    'Carles',
    'Vicent Soler',
    '11111111-1111-1111-1111-111111110005',
    'TEMPORAL',
    'Oficial d''Atenció Ciutadana i Registre',
    'carles.vicent@gva.es',
    '670667788',
    true
  ),
  (
    '22222222-2222-2222-2222-222222220007',
    '18987123P',
    'Neus',
    'Forner Barberà',
    '11111111-1111-1111-1111-111111110006',
    'INDEFINIDO',
    'Treballadora Social - Dependència i Majors',
    'neus.forner@gva.es',
    '680778899',
    true
  ),
  (
    '22222222-2222-2222-2222-222222220008',
    '19456123F',
    'Andreu',
    'Pascual Miralles',
    '11111111-1111-1111-1111-111111110007',
    'INDEFINIDO',
    'Auxiliar Administratiu Municipal - Padró d''Habitants',
    'andreu.pascual@castello.es',
    '690889900',
    true
  ),
  (
    '22222222-2222-2222-2222-222222220009',
    '20567812J',
    'Sofia',
    'Bellmunt Vilar',
    '11111111-1111-1111-1111-111111110001',
    'TEMPORAL',
    'Auxiliar de Suport Campanya Renda i Registre',
    'sofia.bellmunt@gva.es',
    '611990011',
    true
  )
ON CONFLICT (dni) DO NOTHING;

-- 4. PARTES E INCIDENCIAS DEL MES (OCTUBRE 2026 - CASTELLÓN DE LA PLANA)
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
  period_year
)
VALUES
  -- 1. Sofia Bellmunt sustituye a Aurora Beltrán por baja médica en PROP Castelló
  (
    '33333333-3333-3333-3333-333333330001',
    '22222222-2222-2222-2222-222222220009', -- Sofia
    '11111111-1111-1111-1111-111111110001', -- PROP
    'SUBSTITUTION',
    false,
    '2026-10-05',
    '2026-10-05',
    '08:00',
    '15:30',
    7.50,
    '22222222-2222-2222-2222-222222220001', -- Sustituye a Aurora
    'Cobertura de finestreta única d''atenció PROP per baixa per IT',
    10,
    2026
  ),
  -- 2. Aurora Beltrán en Baja médica (IT)
  (
    '33333333-3333-3333-3333-333333330002',
    '22222222-2222-2222-2222-222222220001', -- Aurora
    '11111111-1111-1111-1111-111111110001', -- PROP
    'LEAVE_OR_DEATH',
    true,
    '2026-10-05',
    '2026-10-09',
    null,
    null,
    0.00,
    null,
    'Incapacitat temporal per intervenció quirúrgica menor (5 dies)',
    10,
    2026
  ),
  -- 3. Vicent Sales (Casa dels Caragols) - Horas Extraordinarias por Pleno extraordinario
  (
    '33333333-3333-3333-3333-333333330003',
    '22222222-2222-2222-2222-222222220002', -- Vicent
    '11111111-1111-1111-1111-111111110002', -- Consell
    'OVERTIME',
    false,
    '2026-10-08',
    '2026-10-08',
    '16:30',
    '20:30',
    4.00,
    null,
    'Suport administratiu i protocol en visita institucional a la Casa dels Caragols',
    10,
    2026
  ),
  -- 4. Mireia Garcia (Hospital General Castelló) - Horas extraordinarias guardia urgencias
  (
    '33333333-3333-3333-3333-333333330004',
    '22222222-2222-2222-2222-222222220003', -- Mireia
    '11111111-1111-1111-1111-111111110003', -- Hospital
    'OVERTIME',
    false,
    '2026-10-12',
    '2026-10-12',
    '15:00',
    '22:00',
    7.00,
    null,
    'Reforç festiu de torn d''urgències a l''Hospital General Universitari',
    10,
    2026
  ),
  -- 5. Marc Roig (Hospital General) - Días de Asuntos Propios (Moscosos)
  (
    '33333333-3333-3333-3333-333333330005',
    '22222222-2222-2222-2222-222222220004', -- Marc
    '11111111-1111-1111-1111-111111110003', -- Hospital
    'PERSONAL_MATTERS',
    false,
    '2026-10-16',
    '2026-10-16',
    null,
    null,
    0.00,
    null,
    'Permís reglamentari per assumptes particulars autoritzat per Direcció Mèdica',
    10,
    2026
  ),
  -- 6. Elena Ramos (Ciutat de la Justícia) - Vacaciones
  (
    '33333333-3333-3333-3333-333333330006',
    '22222222-2222-2222-2222-222222220005', -- Elena
    '11111111-1111-1111-1111-111111110004', -- Ciutat Justícia
    'VACATION',
    true,
    '2026-10-19',
    '2026-10-23',
    null,
    null,
    0.00,
    null,
    'Període de vacances aprovat per Secretaria de Govern Judicial',
    10,
    2026
  ),
  -- 7. Carles Vicent (Edifici Juez Borrull) - Sustitución de compañero
  (
    '33333333-3333-3333-3333-333333330007',
    '22222222-2222-2222-2222-222222220006', -- Carles
    '11111111-1111-1111-1111-111111110005', -- Juez Borrull
    'SUBSTITUTION',
    false,
    '2026-10-21',
    '2026-10-21',
    '14:00',
    '20:00',
    6.00,
    '22222222-2222-2222-2222-222222220008', -- Sustituye a Andreu en comisión de servicios
    'Cobertura de finestreta d''informació ciutadana a Borrull torn de vesprada',
    10,
    2026
  ),
  -- 8. Neus Forner (Direcció Territorial Germans Bou) - Horas extra por informes de dependencia
  (
    '33333333-3333-3333-3333-333333330008',
    '22222222-2222-2222-2222-222222220007', -- Neus
    '11111111-1111-1111-1111-111111110006', -- Germans Bou
    'OVERTIME',
    false,
    '2026-10-22',
    '2026-10-22',
    '16:00',
    '19:30',
    3.50,
    null,
    'Plan de xoc d''expedients de dependència i valoració de grau',
    10,
    2026
  )
ON CONFLICT (id) DO NOTHING;

-- 5. AUDITORÍA INICIAL
INSERT INTO incident_audit_logs (incident_id, action, performed_by, payload)
VALUES
  (
    '33333333-3333-3333-3333-333333330001',
    'CREATED',
    'gerente',
    '{"reason": "Càrrega inicial de dades de prova - Castelló de la Plana"}'::jsonb
  );
