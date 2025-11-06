'use client'

import { useAdvancingStore } from '@/lib/stores/advancing-store'

interface PartyToggleProps {
  current: 'from_us' | 'from_you'
  basePath?: string
}

export function PartyToggle({ current }: PartyToggleProps) {
  const setParty = useAdvancingStore((state) => state.setParty)

  const handleToggle = (party: 'from_us' | 'from_you') => {
    setParty(party)
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