// Admin client with service role for bypassing RLS policies
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('VITE_SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations may not work properly.');
}

export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
