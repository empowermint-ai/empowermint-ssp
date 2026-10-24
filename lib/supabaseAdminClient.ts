import 'server-only';
import { createClient } from '@supabase/supabase-js';

export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      // Next.js caches fetch() GETs inside route handlers; admin reads must always be live.
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    }
  );
}
