import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client with SERVICE ROLE key
 * Used for session storage and other privileged operations
 * DO NOT expose this client to the browser!
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set!');
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

// Server-side client with full database access (bypasses RLS)
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

console.log('✅ Server-side Supabase client initialized');

