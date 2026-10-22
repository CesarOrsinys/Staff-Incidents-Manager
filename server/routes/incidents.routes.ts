import { Router, Request, Response } from 'express';
import { RepositoryContainer } from '../../src/adapters/infrastructure/di/RepositoryContainer.js';
import { RegisterIncidentUseCase } from '../../src/core/usecases/RegisterIncidentUseCase.js';

export const incidentsRouter = Router();

incidentsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const incidentRepo = RepositoryContainer.getIncidentRepository();
    const filter: any = {};
    if (req.query.workCenterId) filter.workCenterId = req.query.workCenterId as string;
    if (req.query.periodYear) filter.periodYear = Number(req.query.periodYear);
    if (req.query.periodMonth) filter.periodMonth = Number(req.query.periodMonth);
    if (req.query.workerId) filter.workerId = req.query.workerId as string;
    if (req.query.type) filter.type = req.query.type as string;

    const list = await incidentRepo.getAll(filter);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

incidentsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const incidentRepo = RepositoryContainer.getIncidentRepository();
    const item = await incidentRepo.getById(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'errIncidentNotFound' });
      return;
    }
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

incidentsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const incidentRepo = RepositoryContainer.getIncidentRepository();
    const workerRepo = RepositoryContainer.getWorkerRepository();
    const workCenterRepo = RepositoryContainer.getWorkCenterRepository();
    const useCase = new RegisterIncidentUseCase(incidentRepo, workerRepo, workCenterRepo);

    const created = await useCase.execute(req.body);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

incidentsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const incidentRepo = RepositoryContainer.getIncidentRepository();
    const updated = await incidentRepo.update(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'errIncidentNotFound' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

incidentsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const incidentRepo = RepositoryContainer.getIncidentRepository();
    const deleted = await incidentRepo.delete(req.params.id);
    res.json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
