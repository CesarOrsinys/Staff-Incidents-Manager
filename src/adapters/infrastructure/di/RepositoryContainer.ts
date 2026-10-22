import { IWorkCenterRepository } from '../../../core/ports/IWorkCenterRepository.js';
import { IWorkerRepository } from '../../../core/ports/IWorkerRepository.js';
import { IIncidentRepository } from '../../../core/ports/IIncidentRepository.js';
import { IAuthRepository } from '../../../core/ports/IAuthRepository.js';
import { IExportService } from '../../../core/ports/IExportService.js';

import { JsonWorkCenterRepository } from '../repositories/JsonWorkCenterRepository.js';
import { JsonWorkerRepository } from '../repositories/JsonWorkerRepository.js';
import { JsonIncidentRepository } from '../repositories/JsonIncidentRepository.js';
import { JsonAuthRepository } from '../repositories/JsonAuthRepository.js';
import { ExportService } from '../services/ExportService.js';

import { SupabaseIncidentRepository } from '../repositories/SupabaseIncidentRepository.js';
import { SupabaseWorkCenterRepository } from '../repositories/SupabaseWorkCenterRepository.js';
import { SupabaseWorkerRepository } from '../repositories/SupabaseWorkerRepository.js';
import { SupabaseAuthRepository } from '../repositories/SupabaseAuthRepository.js';
import { getSupabaseClient } from '../services/SupabaseClient.js';

export class RepositoryContainer {
  private static workCenterRepo: IWorkCenterRepository | null = null;
  private static workerRepo: IWorkerRepository | null = null;
  private static incidentRepo: IIncidentRepository | null = null;
  private static authRepo: IAuthRepository | null = null;
  private static exportService: IExportService | null = null;

  public static getWorkCenterRepository(): IWorkCenterRepository {
    if (!this.workCenterRepo) {
      this.workCenterRepo = new JsonWorkCenterRepository();
    }
    return this.workCenterRepo;
  }

  public static getWorkerRepository(): IWorkerRepository {
    if (!this.workerRepo) {
      this.workerRepo = new JsonWorkerRepository();
    }
    return this.workerRepo;
  }

  public static getIncidentRepository(): IIncidentRepository {
    if (!this.incidentRepo) {
      this.incidentRepo = new JsonIncidentRepository();
    }
    return this.incidentRepo;
  }

  public static getAuthRepository(): IAuthRepository {
    if (!this.authRepo) {
      this.authRepo = new JsonAuthRepository();
    }
    return this.authRepo;
  }

  public static getExportService(): IExportService {
    if (!this.exportService) {
      this.exportService = new ExportService();
    }
    return this.exportService;
  }

  /**
   * Activates Supabase repositories when environment variables are supplied.
   */
  public static useSupabaseRepositories(): boolean {
    const client = getSupabaseClient();
    if (!client) {
      console.warn('[RepositoryContainer] Supabase client unavailable. Retaining JSON mock repositories.');
      return false;
    }
    this.incidentRepo = new SupabaseIncidentRepository(client);
    this.workCenterRepo = new SupabaseWorkCenterRepository(client);
    this.workerRepo = new SupabaseWorkerRepository(client);
    this.authRepo = new SupabaseAuthRepository(client);
    console.log('[RepositoryContainer] Successfully wired Supabase repositories.');
    return true;
  }

  /**
   * Allows injecting custom or mock implementations for testing or Phase 2 database switching.
   */
  public static setRepositories(overrides: {
    workCenterRepo?: IWorkCenterRepository;
    workerRepo?: IWorkerRepository;
    incidentRepo?: IIncidentRepository;
    authRepo?: IAuthRepository;
    exportService?: IExportService;
  }): void {
    if (overrides.workCenterRepo) this.workCenterRepo = overrides.workCenterRepo;
    if (overrides.workerRepo) this.workerRepo = overrides.workerRepo;
    if (overrides.incidentRepo) this.incidentRepo = overrides.incidentRepo;
    if (overrides.authRepo) this.authRepo = overrides.authRepo;
    if (overrides.exportService) this.exportService = overrides.exportService;
  }

  public static reset(): void {
    this.workCenterRepo = null;
    this.workerRepo = null;
    this.incidentRepo = null;
    this.authRepo = null;
    this.exportService = null;
  }
}
