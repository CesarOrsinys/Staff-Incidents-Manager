import { IExportService, ExportReportOptions } from '../ports/IExportService.js';
import { GetMonthlyReportUseCase, MonthlyReportFilter } from './GetMonthlyReportUseCase.js';
import { IWorkCenterRepository } from '../ports/IWorkCenterRepository.js';

export class ExportReportUseCase {
  constructor(
    private getMonthlyReportUseCase: GetMonthlyReportUseCase,
    private exportService: IExportService,
    private workCenterRepo: IWorkCenterRepository
  ) {}

  async exportExcel(filter: MonthlyReportFilter, options?: Partial<ExportReportOptions>): Promise<Uint8Array> {
    const reportData = await this.getMonthlyReportUseCase.execute(filter);
    let centerName = options?.workCenterName;
    if (!centerName && filter.workCenterId) {
      const center = await this.workCenterRepo.getById(filter.workCenterId);
      centerName = center ? center.name : undefined;
    }

    const fullOptions: ExportReportOptions = {
      month: filter.month,
      year: filter.year,
      workCenterName: centerName || 'Todos los Centros',
      generatedBy: options?.generatedBy || 'Gerencia',
      language: options?.language || 'es'
    };

    return this.exportService.generateExcel(reportData, fullOptions);
  }

  async exportPdf(filter: MonthlyReportFilter, options?: Partial<ExportReportOptions>): Promise<Uint8Array | Blob | string> {
    const reportData = await this.getMonthlyReportUseCase.execute(filter);
    let centerName = options?.workCenterName;
    if (!centerName && filter.workCenterId) {
      const center = await this.workCenterRepo.getById(filter.workCenterId);
      centerName = center ? center.name : undefined;
    }

    const fullOptions: ExportReportOptions = {
      month: filter.month,
      year: filter.year,
      workCenterName: centerName || 'Todos los Centros',
      generatedBy: options?.generatedBy || 'Gerencia',
      language: options?.language || 'es'
    };

    return this.exportService.generatePdfData(reportData, fullOptions);
  }
}
