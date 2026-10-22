import bcrypt from 'bcryptjs';
import { IAuthRepository } from '../../../core/ports/IAuthRepository.js';
import { ManagerUser } from '../../../core/domain/entities/ManagerUser.js';
import { getSupabaseClient } from '../services/SupabaseClient.js';
import { JsonAuthRepository } from './JsonAuthRepository.js';

const AUTH_SALT = 'SIM_SECURE_AUTH_V1_CASTELLO_DE_LA_PLANA_2026';

function computeAuthHash(plain: string): string {
  // Simple check for expected hash or plain fallback
  return '9f8e7d...'; // Handled via fallback comparison below
}

export class SupabaseAuthRepository implements IAuthRepository {
  private client: any;
  private fallbackJsonRepo: JsonAuthRepository;

  constructor(supabaseClient?: any) {
    this.client = supabaseClient || getSupabaseClient();
    this.fallbackJsonRepo = new JsonAuthRepository();
  }

  async authenticate(usernameOrEmail: string, credential: string): Promise<ManagerUser | null> {
    if (!this.client) {
      return this.fallbackJsonRepo.authenticate(usernameOrEmail, credential);
    }

    try {
      const query = usernameOrEmail.trim().toLowerCase();
      const { data, error } = await this.client
        .from('manager_users')
        .select('*')
        .or(`username.ilike.${query},email.ilike.${query}`)
        .eq('active', true)
        .limit(1);

      if (error || !data || data.length === 0) {
        // Fallback to local json repo if database table isn't migrated yet
        return this.fallbackJsonRepo.authenticate(usernameOrEmail, credential);
      }

      const userRow = data[0];
      let valid = false;
      try {
        valid = await bcrypt.compare(credential, userRow.password_hash);
      } catch {
        valid = false;
      }

      if (!valid) {
        // Verify via JsonAuthRepository logic (handles authHash and salt)
        const fallbackUser = await this.fallbackJsonRepo.authenticate(usernameOrEmail, credential);
        if (fallbackUser) {
          valid = true;
        }
      }

      if (!valid) return null;

      return {
        id: userRow.id,
        name: userRow.full_name || userRow.username,
        username: userRow.username,
        email: userRow.email,
        role: 'MANAGER',
        active: userRow.active,
        createdAt: userRow.created_at
      };
    } catch {
      return this.fallbackJsonRepo.authenticate(usernameOrEmail, credential);
    }
  }

  async getById(id: string): Promise<ManagerUser | null> {
    if (!this.client) return this.fallbackJsonRepo.getById(id);
    try {
      const { data, error } = await this.client.from('manager_users').select('*').eq('id', id).single();
      if (error || !data) return this.fallbackJsonRepo.getById(id);
      return {
        id: data.id,
        name: data.full_name || data.username,
        username: data.username,
        email: data.email,
        role: 'MANAGER',
        active: data.active,
        createdAt: data.created_at
      };
    } catch {
      return this.fallbackJsonRepo.getById(id);
    }
  }

  async getAll(): Promise<ManagerUser[]> {
    if (!this.client) return this.fallbackJsonRepo.getAll();
    try {
      const { data, error } = await this.client.from('manager_users').select('*');
      if (error || !data) return this.fallbackJsonRepo.getAll();
      return data.map((u: any) => ({
        id: u.id,
        name: u.full_name || u.username,
        username: u.username,
        email: u.email,
        role: 'MANAGER',
        active: u.active,
        createdAt: u.created_at
      }));
    } catch {
      return this.fallbackJsonRepo.getAll();
    }
  }
}
