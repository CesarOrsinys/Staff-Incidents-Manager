import dotenv from 'dotenv';
dotenv.config();

import { app } from './app.js';

const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
  console.log(`[Staff-Incidents-Manager] Backend server running on http://localhost:${PORT}`);
});
