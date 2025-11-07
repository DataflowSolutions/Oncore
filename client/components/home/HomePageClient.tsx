'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { UserHeader } from './UserHeader'
import { OrganizationsList } from './OrganizationsList'
import { Loader2 } from 'lucide-react'

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

interface HomePageClientProps {
  userEmail: string
  userId: string
}

export function HomePageClient({ userEmail, userId }: HomePageClientProps) {
  // This will use the server-prefetched data on initial load (no spinner!)
  // Then automatically refetch in background after staleTime
  const { data: organizations = [], isLoading } = useQuery<UserOrganization[]>({
    queryKey: queryKeys.userOrganizations(userId),
    queryFn: async () => {
      const response = await fetch(`/api/user/organizations`)
      if (!response.ok) throw new Error('Failed to fetch organizations')
      return response.json()
    },
  })

  // Show loading only if we don't have initial data (shouldn't happen due to prefetch)
  if (isLoading && !organizations.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <UserHeader email={userEmail} />
        <OrganizationsList organizations={organizations} />
      </div>
    </div>
  )
}
