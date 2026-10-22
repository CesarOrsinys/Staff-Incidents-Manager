import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  // Read from environment variables (works both in Node process.env and Vite import.meta.env)
  let supabaseUrl = '';
  let supabaseKey = '';

  if (typeof process !== 'undefined' && process.env) {
    supabaseUrl = process.env.SUPABASE_URL || '';
    supabaseKey = process.env.SUPABASE_ANON_KEY || '';
  }

  // Vite fallback if running client-side with VITE_ prefix
  if (!supabaseUrl && typeof import.meta !== 'undefined' && (import.meta as any).env) {
    supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
    supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';
  }

  // Clean URL if user passed '/rest/v1/' at the end
  if (supabaseUrl) {
    supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  }

  if (supabaseUrl && supabaseKey) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseKey);
      console.log(`[SupabaseClient] Initialized client for ${supabaseUrl}`);
    } catch (err) {
      console.error('[SupabaseClient] Error initializing Supabase client:', err);
      return null;
    }
  }

  return supabaseInstance;
}
