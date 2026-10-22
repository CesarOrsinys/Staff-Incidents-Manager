import { IIncidentRepository } from '../ports/IIncidentRepository.js';
import { IWorkerRepository } from '../ports/IWorkerRepository.js';
import { IWorkCenterRepository } from '../ports/IWorkCenterRepository.js';
import { Incident } from '../domain/entities/Incident.js';
import { IncidentType } from '../domain/enums/IncidentType.js';
import { IncidentInputSchema, IncidentInput, calculateHours } from '../domain/schemas/IncidentSchema.js';

export class RegisterIncidentUseCase {
  constructor(
    private incidentRepo: IIncidentRepository,
    private workerRepo: IWorkerRepository,
    private workCenterRepo: IWorkCenterRepository
  ) {}

  async execute(input: IncidentInput): Promise<Incident> {
    // 1. Zod Schema Validation
    const validationResult = IncidentInputSchema.safeParse(input);
    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      throw new Error(firstIssue.message || 'errValidationFailed');
    }
    const validData = validationResult.data;

    // 2. Validate Work Center exists
    const workCenter = await this.workCenterRepo.getById(validData.workCenterId);
    if (!workCenter) {
      throw new Error('errWorkCenterNotFound');
    }

    // 3. Validate Worker exists and is active
    const worker = await this.workerRepo.getById(validData.workerId);
    if (!worker) {
      throw new Error('errWorkerNotFound');
    }
    if (!worker.active) {
      throw new Error('errWorkerInactive');
    }

    // 4. Validate Substituted Worker exists if type is SUBSTITUTION
    let substituted: any = null;
    if (validData.type === IncidentType.SUBSTITUTION) {
      if (!validData.substitutedWorkerId) {
        throw new Error('errSubstitutedWorkerRequired');
      }
      substituted = await this.workerRepo.getById(validData.substitutedWorkerId);
      if (!substituted) {
        throw new Error('errSubstitutedWorkerNotFound');
      }
    }

    // 5. Calculate Total Hours if startTime and endTime are provided
    let totalHours: number | null = null;
    if (validData.startTime && validData.endTime) {
      totalHours = calculateHours(validData.startTime, validData.endTime);
    }

    // 6. Ensure consistent periodMonth and periodYear from startDate
    const parsedStart = new Date(validData.startDate);
    const periodYear = validData.periodYear || parsedStart.getFullYear();
    const periodMonth = validData.periodMonth || (parsedStart.getMonth() + 1);

    // 7. Determine observations (standard format default if empty)
    let observations = validData.observations?.trim() || null;
    if (!observations && validData.type === IncidentType.SUBSTITUTION && validData.startTime && validData.endTime && substituted) {
      observations = `${validData.startTime} a ${validData.endTime} por ${substituted.name}`;
    }

    // 8. Persist incident
    const created = await this.incidentRepo.create({
      workCenterId: validData.workCenterId,
      periodYear,
      periodMonth,
      workerId: validData.workerId,
      type: validData.type,
      startDate: validData.startDate,
      endDate: validData.endDate,
      isRange: validData.isRange,
      startTime: validData.startTime || null,
      endTime: validData.endTime || null,
      totalHours,
      substitutedWorkerId: validData.type === IncidentType.SUBSTITUTION ? validData.substitutedWorkerId : null,
      observations,
      createdBy: validData.createdBy || 'Gerente'
    });

    return created;
  }
}
