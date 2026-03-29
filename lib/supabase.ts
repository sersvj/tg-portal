import { createClient } from "@supabase/supabase-js";

// Server-side client (service role — bypasses RLS, for server actions only)
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Client-side client (anon key — for browser uploads if needed)
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const LOGO_BUCKET = "client-logos";
