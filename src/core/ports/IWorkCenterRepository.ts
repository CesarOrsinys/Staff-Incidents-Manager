import { WorkCenter } from '../domain/entities/WorkCenter.js';

export interface IWorkCenterRepository {
  getAll(): Promise<WorkCenter[]>;
  getById(id: string): Promise<WorkCenter | null>;
  create(workCenter: Omit<WorkCenter, 'id'>): Promise<WorkCenter>;
  update(id: string, updates: Partial<WorkCenter>): Promise<WorkCenter | null>;
  delete(id: string): Promise<boolean>;
}
