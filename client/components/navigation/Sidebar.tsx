'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Calendar, 
  Users, 
  MapPin, 
  Settings,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  orgSlug: string
  userRole: string
}

export function Sidebar({ orgSlug, userRole }: SidebarProps) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const navigation = [
    { name: 'Home', href: `/${orgSlug}`, icon: Home },
    { name: 'Shows', href: `/${orgSlug}/shows`, icon: Calendar },
    { name: 'People', href: `/${orgSlug}/people`, icon: Users },
    { name: 'Venues', href: `/${orgSlug}/venues`, icon: MapPin },
    { name: 'Settings', href: `/${orgSlug}/profile`, icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === `/${orgSlug}`) {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-64
          border-r border-border bg-card
          transition-transform duration-200 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex h-full flex-col">
          {/* Logo/Header */}
          <div className="flex h-16 items-center border-b border-border px-6">
            <Link 
              href={`/${orgSlug}`} 
              prefetch={true}
              className="text-xl font-bold text-foreground hover:text-primary transition-colors"
              onClick={() => setIsMobileOpen(false)}
            >
              Oncore
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const active = isActive(item.href)
              const Icon = item.icon

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    flex items-center gap-3 rounded-lg px-3 py-2
                    text-base font-medium transition-colors
                    ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-border p-4">
            <div className="text-xs text-muted-foreground">
              Role: <span className="font-medium text-foreground">{userRole}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
