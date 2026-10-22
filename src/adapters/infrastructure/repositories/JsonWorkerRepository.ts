import { IWorkerRepository } from '../../../core/ports/IWorkerRepository.js';
import { Worker } from '../../../core/domain/entities/Worker.js';

let inMemoryWorkers: Worker[] = [];
let initialized = false;

export class JsonWorkerRepository implements IWorkerRepository {
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || './mock_data/workers.json';
  }

  private async load(): Promise<Worker[]> {
    if (initialized && inMemoryWorkers.length > 0) {
      return inMemoryWorkers;
    }

    try {
      if (typeof window === 'undefined') {
        const fs = await import('fs/promises');
        const path = await import('path');
        const resolved = path.resolve(process.cwd(), this.filePath);
        const data = await fs.readFile(resolved, 'utf-8');
        inMemoryWorkers = JSON.parse(data);
      } else {
        const response = await fetch('/api/workers');
        if (response.ok) {
          inMemoryWorkers = await response.json();
        }
      }
    } catch (err) {
      inMemoryWorkers = [
        {
          id: 'w_aurora',
          name: 'Aurora Beltrán',
          documentId: '48123456A',
          contractStatus: 'INDEFINIDO',
          assignedWorkCenterId: 'wc_borrull',
          active: true
        },
        {
          id: 'w_elizabeth',
          name: 'Elizabeth Romero',
          documentId: '51234567B',
          contractStatus: 'INDEFINIDO',
          assignedWorkCenterId: 'wc_borrull',
          active: true
        }
      ];
    }
    initialized = true;
    return inMemoryWorkers;
  }

  private async persist(): Promise<void> {
    if (typeof window === 'undefined') {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const resolved = path.resolve(process.cwd(), this.filePath);
        await fs.writeFile(resolved, JSON.stringify(inMemoryWorkers, null, 2), 'utf-8');
      } catch (err) {
        console.warn('Could not persist workers to disk:', err);
      }
    }
  }

  async getAll(): Promise<Worker[]> {
    const list = await this.load();
    return [...list];
  }

  async getById(id: string): Promise<Worker | null> {
    const list = await this.load();
    return list.find(w => w.id === id) || null;
  }

  async getByWorkCenter(workCenterId: string): Promise<Worker[]> {
    const list = await this.load();
    return list.filter(w => w.assignedWorkCenterId === workCenterId && w.active);
  }

  async create(worker: Omit<Worker, 'id'>): Promise<Worker> {
    await this.load();
    const newWorker: Worker = {
      ...worker,
      id: `w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    };
    inMemoryWorkers.push(newWorker);
    await this.persist();
    return newWorker;
  }

  async update(id: string, updates: Partial<Worker>): Promise<Worker | null> {
    await this.load();
    const idx = inMemoryWorkers.findIndex(w => w.id === id);
    if (idx === -1) return null;
    inMemoryWorkers[idx] = { ...inMemoryWorkers[idx], ...updates };
    await this.persist();
    return inMemoryWorkers[idx];
  }

  async delete(id: string): Promise<boolean> {
    await this.load();
    const prevLen = inMemoryWorkers.length;
    inMemoryWorkers = inMemoryWorkers.filter(w => w.id !== id);
    const deleted = inMemoryWorkers.length < prevLen;
    if (deleted) await this.persist();
    return deleted;
  }
}
