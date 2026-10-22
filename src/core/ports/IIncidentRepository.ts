import { Incident } from '../domain/entities/Incident.js';

export interface IncidentFilter {
  workCenterId?: string;
  periodYear?: number;
  periodMonth?: number;
  workerId?: string;
  type?: string;
}

export interface IIncidentRepository {
  getAll(filter?: IncidentFilter): Promise<Incident[]>;
  getById(id: string): Promise<Incident | null>;
  create(incident: Omit<Incident, 'id' | 'createdAt'>): Promise<Incident>;
  update(id: string, updates: Partial<Incident>): Promise<Incident | null>;
  delete(id: string): Promise<boolean>;
  deleteByWorker(workerId: string): Promise<number>;
}
