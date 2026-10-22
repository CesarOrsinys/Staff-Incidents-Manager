import { ManagerUser } from '../domain/entities/ManagerUser.js';

export interface IAuthRepository {
  authenticate(usernameOrEmail: string, password: string): Promise<ManagerUser | null>;
  getById(id: string): Promise<ManagerUser | null>;
  getAll(): Promise<ManagerUser[]>;
}
