import { IncidentType } from '../enums/IncidentType.js';

export interface Incident {
  id: string;
  workCenterId: string;
  periodYear: number;
  periodMonth: number; // 1 to 12
  workerId: string;
  type: IncidentType;
  startDate: string; // ISO date 'YYYY-MM-DD'
  endDate: string;   // ISO date 'YYYY-MM-DD'
  isRange: boolean;
  startTime?: string | null; // 'HH:mm' e.g. '13:30'
  endTime?: string | null;   // 'HH:mm' e.g. '18:00'
  totalHours?: number | null; // Computed difference e.g. 4.5
  substitutedWorkerId?: string | null; // Worker ID if type === SUBSTITUTION
  observations?: string | null;
  createdAt: string;
  createdBy?: string;
}
