import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/** Server client — respects RLS, reads session cookie for user context. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

/**
 * Admin/service-role client — bypasses RLS.
 * ONLY use in server Route Handlers for aggregated queries, webhooks, and
 * internal operations. Never return raw rows to the browser.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/**
 * Set the app.current_user_id Postgres parameter so RLS policies work
 * with the custom `auth_user_id` approach (not Supabase Auth).
 */
export async function setRLSContext(
  client: ReturnType<typeof createSupabaseAdminClient>,
  authUserId: string
) {
  await client.rpc("set_config", {
    setting_name: "app.current_user_id",
    new_value: authUserId,
    is_local: true,
  } as never);
}
