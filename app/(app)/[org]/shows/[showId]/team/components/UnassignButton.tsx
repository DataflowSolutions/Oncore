'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { removePersonFromShow } from '@/lib/actions/show-team'
import { useRouter } from 'next/navigation'

interface UnassignButtonProps {
  showId: string
  personId: string
  personName: string
}

export default function UnassignButton({ showId, personId, personName }: UnassignButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleUnassign = async () => {
    if (!confirm(`Do you want to unassign ${personName} from this show?`)) {
      return
    }

    setIsLoading(true)
    try {
      await removePersonFromShow(showId, personId)
      router.refresh()
    } catch (error) {
      console.error('Error unassigning person:', error)
      alert('Failed to unassign person. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleUnassign}
      disabled={isLoading}
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/30"
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  )
}