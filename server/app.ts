import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes.js';
import { workCentersRouter } from './routes/workCenters.routes.js';
import { workersRouter } from './routes/workers.routes.js';
import { incidentsRouter } from './routes/incidents.routes.js';
import { reportsRouter } from './routes/reports.routes.js';

export const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/work-centers', workCentersRouter);
app.use('/api/workers', workersRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/reports', reportsRouter);

import { RepositoryContainer } from '../src/adapters/infrastructure/di/RepositoryContainer.js';
import { getSupabaseClient } from '../src/adapters/infrastructure/services/SupabaseClient.js';

app.get('/api/health', async (_req, res) => {
  const client = getSupabaseClient();
  let dbStatus = 'json_mock';
  let workCentersCount = 0;
  if (client) {
    const { data, error } = await client.from('work_centers').select('id');
    if (!error) {
      dbStatus = 'supabase_live';
      workCentersCount = data?.length || 0;
    } else {
      dbStatus = `supabase_error: ${error.message}`;
    }
  }

  res.json({
    status: 'ok',
    database: dbStatus,
    workCentersCount,
    service: 'Staff-Incidents-Manager',
    timestamp: new Date().toISOString()
  });
});
