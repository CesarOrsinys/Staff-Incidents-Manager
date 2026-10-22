import { Worker } from '../domain/entities/Worker.js';

export interface IWorkerRepository {
  getAll(): Promise<Worker[]>;
  getById(id: string): Promise<Worker | null>;
  getByWorkCenter(workCenterId: string): Promise<Worker[]>;
  create(worker: Omit<Worker, 'id'>): Promise<Worker>;
  update(id: string, updates: Partial<Worker>): Promise<Worker | null>;
  delete(id: string): Promise<boolean>;
}
