import { IIncidentRepository } from '../ports/IIncidentRepository.js';
import { IWorkerRepository } from '../ports/IWorkerRepository.js';
import { IWorkCenterRepository } from '../ports/IWorkCenterRepository.js';
import { MonthlyWorkerReportItem } from '../ports/IExportService.js';
import { IncidentType } from '../domain/enums/IncidentType.js';

export interface MonthlyReportFilter {
  month: number;
  year: number;
  workCenterId?: string;
  workerId?: string;
}

export class GetMonthlyReportUseCase {
  constructor(
    private incidentRepo: IIncidentRepository,
    private workerRepo: IWorkerRepository,
    private workCenterRepo: IWorkCenterRepository
  ) {}

  async execute(filter: MonthlyReportFilter): Promise<MonthlyWorkerReportItem[]> {
    const allWorkers = await this.workerRepo.getAll();
    const allCenters = await this.workCenterRepo.getAll();
    const incidents = await this.incidentRepo.getAll({
      periodYear: filter.year,
      periodMonth: filter.month,
      workCenterId: filter.workCenterId,
      workerId: filter.workerId
    });

    // Group incidents by workerId
    const mapByWorker = new Map<string, typeof incidents>();
    for (const inc of incidents) {
      if (!mapByWorker.has(inc.workerId)) {
        mapByWorker.set(inc.workerId, []);
      }
      mapByWorker.get(inc.workerId)!.push(inc);
    }

    // Determine target workers
    let targetWorkers = allWorkers.filter(w => w.active);
    if (filter.workCenterId) {
      targetWorkers = targetWorkers.filter(w => w.assignedWorkCenterId === filter.workCenterId || mapByWorker.has(w.id));
    }
    if (filter.workerId) {
      targetWorkers = targetWorkers.filter(w => w.id === filter.workerId);
    }

    const reportItems: MonthlyWorkerReportItem[] = [];

    for (const worker of targetWorkers) {
      const workerIncidents = mapByWorker.get(worker.id) || [];
      const center = allCenters.find(c => c.id === worker.assignedWorkCenterId);

      let totalOvertimeHours = 0;
      let totalSubstitutionHours = 0;
      let vacationDaysCount = 0;
      let personalMattersDaysCount = 0;
      let leaveDaysCount = 0;

      for (const inc of workerIncidents) {
        if (inc.type === IncidentType.OVERTIME) {
          totalOvertimeHours += inc.totalHours || 0;
        } else if (inc.type === IncidentType.SUBSTITUTION) {
          totalSubstitutionHours += inc.totalHours || 0;
        } else if (inc.type === IncidentType.VACATION) {
          vacationDaysCount += this.calculateDays(inc.startDate, inc.endDate);
        } else if (inc.type === IncidentType.PERSONAL_MATTERS) {
          personalMattersDaysCount += this.calculateDays(inc.startDate, inc.endDate);
        } else if (inc.type === IncidentType.LEAVE_OR_DEATH) {
          leaveDaysCount += this.calculateDays(inc.startDate, inc.endDate);
        }
      }

      reportItems.push({
        worker,
        workCenter: center,
        incidents: workerIncidents.sort((a, b) => a.startDate.localeCompare(b.startDate)),
        totalOvertimeHours: Number(totalOvertimeHours.toFixed(2)),
        totalSubstitutionHours: Number(totalSubstitutionHours.toFixed(2)),
        vacationDaysCount,
        personalMattersDaysCount,
        leaveDaysCount
      });
    }

    // Sort report by worker name
    return reportItems.sort((a, b) => a.worker.name.localeCompare(b.worker.name));
  }

  private calculateDays(start: string, end: string): number {
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }
}
