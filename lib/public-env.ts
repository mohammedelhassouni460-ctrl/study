/**
 * Public (browser-safe) configuration. `NEXT_PUBLIC_*` values are inlined at
 * build time, so they must be read with static property access.
 */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "",
  posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
};

export const siteConfig = {
  name: "StudyOS AI",
  shortName: "StudyOS",
  description:
    "Transforme tes cours en fiches, flashcards, quiz et plans de révision personnalisés grâce à l'IA.",
  url: publicEnv.appUrl,
};
