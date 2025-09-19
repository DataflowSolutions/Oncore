'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Music, Building } from 'lucide-react'

interface TeamTabsProps {
  orgSlug: string
}

export default function TeamTabs({ orgSlug }: TeamTabsProps) {
  const pathname = usePathname()
  
  const isAllActive = pathname === `/${orgSlug}/team`
  const isArtistActive = pathname.includes('/team/artist')
  const isPromoterActive = pathname.includes('/team/promoter')

  return (
    <div className="flex gap-2 mb-6">
      <Link
        href={`/${orgSlug}/team`}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
          ${isAllActive 
            ? 'bg-foreground text-background shadow-md' 
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }
        `}
      >
        <Users className="w-4 h-4" />
        All Team
      </Link>
      <Link
        href={`/${orgSlug}/team/artist`}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
          ${isArtistActive 
            ? 'bg-foreground text-background shadow-md' 
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }
        `}
      >
        <Music className="w-4 h-4" />
        Artist Team
      </Link>
      <Link
        href={`/${orgSlug}/team/promoter`}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
          ${isPromoterActive 
            ? 'bg-foreground text-background shadow-md' 
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }
        `}
      >
        <Building className="w-4 h-4" />
        Promoter Team
      </Link>
    </div>
  )
}