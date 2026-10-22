import { ContractStatus } from '../enums/ContractStatus.js';

export interface Worker {
  id: string;
  name: string;
  documentId?: string;
  email?: string;
  phone?: string;
  contractStatus: ContractStatus | string;
  assignedWorkCenterId?: string;
  active: boolean;
}
