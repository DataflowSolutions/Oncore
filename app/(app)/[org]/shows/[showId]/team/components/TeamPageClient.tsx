'use client'

import { useRouter } from 'next/navigation'
import AssignPersonModal from './AssignPersonModal'

interface TeamPageClientProps {
  showId: string
  availablePeople: Array<{
    id: string
    name: string
    member_type: string | null
    email: string | null
  }>
}

export default function TeamPageClient({ showId, availablePeople }: TeamPageClientProps) {
  const router = useRouter()

  const handleAssignmentSuccess = () => {
    router.refresh()
  }

  return (
    <AssignPersonModal 
      showId={showId}
      availablePeople={availablePeople}
      onSuccess={handleAssignmentSuccess}
    />
  )
}