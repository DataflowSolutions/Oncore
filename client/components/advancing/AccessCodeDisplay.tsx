'use client'

import { Button } from '@/components/ui/button'
import { Copy, Check, RefreshCw } from 'lucide-react'
import { useState } from 'react'

interface AccessCodeDisplayProps {
  accessCode?: string | null
}

export function AccessCodeDisplay({ accessCode }: AccessCodeDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const accessLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${accessCode || '••••••••'}`

  if (!accessCode) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-500">
              Access code not available
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              The access code was only displayed once when this session was created. For security reasons, it cannot be retrieved again.
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-muted rounded-md">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">
              Need a new code? You can generate a new access code, but the old one will stop working.
            </p>
          </div>
          <Button variant="outline" size="sm" disabled>
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate Code
            <span className="ml-2 text-xs text-muted-foreground">(Coming soon)</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1 flex-1">
          <p className="text-sm text-muted-foreground">
            Share this code with external parties to submit information
          </p>
          <div className="flex items-center gap-2">
            <code className="text-2xl font-mono font-bold tracking-wider select-all">
              {accessCode}
            </code>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleCopy(accessCode)}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleCopy(accessLink)}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
        </div>
      </div>
      
      <div className="p-3 bg-muted rounded-md">
        <p className="text-xs text-muted-foreground">
          <strong>Access Link:</strong> <code className="text-xs">{accessLink}</code>
        </p>
      </div>

      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
        <p className="text-xs text-muted-foreground">
          <strong>Important:</strong> This access code is only displayed here. Make sure to save it or share it with your collaborators now. 
          For security reasons, you won&apos;t be able to view it again after leaving this page.
        </p>
      </div>
    </div>
  )
}
