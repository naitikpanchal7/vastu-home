// Called once at server startup (imported by API routes).
// Throws a clear error instead of cryptic SDK failures for missing keys.

const REQUIRED_SERVER = [
  "ANTHROPIC_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export function validateEnv() {
  const missing = REQUIRED_SERVER.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}\n` +
      `Copy .env.local.example to .env.local and fill in the values.`
    );
  }
}
