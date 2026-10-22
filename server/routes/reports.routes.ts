import { Router, Request, Response } from 'express';
import { RepositoryContainer } from '../../src/adapters/infrastructure/di/RepositoryContainer.js';
import { GetMonthlyReportUseCase } from '../../src/core/usecases/GetMonthlyReportUseCase.js';
import { ExportReportUseCase } from '../../src/core/usecases/ExportReportUseCase.js';

export const reportsRouter = Router();

function getReportUseCases() {
  const incidentRepo = RepositoryContainer.getIncidentRepository();
  const workerRepo = RepositoryContainer.getWorkerRepository();
  const workCenterRepo = RepositoryContainer.getWorkCenterRepository();
  const exportService = RepositoryContainer.getExportService();

  const getReportUseCase = new GetMonthlyReportUseCase(incidentRepo, workerRepo, workCenterRepo);
  const exportReportUseCase = new ExportReportUseCase(getReportUseCase, exportService, workCenterRepo);

  return { getReportUseCase, exportReportUseCase };
}

reportsRouter.get('/monthly', async (req: Request, res: Response) => {
  try {
    const { getReportUseCase } = getReportUseCases();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);
    const year = Number(req.query.year) || new Date().getFullYear();
    const workCenterId = req.query.workCenterId as string | undefined;
    const workerId = req.query.workerId as string | undefined;

    const data = await getReportUseCase.execute({
      month,
      year,
      workCenterId,
      workerId
    });

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

reportsRouter.get('/export/excel', async (req: Request, res: Response) => {
  try {
    const { exportReportUseCase } = getReportUseCases();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);
    const year = Number(req.query.year) || new Date().getFullYear();
    const workCenterId = req.query.workCenterId as string | undefined;

    const buffer = await exportReportUseCase.exportExcel({
      month,
      year,
      workCenterId
    });

    const filename = `Parte_Incidencias_${year}_${String(month).padStart(2, '0')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

reportsRouter.get('/export/pdf', async (req: Request, res: Response) => {
  try {
    const { exportReportUseCase } = getReportUseCases();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);
    const year = Number(req.query.year) || new Date().getFullYear();
    const workCenterId = req.query.workCenterId as string | undefined;

    const pdfData = await exportReportUseCase.exportPdf({
      month,
      year,
      workCenterId
    });

    const filename = `Parte_Incidencias_${year}_${String(month).padStart(2, '0')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(pdfData as unknown as Uint8Array));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
