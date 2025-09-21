'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface PartyToggleProps {
  current: 'from_us' | 'from_you'
  basePath: string
}

export function PartyToggle({ current, basePath }: PartyToggleProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleToggle = (party: 'from_us' | 'from_you') => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('party', party)
    router.replace(`${basePath}?${params.toString()}`)
  }

  return (
    <div className="inline-flex rounded bg-neutral-900 p-1 border border-neutral-800">
      <button
        onClick={() => handleToggle('from_us')}
        className={`px-3 py-1 text-sm rounded transition-colors ${
          current === 'from_us' 
            ? 'bg-neutral-800 text-white font-medium' 
            : 'text-neutral-400 hover:text-neutral-300'
        }`}
      >
        Artist Team
      </button>
      <button
        onClick={() => handleToggle('from_you')}
        className={`px-3 py-1 text-sm rounded transition-colors ${
          current === 'from_you' 
            ? 'bg-neutral-800 text-white font-medium' 
            : 'text-neutral-400 hover:text-neutral-300'
        }`}
      >
        Promoter Team
      </button>
    </div>
  )
}