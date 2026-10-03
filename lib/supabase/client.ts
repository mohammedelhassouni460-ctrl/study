"use client";

import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/public-env";
import type { Database } from "@/types/database";

/** Browser Supabase client (anon key + user session, RLS enforced). */
export function createClient() {
  return createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
