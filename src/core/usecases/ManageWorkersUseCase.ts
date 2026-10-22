import { IWorkerRepository } from '../ports/IWorkerRepository.js';
import { IIncidentRepository } from '../ports/IIncidentRepository.js';
import { Worker } from '../domain/entities/Worker.js';

export class ManageWorkersUseCase {
  constructor(
    private workerRepo: IWorkerRepository,
    private incidentRepo?: IIncidentRepository
  ) {}

  async getAll(): Promise<Worker[]> {
    return this.workerRepo.getAll();
  }

  async getById(id: string): Promise<Worker | null> {
    return this.workerRepo.getById(id);
  }

  async getByWorkCenter(workCenterId: string): Promise<Worker[]> {
    return this.workerRepo.getByWorkCenter(workCenterId);
  }

  async create(data: {
    name: string;
    documentId?: string;
    email?: string;
    phone?: string;
    contractStatus: string;
    assignedWorkCenterId?: string;
  }): Promise<Worker> {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('errWorkerNameRequired');
    }

    return this.workerRepo.create({
      name: data.name.trim(),
      documentId: data.documentId?.trim().toUpperCase(),
      email: data.email?.trim().toLowerCase(),
      phone: data.phone?.trim(),
      contractStatus: data.contractStatus || 'INDEFINIDO',
      assignedWorkCenterId: data.assignedWorkCenterId,
      active: true
    });
  }

  async update(id: string, updates: Partial<Worker>): Promise<Worker> {
    const updated = await this.workerRepo.update(id, updates);
    if (!updated) {
      throw new Error('errWorkerNotFound');
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    if (this.incidentRepo) {
      await this.incidentRepo.deleteByWorker(id);
    }
    return this.workerRepo.delete(id);
  }
}
