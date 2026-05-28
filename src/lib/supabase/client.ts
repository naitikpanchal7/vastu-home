// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (_client) return _client;

  _client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // When the refresh token is invalid Supabase fires SIGNED_OUT.
  // Sign out explicitly to clear stale cookies/localStorage and stop retry loops.
  _client.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      _client?.auth.signOut().catch(() => null);
    }
  });

  return _client;
}
