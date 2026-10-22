import { IWorkCenterRepository } from '../ports/IWorkCenterRepository.js';
import { WorkCenter } from '../domain/entities/WorkCenter.js';

export class ManageWorkCentersUseCase {
  constructor(private workCenterRepo: IWorkCenterRepository) {}

  async getAll(): Promise<WorkCenter[]> {
    return this.workCenterRepo.getAll();
  }

  async getById(id: string): Promise<WorkCenter | null> {
    return this.workCenterRepo.getById(id);
  }

  async create(data: { name: string; code: string; address?: string; city?: string }): Promise<WorkCenter> {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('errWorkCenterNameRequired');
    }
    if (!data.code || data.code.trim().length === 0) {
      throw new Error('errWorkCenterCodeRequired');
    }

    return this.workCenterRepo.create({
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      address: data.address?.trim(),
      city: data.city?.trim(),
      active: true
    });
  }

  async update(id: string, updates: Partial<WorkCenter>): Promise<WorkCenter> {
    const updated = await this.workCenterRepo.update(id, updates);
    if (!updated) {
      throw new Error('errWorkCenterNotFound');
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.workCenterRepo.delete(id);
  }
}
