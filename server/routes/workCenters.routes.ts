import { Router, Request, Response } from 'express';
import { RepositoryContainer } from '../../src/adapters/infrastructure/di/RepositoryContainer.js';
import { ManageWorkCentersUseCase } from '../../src/core/usecases/ManageWorkCentersUseCase.js';

export const workCentersRouter = Router();

workCentersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const repo = RepositoryContainer.getWorkCenterRepository();
    const useCase = new ManageWorkCentersUseCase(repo);
    const list = await useCase.getAll();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

workCentersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const repo = RepositoryContainer.getWorkCenterRepository();
    const useCase = new ManageWorkCentersUseCase(repo);
    const item = await useCase.getById(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'errWorkCenterNotFound' });
      return;
    }
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

workCentersRouter.post('/', async (req: Request, res: Response) => {
  try {
    const repo = RepositoryContainer.getWorkCenterRepository();
    const useCase = new ManageWorkCentersUseCase(repo);
    const created = await useCase.create(req.body);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

workCentersRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const repo = RepositoryContainer.getWorkCenterRepository();
    const useCase = new ManageWorkCentersUseCase(repo);
    const updated = await useCase.update(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

workCentersRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const repo = RepositoryContainer.getWorkCenterRepository();
    const useCase = new ManageWorkCentersUseCase(repo);
    const deleted = await useCase.delete(req.params.id);
    res.json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
