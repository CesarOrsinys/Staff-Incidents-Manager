import { WorkCenter } from '../../core/domain/entities/WorkCenter.js';
import { Worker } from '../../core/domain/entities/Worker.js';
import { Incident } from '../../core/domain/entities/Incident.js';
import { ManagerUser } from '../../core/domain/entities/ManagerUser.js';
import { MonthlyWorkerReportItem } from '../../core/ports/IExportService.js';

export interface AppStateType {
  currentUser: ManagerUser | null;
  authToken: string | null;
  workCenters: WorkCenter[];
  workers: Worker[];
  incidents: Incident[];
  monthlyReport: MonthlyWorkerReportItem[];
  selectedWorkCenterId: string;
  selectedMonth: number;
  selectedYear: number;
  activeView: 'form' | 'report' | 'master';
  currentTheme: 'dark' | 'light' | 'slate' | 'ocean';
}

export const AppState: AppStateType = {
  currentUser: null,
  authToken: null,
  workCenters: [],
  workers: [],
  incidents: [],
  monthlyReport: [],
  selectedWorkCenterId: '',
  selectedMonth: new Date().getMonth() + 1,
  selectedYear: new Date().getFullYear(),
  activeView: 'form',
  currentTheme: 'dark'
};
