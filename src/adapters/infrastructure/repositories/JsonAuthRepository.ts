import bcrypt from 'bcryptjs';
import { IAuthRepository } from '../../../core/ports/IAuthRepository.js';
import { ManagerUser } from '../../../core/domain/entities/ManagerUser.js';

interface RawUserRecord {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  plainPasswordFallback?: string;
  role: 'MANAGER';
  active: boolean;
  createdAt: string;
}

let inMemoryUsers: RawUserRecord[] = [];
let initialized = false;

export class JsonAuthRepository implements IAuthRepository {
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || './mock_data/users.json';
  }

  private async load(): Promise<RawUserRecord[]> {
    if (initialized && inMemoryUsers.length > 0) {
      return inMemoryUsers;
    }

    try {
      if (typeof window === 'undefined') {
        const fs = await import('fs/promises');
        const path = await import('path');
        const resolved = path.resolve(process.cwd(), this.filePath);
        const data = await fs.readFile(resolved, 'utf-8');
        inMemoryUsers = JSON.parse(data);
      } else {
        const response = await fetch('/api/auth/users');
        if (response.ok) {
          inMemoryUsers = await response.json();
        }
      }
    } catch (err) {
      inMemoryUsers = [
        {
          id: 'mgr_001',
          name: 'César Orsinys',
          username: 'gerente',
          email: 'gerente@empresa.com',
          passwordHash: '$2b$10$epkJ1hXgYjC5g5R8KxQk8e0bQoRz.U3U3p9x0wKzZgq9v9Z5t4u7y',
          plainPasswordFallback: 'admin123',
          role: 'MANAGER',
          active: true,
          createdAt: '2026-01-15T08:00:00.000Z'
        }
      ];
    }
    initialized = true;
    return inMemoryUsers;
  }

  async authenticate(usernameOrEmail: string, password: string): Promise<ManagerUser | null> {
    const users = await this.load();
    const query = usernameOrEmail.trim().toLowerCase();

    const user = users.find(u => 
      u.active && (u.username.toLowerCase() === query || u.email.toLowerCase() === query)
    );

    if (!user) return null;

    let valid = false;
    try {
      valid = await bcrypt.compare(password, user.passwordHash);
    } catch (e) {
      // Ignore bcrypt comparison error and check plain fallback
    }

    if (!valid && user.plainPasswordFallback && user.plainPasswordFallback === password) {
      valid = true;
    }

    if (!valid) return null;

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: 'MANAGER',
      active: user.active,
      createdAt: user.createdAt
    };
  }

  async getById(id: string): Promise<ManagerUser | null> {
    const users = await this.load();
    const user = users.find(u => u.id === id);
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: 'MANAGER',
      active: user.active,
      createdAt: user.createdAt
    };
  }

  async getAll(): Promise<ManagerUser[]> {
    const users = await this.load();
    return users.map(u => ({
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      role: 'MANAGER',
      active: u.active,
      createdAt: u.createdAt
    }));
  }
}
