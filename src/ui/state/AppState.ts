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
  activeView: 'login' | 'hub' | 'form' | 'report' | 'master';
  currentTheme: 'dark' | 'light' | 'slate' | 'ocean';
  reportFilter: 'all' | 'owed' | 'overtime';
}

export const AppState: AppStateType = {
  currentUser: null,
  authToken: null,
  workCenters: [],
  workers: [],
  incidents: [],
  monthlyReport: [],
  selectedWorkCenterId: 'wc_borrull',
  selectedMonth: new Date().getMonth() + 1,
  selectedYear: new Date().getFullYear(),
  activeView: 'login',
  currentTheme: 'dark',
  reportFilter: 'all'
};
