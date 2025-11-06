'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const STORAGE_KEY = 'oncore_selected_show'

interface SelectedShow {
  id: string
  orgSlug: string
  title?: string
}

export function useSelectedShow(orgSlug: string) {
  const pathname = usePathname()
  const [selectedShow, setSelectedShow] = useState<SelectedShow | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SelectedShow
        // Only use if it's for the current org
        if (parsed.orgSlug === orgSlug) {
          setSelectedShow(parsed)
        }
      } catch (error) {
        console.error('Error parsing stored show:', error)
      }
    }
  }, [orgSlug])

  // Detect show ID from URL and update localStorage
  useEffect(() => {
    // Match patterns like: /[org]/shows/[showId] or /[org]/shows/[showId]/day
    const showMatch = pathname?.match(new RegExp(`/${orgSlug}/shows/([^/]+)`))
    
    if (showMatch && showMatch[1]) {
      const showId = showMatch[1]
      // Only update if it's a different show
      if (!selectedShow || selectedShow.id !== showId) {
        const newShow: SelectedShow = {
          id: showId,
          orgSlug,
        }
        setSelectedShow(newShow)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newShow))
        
        // Fetch show title if we don't have it
        fetchShowTitle(showId, orgSlug, newShow)
      }
    }
  }, [pathname, orgSlug, selectedShow])

  // Fetch show title
  const fetchShowTitle = async (showId: string, orgSlug: string, currentShow: SelectedShow) => {
    try {
      const response = await fetch(`/api/${orgSlug}/shows/${showId}`)
      if (response.ok) {
        const show = await response.json()
        if (show.title) {
          const updated = { ...currentShow, title: show.title }
          setSelectedShow(updated)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        }
      }
    } catch (error) {
      console.error('Error fetching show title:', error)
    }
  }

  // Update show title when available
  const updateShowTitle = (title: string) => {
    if (selectedShow) {
      const updated = { ...selectedShow, title }
      setSelectedShow(updated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }
  }

  // Clear selected show
  const clearSelectedShow = () => {
    setSelectedShow(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    selectedShow,
    updateShowTitle,
    clearSelectedShow,
  }
}
