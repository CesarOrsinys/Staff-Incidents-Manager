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
  filterType?: 'all' | 'owed' | 'overtime';
  onlyWithIncidents?: boolean;
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

    const workerMap = new Map<string, typeof allWorkers[0]>();
    for (const w of allWorkers) {
      workerMap.set(w.id, w);
    }

    // Group incidents by workerId and also index substitutions by substitutedWorkerId
    const mapByWorker = new Map<string, typeof incidents>();
    const mapSubstitutedFor = new Map<string, typeof incidents>();

    for (const inc of incidents) {
      if (!mapByWorker.has(inc.workerId)) {
        mapByWorker.set(inc.workerId, []);
      }
      mapByWorker.get(inc.workerId)!.push(inc);

      if (inc.type === IncidentType.SUBSTITUTION && inc.substitutedWorkerId) {
        if (!mapSubstitutedFor.has(inc.substitutedWorkerId)) {
          mapSubstitutedFor.set(inc.substitutedWorkerId, []);
        }
        mapSubstitutedFor.get(inc.substitutedWorkerId)!.push(inc);
      }
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
      const substitutedIncidents = mapSubstitutedFor.get(worker.id) || [];
      const center = allCenters.find(c => c.id === worker.assignedWorkCenterId);

      let totalOvertimeHours = 0;
      let totalSubstitutionHours = 0;
      let owedHours = 0;
      let vacationDaysCount = 0;
      let personalMattersDaysCount = 0;
      let leaveDaysCount = 0;

      const absentDates: { date: string; reason: string; substitutedBy?: string }[] = [];
      const overtimeDetails: { date: string; hours: number; forWorker?: string }[] = [];

      // Process worker's own incidents
      for (const inc of workerIncidents) {
        if (inc.type === IncidentType.OVERTIME) {
          totalOvertimeHours += inc.totalHours || 0;
          overtimeDetails.push({
            date: inc.startDate,
            hours: inc.totalHours || 0
          });
        } else if (inc.type === IncidentType.SUBSTITUTION) {
          totalSubstitutionHours += inc.totalHours || 0;
          const subbedWorker = inc.substitutedWorkerId ? workerMap.get(inc.substitutedWorkerId) : null;
          if (!inc.observations && inc.startTime && inc.endTime) {
            inc.observations = `${inc.startTime} a ${inc.endTime} por ${subbedWorker ? subbedWorker.name : 'compañero/a'}`;
          }
          overtimeDetails.push({
            date: inc.startDate,
            hours: inc.totalHours || 0,
            forWorker: subbedWorker ? subbedWorker.name : undefined
          });
        } else if (inc.type === IncidentType.VACATION) {
          vacationDaysCount += this.calculateDays(inc.startDate, inc.endDate);
          absentDates.push({
            date: inc.startDate === inc.endDate ? inc.startDate : `${inc.startDate} al ${inc.endDate}`,
            reason: inc.observations || 'Vacaciones'
          });
        } else if (inc.type === IncidentType.PERSONAL_MATTERS) {
          personalMattersDaysCount += this.calculateDays(inc.startDate, inc.endDate);
          absentDates.push({
            date: inc.startDate === inc.endDate ? inc.startDate : `${inc.startDate} al ${inc.endDate}`,
            reason: inc.observations || 'Asuntos propios'
          });
        } else if (inc.type === IncidentType.LEAVE_OR_DEATH) {
          leaveDaysCount += this.calculateDays(inc.startDate, inc.endDate);
          absentDates.push({
            date: inc.startDate === inc.endDate ? inc.startDate : `${inc.startDate} al ${inc.endDate}`,
            reason: inc.observations || 'Fallecimiento / Baja médica'
          });
        } else if (inc.type === IncidentType.CONTRACT_END) {
          absentDates.push({
            date: inc.startDate,
            reason: inc.observations || 'Fin de contrato'
          });
        }
      }

      // Process incidents where this worker was substituted (meaning they missed work and owe hours)
      for (const subInc of substitutedIncidents) {
        owedHours += subInc.totalHours || 0;
        const substituteWorker = workerMap.get(subInc.workerId);
        absentDates.push({
          date: subInc.startDate,
          reason: `Suplido (${subInc.startTime || ''}-${subInc.endTime || ''})`,
          substitutedBy: substituteWorker ? substituteWorker.name : undefined
        });
      }

      const netHours = Number(((totalSubstitutionHours + totalOvertimeHours) - owedHours).toFixed(2));

      reportItems.push({
        worker,
        workCenter: center,
        incidents: workerIncidents.sort((a, b) => a.startDate.localeCompare(b.startDate)),
        totalOvertimeHours: Number(totalOvertimeHours.toFixed(2)),
        totalSubstitutionHours: Number(totalSubstitutionHours.toFixed(2)),
        owedHours: Number(owedHours.toFixed(2)),
        netHours,
        vacationDaysCount,
        personalMattersDaysCount,
        leaveDaysCount,
        absentDates,
        overtimeDetails
      });
    }

    // Sort report by worker name
    let finalItems = reportItems.sort((a, b) => a.worker.name.localeCompare(b.worker.name));

    if (filter.onlyWithIncidents) {
      finalItems = finalItems.filter(item => 
        (item.incidents && item.incidents.length > 0) ||
        (item.absentDates && item.absentDates.length > 0)
      );
    }

    if (filter.filterType === 'owed') {
      finalItems = finalItems.filter(item => 
        (item.owedHours && item.owedHours > 0) || 
        (item.absentDates && item.absentDates.length > 0) ||
        item.vacationDaysCount > 0 ||
        item.personalMattersDaysCount > 0 ||
        item.leaveDaysCount > 0
      );
    } else if (filter.filterType === 'overtime') {
      finalItems = finalItems.filter(item => 
        ((item.totalSubstitutionHours || 0) + (item.totalOvertimeHours || 0)) > 0
      );
    }

    return finalItems;
  }

  private calculateDays(start: string, end: string): number {
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }
}
