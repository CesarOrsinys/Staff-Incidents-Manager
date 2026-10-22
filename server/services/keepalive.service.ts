import { getSupabaseClient } from '../../src/adapters/infrastructure/services/SupabaseClient.js';

const KEEPALIVE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let schedulerTimer: NodeJS.Timeout | null = null;

export interface KeepaliveResult {
  ok: boolean;
  project: string;
  timestamp: string;
  latencyMs: number;
  recordsCount?: number;
  error?: string;
}

/**
 * Executes a minuscule query to Supabase solely to keep the project active and prevent pausing.
 * Runs strictly server-side without sending notices or alerts to the UI.
 */
export async function executeKeepalivePing(): Promise<KeepaliveResult> {
  const startTime = Date.now();
  try {
    const client = getSupabaseClient();
    if (!client) {
      const latencyMs = Date.now() - startTime;
      return {
        ok: true,
        project: 'Staff-Incidents-Manager',
        timestamp: new Date().toISOString(),
        latencyMs,
        error: 'Supabase client not configured (mock mode active)'
      };
    }

    // Ultra-lightweight query: fetch 1 ID only
    const { data, error } = await client.from('work_centers').select('id').limit(1);

    const latencyMs = Date.now() - startTime;
    if (error) {
      console.warn(`[Keepalive:Staff-Incidents-Manager] Ping error after ${latencyMs}ms:`, error.message);
      return {
        ok: false,
        project: 'Staff-Incidents-Manager',
        timestamp: new Date().toISOString(),
        latencyMs,
        error: error.message
      };
    }

    console.log(`[Keepalive:Staff-Incidents-Manager] Ping successful (${latencyMs}ms). Supabase project kept active.`);
    return {
      ok: true,
      project: 'Staff-Incidents-Manager',
      timestamp: new Date().toISOString(),
      latencyMs,
      recordsCount: data?.length || 0
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    console.warn(`[Keepalive:Staff-Incidents-Manager] Ping exception after ${latencyMs}ms:`, err.message);
    return {
      ok: false,
      project: 'Staff-Incidents-Manager',
      timestamp: new Date().toISOString(),
      latencyMs,
      error: err.message || 'Unknown error'
    };
  }
}

/**
 * Starts recurring 1-hour background timer on the server.
 */
export function startKeepaliveScheduler(): void {
  if (schedulerTimer) return;

  // Run initial ping 10 seconds after server startup
  setTimeout(() => {
    executeKeepalivePing().catch(err => {
      console.warn('[Keepalive:Staff-Incidents-Manager] Initial ping failed:', err.message);
    });
  }, 10000);

  // Repeat every 1 hour
  schedulerTimer = setInterval(() => {
    executeKeepalivePing().catch(err => {
      console.warn('[Keepalive:Staff-Incidents-Manager] Recurring ping failed:', err.message);
    });
  }, KEEPALIVE_INTERVAL_MS);

  // Unref timer so it doesn't prevent graceful process exit
  if (schedulerTimer.unref) {
    schedulerTimer.unref();
  }

  console.log('⏰ [Keepalive:Staff-Incidents-Manager] Server-side keepalive scheduler active (every 1 hour).');
}
