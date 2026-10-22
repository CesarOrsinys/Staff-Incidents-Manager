import { Incident } from '../domain/entities/Incident.js';
import { Worker } from '../domain/entities/Worker.js';
import { WorkCenter } from '../domain/entities/WorkCenter.js';

export interface MonthlyWorkerReportItem {
  worker: Worker;
  workCenter?: WorkCenter;
  incidents: Incident[];
  totalOvertimeHours: number;
  totalSubstitutionHours: number;
  vacationDaysCount: number;
  personalMattersDaysCount: number;
  leaveDaysCount: number;
}

export interface ExportReportOptions {
  month: number;
  year: number;
  workCenterName?: string;
  generatedBy?: string;
  language?: string;
}

export interface IExportService {
  generateExcel(data: MonthlyWorkerReportItem[], options: ExportReportOptions): Uint8Array;
  generatePdfData(data: MonthlyWorkerReportItem[], options: ExportReportOptions): Promise<Uint8Array | Blob | string>;
}
