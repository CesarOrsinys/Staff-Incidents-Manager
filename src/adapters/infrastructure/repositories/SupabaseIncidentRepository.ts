import { IIncidentRepository, IncidentFilter } from '../../../core/ports/IIncidentRepository.js';
import { Incident } from '../../../core/domain/entities/Incident.js';

/**
 * Phase 2 Repository: Supabase / PostgreSQL Adapter
 * Conforms 100% to IIncidentRepository. When environment variables SUPABASE_URL
 * and SUPABASE_ANON_KEY are provided, this adapter seamlessly replaces JsonIncidentRepository
 * via the Dependency Injection container (RepositoryContainer) without ANY changes to use cases or UI.
 */
export class SupabaseIncidentRepository implements IIncidentRepository {
  private client: any;

  constructor(supabaseClient?: any) {
    this.client = supabaseClient || null;
  }

  async getAll(filter?: IncidentFilter): Promise<Incident[]> {
    if (!this.client) {
      console.warn('[SupabaseIncidentRepository] Supabase client not configured. Ready for Phase 2 integration.');
      return [];
    }
    let query = this.client.from('incidents').select('*');
    if (filter?.workCenterId) query = query.eq('work_center_id', filter.workCenterId);
    if (filter?.periodYear) query = query.eq('period_year', filter.periodYear);
    if (filter?.periodMonth) query = query.eq('period_month', filter.periodMonth);
    if (filter?.workerId) query = query.eq('worker_id', filter.workerId);
    if (filter?.type) query = query.eq('type', filter.type);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(this.mapToEntity);
  }

  async getById(id: string): Promise<Incident | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.from('incidents').select('*').eq('id', id).single();
    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async create(incident: Omit<Incident, 'id' | 'createdAt'>): Promise<Incident> {
    if (!this.client) throw new Error('Supabase client not initialized');
    const { data, error } = await this.client.from('incidents').insert([this.mapToDb(incident)]).select().single();
    if (error) throw error;
    return this.mapToEntity(data);
  }

  async update(id: string, updates: Partial<Incident>): Promise<Incident | null> {
    if (!this.client) throw new Error('Supabase client not initialized');
    const { data, error } = await this.client.from('incidents').update(this.mapToDb(updates)).eq('id', id).select().single();
    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<boolean> {
    if (!this.client) throw new Error('Supabase client not initialized');
    const { error } = await this.client.from('incidents').delete().eq('id', id);
    return !error;
  }

  async deleteByWorker(workerId: string): Promise<number> {
    if (!this.client) throw new Error('Supabase client not initialized');
    const { data, error } = await this.client.from('incidents').delete().or(`worker_id.eq.${workerId},substituted_worker_id.eq.${workerId}`).select();
    if (error) return 0;
    return data ? data.length : 0;
  }

  private mapToEntity(row: any): Incident {
    return {
      id: row.id,
      workCenterId: row.work_center_id,
      periodYear: row.period_year,
      periodMonth: row.period_month,
      workerId: row.worker_id,
      type: row.type,
      startDate: row.start_date,
      endDate: row.end_date,
      isRange: row.is_range,
      startTime: row.start_time,
      endTime: row.end_time,
      totalHours: row.total_hours,
      substitutedWorkerId: row.substituted_worker_id,
      observations: row.observations,
      createdAt: row.created_at,
      createdBy: row.created_by
    };
  }

  private mapToDb(entity: any): any {
    const dbObj: any = {};
    if (entity.workCenterId !== undefined) dbObj.work_center_id = entity.workCenterId;
    if (entity.periodYear !== undefined) dbObj.period_year = entity.periodYear;
    if (entity.periodMonth !== undefined) dbObj.period_month = entity.periodMonth;
    if (entity.workerId !== undefined) dbObj.worker_id = entity.workerId;
    if (entity.type !== undefined) dbObj.type = entity.type;
    if (entity.startDate !== undefined) dbObj.start_date = entity.startDate;
    if (entity.endDate !== undefined) dbObj.end_date = entity.endDate;
    if (entity.isRange !== undefined) dbObj.is_range = entity.isRange;
    if (entity.startTime !== undefined) dbObj.start_time = entity.startTime;
    if (entity.endTime !== undefined) dbObj.end_time = entity.endTime;
    if (entity.totalHours !== undefined) dbObj.total_hours = entity.totalHours;
    if (entity.substitutedWorkerId !== undefined) dbObj.substituted_worker_id = entity.substitutedWorkerId;
    if (entity.observations !== undefined) dbObj.observations = entity.observations;
    if (entity.createdBy !== undefined) dbObj.created_by = entity.createdBy;
    return dbObj;
  }
}
