export interface ManagerUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'MANAGER';
  active: boolean;
  createdAt: string;
}
