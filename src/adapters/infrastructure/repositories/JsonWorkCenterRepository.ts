import { IWorkCenterRepository } from '../../../core/ports/IWorkCenterRepository.js';
import { WorkCenter } from '../../../core/domain/entities/WorkCenter.js';

let inMemoryWorkCenters: WorkCenter[] = [];
let initialized = false;

export class JsonWorkCenterRepository implements IWorkCenterRepository {
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || './mock_data/work_centers.json';
  }

  private async load(): Promise<WorkCenter[]> {
    if (initialized && inMemoryWorkCenters.length > 0) {
      return inMemoryWorkCenters;
    }

    try {
      if (typeof window === 'undefined') {
        const fs = await import('fs/promises');
        const path = await import('path');
        const resolved = path.resolve(process.cwd(), this.filePath);
        const data = await fs.readFile(resolved, 'utf-8');
        inMemoryWorkCenters = JSON.parse(data);
      } else {
        // Browser / Client Vite
        const response = await fetch('/api/work-centers');
        if (response.ok) {
          inMemoryWorkCenters = await response.json();
        }
      }
    } catch (err) {
      // Default fallback work centers
      inMemoryWorkCenters = [
        {
          id: 'wc_borrull',
          name: 'Edificio Juez Borrull',
          code: 'BOR-001',
          address: 'Plaza del Juez Borrull, 1, 12003 Castelló',
          city: 'Castellón de la Plana',
          active: true
        },
        {
          id: 'wc_generalitat',
          name: 'Sede Central Generalitat',
          code: 'GEN-002',
          address: 'Calle Caballeros, 2, 46001 Valencia',
          city: 'Valencia',
          active: true
        }
      ];
    }
    initialized = true;
    return inMemoryWorkCenters;
  }

  private async persist(): Promise<void> {
    if (typeof window === 'undefined') {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const resolved = path.resolve(process.cwd(), this.filePath);
        await fs.writeFile(resolved, JSON.stringify(inMemoryWorkCenters, null, 2), 'utf-8');
      } catch (err) {
        console.warn('Could not persist work centers to disk:', err);
      }
    }
  }

  async getAll(): Promise<WorkCenter[]> {
    const list = await this.load();
    return [...list];
  }

  async getById(id: string): Promise<WorkCenter | null> {
    const list = await this.load();
    return list.find(w => w.id === id) || null;
  }

  async create(workCenter: Omit<WorkCenter, 'id'>): Promise<WorkCenter> {
    await this.load();
    const newCenter: WorkCenter = {
      ...workCenter,
      id: `wc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    };
    inMemoryWorkCenters.push(newCenter);
    await this.persist();
    return newCenter;
  }

  async update(id: string, updates: Partial<WorkCenter>): Promise<WorkCenter | null> {
    await this.load();
    const idx = inMemoryWorkCenters.findIndex(w => w.id === id);
    if (idx === -1) return null;
    inMemoryWorkCenters[idx] = { ...inMemoryWorkCenters[idx], ...updates };
    await this.persist();
    return inMemoryWorkCenters[idx];
  }

  async delete(id: string): Promise<boolean> {
    await this.load();
    const prevLen = inMemoryWorkCenters.length;
    inMemoryWorkCenters = inMemoryWorkCenters.filter(w => w.id !== id);
    const deleted = inMemoryWorkCenters.length < prevLen;
    if (deleted) await this.persist();
    return deleted;
  }
}
