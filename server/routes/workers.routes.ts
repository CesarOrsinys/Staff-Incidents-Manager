import { Router, Request, Response } from 'express';
import { RepositoryContainer } from '../../src/adapters/infrastructure/di/RepositoryContainer.js';
import { ManageWorkersUseCase } from '../../src/core/usecases/ManageWorkersUseCase.js';

export const workersRouter = Router();

workersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const workerRepo = RepositoryContainer.getWorkerRepository();
    const useCase = new ManageWorkersUseCase(workerRepo);

    if (req.query.workCenterId) {
      const list = await useCase.getByWorkCenter(req.query.workCenterId as string);
      res.json(list);
      return;
    }

    const list = await useCase.getAll();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

workersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const workerRepo = RepositoryContainer.getWorkerRepository();
    const useCase = new ManageWorkersUseCase(workerRepo);
    const item = await useCase.getById(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'errWorkerNotFound' });
      return;
    }
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

workersRouter.post('/', async (req: Request, res: Response) => {
  try {
    const workerRepo = RepositoryContainer.getWorkerRepository();
    const useCase = new ManageWorkersUseCase(workerRepo);
    const created = await useCase.create(req.body);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

workersRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const workerRepo = RepositoryContainer.getWorkerRepository();
    const useCase = new ManageWorkersUseCase(workerRepo);
    const updated = await useCase.update(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

workersRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const workerRepo = RepositoryContainer.getWorkerRepository();
    const incidentRepo = RepositoryContainer.getIncidentRepository();
    const useCase = new ManageWorkersUseCase(workerRepo, incidentRepo);
    const deleted = await useCase.delete(req.params.id);
    res.json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
