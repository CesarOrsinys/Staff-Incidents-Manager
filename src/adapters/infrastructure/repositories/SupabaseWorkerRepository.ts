import { IWorkerRepository } from '../../../core/ports/IWorkerRepository.js';
import { Worker } from '../../../core/domain/entities/Worker.js';
import { getSupabaseClient } from '../services/SupabaseClient.js';

export class SupabaseWorkerRepository implements IWorkerRepository {
  private client: any;

  constructor(supabaseClient?: any) {
    this.client = supabaseClient || getSupabaseClient();
  }

  async getAll(): Promise<Worker[]> {
    if (!this.client) return [];
    const { data, error } = await this.client.from('workers').select('*').order('full_name');
    if (error) {
      console.warn('[SupabaseWorkerRepository] getAll error:', error.message);
      return [];
    }
    return (data || []).map(this.mapToEntity);
  }

  async getById(id: string): Promise<Worker | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.from('workers').select('*').eq('id', id).single();
    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async getByWorkCenter(workCenterId: string): Promise<Worker[]> {
    if (!this.client) return [];
    const { data, error } = await this.client.from('workers').select('*').eq('work_center_id', workCenterId).eq('active', true);
    if (error) {
      console.warn('[SupabaseWorkerRepository] getByWorkCenter error:', error.message);
      return [];
    }
    return (data || []).map(this.mapToEntity);
  }

  async create(worker: Omit<Worker, 'id'>): Promise<Worker> {
    if (!this.client) throw new Error('Supabase client not initialized');
    const names = (worker.name || '').trim().split(' ');
    const firstName = names[0] || 'Nombre';
    const lastName = names.slice(1).join(' ') || 'Apellidos';

    const dbPayload = {
      dni: worker.documentId || `DNI_${Date.now()}`,
      first_name: firstName,
      last_name: lastName,
      work_center_id: worker.assignedWorkCenterId || null,
      contract_type: worker.contractStatus || 'INDEFINIDO',
      email: worker.email || null,
      phone: worker.phone || null,
      active: worker.active ?? true
    };

    const { data, error } = await this.client.from('workers').insert([dbPayload]).select().single();
    if (error) throw error;
    return this.mapToEntity(data);
  }

  async update(id: string, updates: Partial<Worker>): Promise<Worker | null> {
    if (!this.client) throw new Error('Supabase client not initialized');
    const dbPayload: any = {};
    if (updates.name !== undefined) {
      const names = updates.name.trim().split(' ');
      dbPayload.first_name = names[0];
      dbPayload.last_name = names.slice(1).join(' ') || '';
    }
    if (updates.documentId !== undefined) dbPayload.dni = updates.documentId;
    if (updates.assignedWorkCenterId !== undefined) dbPayload.work_center_id = updates.assignedWorkCenterId;
    if (updates.contractStatus !== undefined) dbPayload.contract_type = updates.contractStatus;
    if (updates.email !== undefined) dbPayload.email = updates.email;
    if (updates.phone !== undefined) dbPayload.phone = updates.phone;
    if (updates.active !== undefined) dbPayload.active = updates.active;

    const { data, error } = await this.client.from('workers').update(dbPayload).eq('id', id).select().single();
    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<boolean> {
    if (!this.client) throw new Error('Supabase client not initialized');
    const { error } = await this.client.from('workers').delete().eq('id', id);
    return !error;
  }

  private mapToEntity(row: any): Worker {
    return {
      id: row.id,
      name: row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      email: row.email,
      phone: row.phone,
      contractStatus: row.contract_type || 'INDEFINIDO',
      assignedWorkCenterId: row.work_center_id,
      active: row.active ?? true
    };
  }
}
