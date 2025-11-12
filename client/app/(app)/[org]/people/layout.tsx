import { notFound } from 'next/navigation'
import { getCachedOrg } from '@/lib/cache'
import TeamSearch from './components/TeamSearch'
import AddPersonButton from './components/AddPersonButton'

interface TeamLayoutProps {
  children: React.ReactNode
  params: Promise<{ org: string }>
}

export default async function TeamLayout({ children, params }: TeamLayoutProps) {
  const { org: orgSlug } = await params
  
  // Use cached org function to bypass RLS
  const { data: org, error } = await getCachedOrg(orgSlug)

  if (error || !org) {
    notFound()
  }

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">People</h1>
          <p className="mt-2 text-foreground/50">Manage your team members and internal staff</p>
        </div>
        <AddPersonButton orgId={org.id} />
      </div>
      
      <TeamSearch placeholder="Search" />
      
      {children}
    </div>
  )
}