import dotenv from 'dotenv';
dotenv.config();

import { app } from './app.js';
import { RepositoryContainer } from '../src/adapters/infrastructure/di/RepositoryContainer.js';
import { getSupabaseClient } from '../src/adapters/infrastructure/services/SupabaseClient.js';
import { startKeepaliveScheduler } from './services/keepalive.service.js';

const PORT = process.env.PORT || 7071;

async function bootstrap() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from('work_centers').select('id').limit(1);
      if (!error) {
        RepositoryContainer.useSupabaseRepositories();
        console.log('[Staff-Incidents-Manager] Supabase database connected and tables verified.');
      } else {
        console.warn(`[Staff-Incidents-Manager] Supabase credentials detected (${process.env.SUPABASE_URL}), but tables not found (${error.message}). Execute supabase/schema.sql and supabase/seed.sql in Supabase SQL Editor to activate live cloud database.`);
      }
    }
  }

  app.listen(PORT, () => {
    console.log(`[Staff-Incidents-Manager] Backend server running on http://localhost:${PORT}`);
    startKeepaliveScheduler();
  });
}

bootstrap();
