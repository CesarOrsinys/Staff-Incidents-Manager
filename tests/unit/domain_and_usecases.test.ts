import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { IncidentType } from '../../src/core/domain/enums/IncidentType.js';
import { calculateHours, IncidentInputSchema } from '../../src/core/domain/schemas/IncidentSchema.js';
import { JsonWorkCenterRepository } from '../../src/adapters/infrastructure/repositories/JsonWorkCenterRepository.js';
import { JsonWorkerRepository } from '../../src/adapters/infrastructure/repositories/JsonWorkerRepository.js';
import { JsonIncidentRepository } from '../../src/adapters/infrastructure/repositories/JsonIncidentRepository.js';
import { JsonAuthRepository } from '../../src/adapters/infrastructure/repositories/JsonAuthRepository.js';
import { SupabaseIncidentRepository } from '../../src/adapters/infrastructure/repositories/SupabaseIncidentRepository.js';
import { RepositoryContainer } from '../../src/adapters/infrastructure/di/RepositoryContainer.js';
import { RegisterIncidentUseCase } from '../../src/core/usecases/RegisterIncidentUseCase.js';
import { GetMonthlyReportUseCase } from '../../src/core/usecases/GetMonthlyReportUseCase.js';
import { AuthenticateManagerUseCase } from '../../src/core/usecases/AuthenticateManagerUseCase.js';
import { ExportService } from '../../src/adapters/infrastructure/services/ExportService.js';
import { ExportReportUseCase } from '../../src/core/usecases/ExportReportUseCase.js';
import { translations } from '../../src/ui/i18n/LanguageManager.js';

describe('Staff Incidents Manager - Domain & Use Cases Suite', () => {

  describe('1. Zod Validation & Edge Cases (Kickoff Section 2.2 & 3.2)', () => {
    it('Should calculate hours correctly between start and end time', () => {
      const hours1 = calculateHours('13:30', '18:00');
      assert.strictEqual(hours1, 4.5);

      const hours2 = calculateHours('08:00', '16:30');
      assert.strictEqual(hours2, 8.5);

      // Night shift spanning midnight
      const hoursOvernight = calculateHours('22:00', '02:00');
      assert.strictEqual(hoursOvernight, 4.0);
    });

    it('Should reject incident when endDate is before startDate', () => {
      const result = IncidentInputSchema.safeParse({
        workCenterId: 'wc_borrull',
        workerId: 'w_aurora',
        type: IncidentType.VACATION,
        startDate: '2026-10-15',
        endDate: '2026-10-10', // Invalid: prior to start
        periodMonth: 10,
        periodYear: 2026
      });

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.issues.some(i => i.message === 'errEndDateBeforeStartDate'));
      }
    });

    it('Should reject SUBSTITUTION if startTime or endTime is missing', () => {
      const result = IncidentInputSchema.safeParse({
        workCenterId: 'wc_borrull',
        workerId: 'w_elizabeth',
        type: IncidentType.SUBSTITUTION,
        startDate: '2026-10-05',
        endDate: '2026-10-05',
        periodMonth: 10,
        periodYear: 2026,
        substitutedWorkerId: 'w_aurora'
        // Missing startTime & endTime
      });

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.issues.some(i => i.message === 'errStartTimeRequired'));
      }
    });

    it('Should reject SUBSTITUTION if substitutedWorkerId is missing or equal to workerId', () => {
      const missingSubResult = IncidentInputSchema.safeParse({
        workCenterId: 'wc_borrull',
        workerId: 'w_elizabeth',
        type: IncidentType.SUBSTITUTION,
        startDate: '2026-10-05',
        endDate: '2026-10-05',
        periodMonth: 10,
        periodYear: 2026,
        startTime: '13:30',
        endTime: '18:00'
      });

      assert.strictEqual(missingSubResult.success, false);

      const selfSubResult = IncidentInputSchema.safeParse({
        workCenterId: 'wc_borrull',
        workerId: 'w_elizabeth',
        type: IncidentType.SUBSTITUTION,
        startDate: '2026-10-05',
        endDate: '2026-10-05',
        periodMonth: 10,
        periodYear: 2026,
        startTime: '13:30',
        endTime: '18:00',
        substitutedWorkerId: 'w_elizabeth' // Cannot substitute oneself
      });

      assert.strictEqual(selfSubResult.success, false);
      if (!selfSubResult.success) {
        assert.ok(selfSubResult.error.issues.some(i => i.message === 'errCannotSubstituteSelf'));
      }
    });

    it('Should accept valid OVERTIME with calculated hours', () => {
      const result = IncidentInputSchema.safeParse({
        workCenterId: 'wc_borrull',
        workerId: 'w_carlos',
        type: IncidentType.OVERTIME,
        startDate: '2026-10-07',
        endDate: '2026-10-07',
        periodMonth: 10,
        periodYear: 2026,
        startTime: '18:00',
        endTime: '20:30'
      });

      assert.strictEqual(result.success, true);
    });
  });

  describe('2. Repository Pattern & Architecture Isolation (Kickoff Section 3.2)', () => {
    it('Should verify that RepositoryContainer allows swapping repositories', () => {
      RepositoryContainer.reset();

      const defaultIncidentRepo = RepositoryContainer.getIncidentRepository();
      assert.ok(defaultIncidentRepo instanceof JsonIncidentRepository);

      // Swap with Supabase Phase 2 Repository
      const supabaseRepo = new SupabaseIncidentRepository();
      RepositoryContainer.setRepositories({ incidentRepo: supabaseRepo });

      const updatedRepo = RepositoryContainer.getIncidentRepository();
      assert.ok(updatedRepo instanceof SupabaseIncidentRepository);

      // Clean reset
      RepositoryContainer.reset();
      assert.ok(RepositoryContainer.getIncidentRepository() instanceof JsonIncidentRepository);
    });
  });

  describe('3. Core Incident Registration & Monthly Report Use Cases (Kickoff Section 2.2)', () => {
    it('Should register incident and calculate totalHours automatically', async () => {
      const centerRepo = new JsonWorkCenterRepository();
      const workerRepo = new JsonWorkerRepository();
      const incidentRepo = new JsonIncidentRepository();

      const registerUseCase = new RegisterIncidentUseCase(incidentRepo, workerRepo, centerRepo);

      const created = await registerUseCase.execute({
        workCenterId: 'wc_borrull',
        workerId: 'w_elizabeth',
        type: IncidentType.SUBSTITUTION,
        startDate: '2026-10-05',
        endDate: '2026-10-05',
        isRange: false,
        startTime: '13:30',
        endTime: '18:00',
        substitutedWorkerId: 'w_aurora',
        periodMonth: 10,
        periodYear: 2026
      });

      assert.ok(created.id);
      assert.strictEqual(created.totalHours, 4.5);
      assert.strictEqual(created.substitutedWorkerId, 'w_aurora');
      assert.strictEqual(created.observations, '13:30 a 18:00 por Aurora Belmonte');
    });

    it('Should group monthly report items by worker with aggregated metrics', async () => {
      const centerRepo = new JsonWorkCenterRepository();
      const workerRepo = new JsonWorkerRepository();
      const incidentRepo = new JsonIncidentRepository();

      const getReportUseCase = new GetMonthlyReportUseCase(incidentRepo, workerRepo, centerRepo);

      const report = await getReportUseCase.execute({
        month: 10,
        year: 2026,
        workCenterId: 'wc_borrull'
      });

      assert.ok(Array.isArray(report));
      assert.ok(report.length > 0);

      // Find Elizabeth Romero in report
      const elizabethRow = report.find(r => r.worker.id === 'w_elizabeth');
      assert.ok(elizabethRow);
      assert.ok(elizabethRow.totalSubstitutionHours >= 4.5);

      // Find Aurora Beltrán in report
      const auroraRow = report.find(r => r.worker.id === 'w_aurora');
      assert.ok(auroraRow);
      assert.ok(auroraRow.vacationDaysCount >= 3);
    });
  });

  describe('4. Manager Authentication & RBAC (Kickoff Section 2.1 & 3.2)', () => {
    it('Should authenticate manager with valid credentials and reject wrong password', async () => {
      const authRepo = new JsonAuthRepository();
      const authUseCase = new AuthenticateManagerUseCase(authRepo);

      const manager = await authUseCase.execute('gerente', 'admin123');
      assert.ok(manager);
      assert.strictEqual(manager.role, 'MANAGER');
      assert.strictEqual(manager.username, 'gerente');

      // Test Borrull supervisor user
      const supervisor = await authUseCase.execute('Borrull', '2026');
      assert.ok(supervisor);
      assert.strictEqual(supervisor.name, 'Yris Orsinys');
      assert.strictEqual(supervisor.role, 'MANAGER');

      // Test client-side authHash (sha256 of plain:salt)
      const crypto = await import('crypto');
      const salt = 'SIM_SECURE_AUTH_V1_CASTELLO_DE_LA_PLANA_2026';
      const authHashGerente = crypto.createHash('sha256').update(`admin123:${salt}`).digest('hex');
      const managerViaHash = await authUseCase.execute('gerente', authHashGerente);
      assert.ok(managerViaHash);
      assert.strictEqual(managerViaHash.username, 'gerente');

      const authHashBorrull = crypto.createHash('sha256').update(`2026:${salt}`).digest('hex');
      const supervisorViaHash = await authUseCase.execute('Borrull', authHashBorrull);
      assert.ok(supervisorViaHash);
      assert.strictEqual(supervisorViaHash.name, 'Yris Orsinys');

      await assert.rejects(async () => {
        await authUseCase.execute('gerente', 'wrongpassword');
      }, /errInvalidCredentials/);

      await assert.rejects(async () => {
        await authUseCase.execute('Borrull', 'wrongpass');
      }, /errInvalidCredentials/);
    });
  });

  describe('5. Strict i18n & Zero Hardcoded Strings (Kickoff Section 2.3 & 4)', () => {
    it('Should verify 100% key parity across all 5 supported languages (es, ca, en, fr, de)', () => {
      const baseKeys = Object.keys(translations['es']).sort();
      const languages = ['ca', 'en', 'fr', 'de'];

      assert.ok(baseKeys.length >= 40, `Expected at least 40 translation keys, found ${baseKeys.length}`);

      for (const lang of languages) {
        const langKeys = Object.keys(translations[lang]).sort();
        const missingKeys = baseKeys.filter(k => !(k in translations[lang]));
        assert.deepStrictEqual(
          missingKeys,
          [],
          `Language '${lang}' is missing translation keys: ${missingKeys.join(', ')}`
        );
      }
    });
  });

  describe('6. Excel & PDF Export (Kickoff Section 2.2)', () => {
    it('Should generate valid Excel binary buffer', async () => {
      const centerRepo = new JsonWorkCenterRepository();
      const workerRepo = new JsonWorkerRepository();
      const incidentRepo = new JsonIncidentRepository();
      const exportService = new ExportService();

      const getReportUseCase = new GetMonthlyReportUseCase(incidentRepo, workerRepo, centerRepo);
      const exportUseCase = new ExportReportUseCase(getReportUseCase, exportService, centerRepo);

      const buffer = await exportUseCase.exportExcel({
        month: 10,
        year: 2026,
        workCenterId: 'wc_borrull'
      });

      assert.ok(buffer instanceof Uint8Array);
      assert.ok(buffer.byteLength > 100);
    });

    it('Should generate PDF document array buffer', async () => {
      const centerRepo = new JsonWorkCenterRepository();
      const workerRepo = new JsonWorkerRepository();
      const incidentRepo = new JsonIncidentRepository();
      const exportService = new ExportService();

      const getReportUseCase = new GetMonthlyReportUseCase(incidentRepo, workerRepo, centerRepo);
      const exportUseCase = new ExportReportUseCase(getReportUseCase, exportService, centerRepo);

      const pdfData = await exportUseCase.exportPdf({
        month: 10,
        year: 2026,
        workCenterId: 'wc_borrull'
      });

      assert.ok(pdfData);
    });
  });

});
