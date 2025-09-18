/**
 * Supabase Environment Status Component
 * Shows which database environment is currently active
 */

import { getClientConfig } from '@/lib/env'

export default function SupabaseStatus() {
  const config = getClientConfig()

  return (
    <div className="p-4 border rounded-lg bg-black">
      <h3 className="font-semibold text-lg mb-2">Database Environment</h3>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div 
            className={`w-3 h-3 rounded-full ${
              config.isProduction ? 'bg-red-500' : 'bg-green-500'
            }`}
          />
          <span className="font-medium">
            {config.isProduction ? 'Production' : 'Local Development'}
          </span>
        </div>
        
        <div className="text-sm text-gray-600">
          <p><strong>URL:</strong> {config.supabaseUrl}</p>
          <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
        </div>

        {!config.isProduction && (
          <div className="mt-3 p-2 bg-blue-100 rounded text-sm">
            <p className="text-blue-800">
              💡 <strong>Local Mode:</strong> Using local Supabase instance
            </p>
            <p className="text-blue-700 mt-1">
              To switch to production, set <code>PROD_DB=true</code> in your .env.local
            </p>
          </div>
        )}

        {config.isProduction && (
          <div className="mt-3 p-2 bg-red-100 rounded text-sm">
            <p className="text-red-800">
              ⚠️ <strong>Production Mode:</strong> Connected to live database
            </p>
            <p className="text-red-700 mt-1">
              Set <code>PROD_DB=false</code> to use local development database
            </p>
          </div>
        )}
      </div>
    </div>
  )
}