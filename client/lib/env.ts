/**
 * Environment configuration utility
 * Handles switching between local and production database configurations
 */

export const getEnvironmentConfig = () => {
  const isProduction = process.env.PROD_DB === 'true'
  
  return {
    isProduction,
    supabase: {
      url: isProduction 
        ? process.env.PROD_SUPABASE_URL 
        : process.env.LOCAL_SUPABASE_URL,
      anonKey: isProduction
        ? process.env.PROD_SUPABASE_ANON_KEY
        : process.env.LOCAL_SUPABASE_ANON_KEY,
      serviceRoleKey: isProduction
        ? process.env.PROD_SUPABASE_SERVICE_ROLE_KEY
        : process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY,
    },
    database: {
      url: isProduction
        ? process.env.PROD_DATABASE_URL
        : process.env.LOCAL_DATABASE_URL,
    },
    project: {
      ref: process.env.SUPABASE_PROJECT_REF,
    }
  }
}

export const validateEnvironmentConfig = () => {
  const config = getEnvironmentConfig()
  const required = [
    'SUPABASE_PROJECT_REF',
    config.isProduction ? 'PROD_SUPABASE_URL' : 'LOCAL_SUPABASE_URL',
    config.isProduction ? 'PROD_SUPABASE_ANON_KEY' : 'LOCAL_SUPABASE_ANON_KEY',
  ]

  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Current environment: ${config.isProduction ? 'production' : 'local'}\n` +
      `Check your .env.local file and ensure all required variables are set.`
    )
  }

  return config
}

// Client-side environment info (safe to expose)
export const getClientConfig = () => {
  const config = getEnvironmentConfig()
  return {
    isProduction: config.isProduction,
    supabaseUrl: config.supabase.url,
    supabaseAnonKey: config.supabase.anonKey,
  }
}