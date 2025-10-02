// Environment Configuration

// Determine if using production or local database
const isProd =
  process.env.PROD_DB === "true" || process.env.NEXT_PUBLIC_PROD_DB === "true";

// Select the appropriate environment variables
const getEnvVar = (prodKey: string, localKey: string): string => {
  if (isProd) {
    return process.env[prodKey] || process.env[`NEXT_PUBLIC_${prodKey}`] || "";
  }
  return process.env[localKey] || process.env[`NEXT_PUBLIC_${localKey}`] || "";
};

export const env = {
  // Environment selector
  IS_PRODUCTION: isProd,

  // Supabase (automatically switches between prod/local)
  SUPABASE_URL: getEnvVar("PROD_SUPABASE_URL", "LOCAL_SUPABASE_URL"),
  SUPABASE_ANON_KEY: getEnvVar(
    "PROD_SUPABASE_ANON_KEY",
    "LOCAL_SUPABASE_ANON_KEY"
  ),
  SUPABASE_SERVICE_ROLE_KEY: getEnvVar(
    "PROD_SUPABASE_SERVICE_ROLE_KEY",
    "LOCAL_SUPABASE_SERVICE_ROLE_KEY"
  ),
  DATABASE_URL: getEnvVar("PROD_DATABASE_URL", "LOCAL_DATABASE_URL"),

  // API
  API_BASE_URL: process.env.API_BASE_URL || "/api",
  API_VERSION: process.env.API_VERSION || "v1",

  // App
  NODE_ENV: process.env.NODE_ENV || "development",

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",

  // Optional
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF || "",
};

export function validateEnv() {
  const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY"];

  for (const key of required) {
    if (!env[key as keyof typeof env]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  // Log which environment we're using
  console.log(`🔧 Backend using ${isProd ? "PRODUCTION" : "LOCAL"} database`);
  console.log(`📍 Supabase URL: ${env.SUPABASE_URL}`);
}
