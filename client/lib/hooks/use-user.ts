'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

interface Organization {
  id: string
  name: string
  slug: string
  created_at: string
}

interface UserOrganization {
  role: string
  created_at: string
  organizations: Organization
}

/**
 * Fetch user's organizations
 * Uses: Home page/dashboard
 * Caching: 2 minutes stale time
 */
export function useUserOrganizations() {
  return useQuery<UserOrganization[]>({
    queryKey: queryKeys.userOrganizations('current'), // Using 'current' as placeholder for current user
    queryFn: async () => {
      const response = await fetch(`/api/user/organizations`)
      if (!response.ok) throw new Error('Failed to fetch organizations')
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (organizations don't change often)
  })
}
