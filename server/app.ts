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

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Staff-Incidents-Manager',
    timestamp: new Date().toISOString()
  });
});
