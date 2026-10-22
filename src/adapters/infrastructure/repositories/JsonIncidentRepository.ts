import { IIncidentRepository, IncidentFilter } from '../../../core/ports/IIncidentRepository.js';
import { Incident } from '../../../core/domain/entities/Incident.js';

let inMemoryIncidents: Incident[] = [];
let initialized = false;

export class JsonIncidentRepository implements IIncidentRepository {
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || './mock_data/incidents.json';
  }

  private async load(): Promise<Incident[]> {
    if (initialized && inMemoryIncidents.length > 0) {
      return inMemoryIncidents;
    }

    try {
      if (typeof window === 'undefined') {
        const fs = await import('fs/promises');
        const path = await import('path');
        const resolved = path.resolve(process.cwd(), this.filePath);
        const data = await fs.readFile(resolved, 'utf-8');
        inMemoryIncidents = JSON.parse(data);
      } else {
        const response = await fetch('/api/incidents');
        if (response.ok) {
          inMemoryIncidents = await response.json();
        }
      }
    } catch (err) {
      inMemoryIncidents = [];
    }
    initialized = true;
    return inMemoryIncidents;
  }

  private async persist(): Promise<void> {
    if (typeof window === 'undefined') {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const resolved = path.resolve(process.cwd(), this.filePath);
        await fs.writeFile(resolved, JSON.stringify(inMemoryIncidents, null, 2), 'utf-8');
      } catch (err) {
        console.warn('Could not persist incidents to disk:', err);
      }
    }
  }

  async getAll(filter?: IncidentFilter): Promise<Incident[]> {
    let list = await this.load();
    if (!filter) return [...list];

    return list.filter(inc => {
      if (filter.workCenterId && inc.workCenterId !== filter.workCenterId) return false;
      if (filter.periodYear && inc.periodYear !== filter.periodYear) return false;
      if (filter.periodMonth && inc.periodMonth !== filter.periodMonth) return false;
      if (filter.workerId && inc.workerId !== filter.workerId) return false;
      if (filter.type && inc.type !== filter.type) return false;
      return true;
    });
  }

  async getById(id: string): Promise<Incident | null> {
    const list = await this.load();
    return list.find(inc => inc.id === id) || null;
  }

  async create(incident: Omit<Incident, 'id' | 'createdAt'>): Promise<Incident> {
    await this.load();
    const newIncident: Incident = {
      ...incident,
      id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    inMemoryIncidents.unshift(newIncident);
    await this.persist();
    return newIncident;
  }

  async update(id: string, updates: Partial<Incident>): Promise<Incident | null> {
    await this.load();
    const idx = inMemoryIncidents.findIndex(inc => inc.id === id);
    if (idx === -1) return null;
    inMemoryIncidents[idx] = { ...inMemoryIncidents[idx], ...updates };
    await this.persist();
    return inMemoryIncidents[idx];
  }

  async delete(id: string): Promise<boolean> {
    await this.load();
    const prevLen = inMemoryIncidents.length;
    inMemoryIncidents = inMemoryIncidents.filter(inc => inc.id !== id);
    const deleted = inMemoryIncidents.length < prevLen;
    if (deleted) await this.persist();
    return deleted;
  }

  async deleteByWorker(workerId: string): Promise<number> {
    await this.load();
    const prevLen = inMemoryIncidents.length;
    inMemoryIncidents = inMemoryIncidents.filter(inc => inc.workerId !== workerId && inc.substitutedWorkerId !== workerId);
    const count = prevLen - inMemoryIncidents.length;
    if (count > 0) await this.persist();
    return count;
  }
}
