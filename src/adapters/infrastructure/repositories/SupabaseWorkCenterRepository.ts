import { IWorkCenterRepository } from '../../../core/ports/IWorkCenterRepository.js';
import { WorkCenter } from '../../../core/domain/entities/WorkCenter.js';
import { getSupabaseClient } from '../services/SupabaseClient.js';

export class SupabaseWorkCenterRepository implements IWorkCenterRepository {
  private client: any;

  constructor(supabaseClient?: any) {
    this.client = supabaseClient || getSupabaseClient();
  }

  async getAll(): Promise<WorkCenter[]> {
    if (!this.client) return [];
    const { data, error } = await this.client.from('work_centers').select('*').order('name');
    if (error) {
      console.warn('[SupabaseWorkCenterRepository] getAll error:', error.message);
      return [];
    }
    return (data || []).map(this.mapToEntity);
  }

  async getById(id: string): Promise<WorkCenter | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.from('work_centers').select('*').eq('id', id).single();
    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async create(workCenter: Omit<WorkCenter, 'id'>): Promise<WorkCenter> {
    if (!this.client) throw new Error('Supabase client not initialized');
    const dbPayload = {
      name: workCenter.name,
      code: workCenter.code,
      address: workCenter.address || 'Castelló',
      city: workCenter.city || 'Castelló de la Plana',
      active: workCenter.active ?? true
    };
    const { data, error } = await this.client.from('work_centers').insert([dbPayload]).select().single();
    if (error) throw error;
    return this.mapToEntity(data);
  }

  async update(id: string, updates: Partial<WorkCenter>): Promise<WorkCenter | null> {
    if (!this.client) throw new Error('Supabase client not initialized');
    const dbPayload: any = {};
    if (updates.name !== undefined) dbPayload.name = updates.name;
    if (updates.code !== undefined) dbPayload.code = updates.code;
    if (updates.address !== undefined) dbPayload.address = updates.address;
    if (updates.city !== undefined) dbPayload.city = updates.city;
    if (updates.active !== undefined) dbPayload.active = updates.active;

    const { data, error } = await this.client.from('work_centers').update(dbPayload).eq('id', id).select().single();
    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<boolean> {
    if (!this.client) throw new Error('Supabase client not initialized');
    const { error } = await this.client.from('work_centers').delete().eq('id', id);
    return !error;
  }

  private mapToEntity(row: any): WorkCenter {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      address: row.address,
      city: row.city,
      active: row.active ?? true
    };
  }
}
