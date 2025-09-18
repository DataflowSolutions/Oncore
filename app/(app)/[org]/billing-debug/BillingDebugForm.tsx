'use client'

import { useState } from 'react'
import { assignPlanDebug } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface BillingDebugFormProps {
  orgId: string
  plans: Array<{
    id: string
    name: string
    description: string | null
    price_cents: number
    max_artists: number | null
    max_members: number | null
    max_collaborators: number | null
  }>
}

export function BillingDebugForm({ orgId, plans }: BillingDebugFormProps) {
  const [selectedPlan, setSelectedPlan] = useState('')
  const [trialDays, setTrialDays] = useState(7)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlan) return

    setIsLoading(true)
    setMessage('')

    try {
      await assignPlanDebug(orgId, selectedPlan, trialDays)
      setMessage('Plan assigned successfully! Refresh the page to see changes.')
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-2">
            Select Plan
          </label>
          <Select value={selectedPlan} onValueChange={setSelectedPlan} required>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a plan..." />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name} - ${plan.price_cents / 100}/month 
                  {plan.max_artists && ` (${plan.max_artists} artists)`}
                  {plan.max_members && ` (${plan.max_members} members)`}
                  {plan.max_collaborators && ` (${plan.max_collaborators} collaborators)`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-2">
            Trial Days
          </label>
          <Input
            type="number"
            value={trialDays}
            onChange={(e) => setTrialDays(parseInt(e.target.value) || 7)}
            min="1"
            max="365"
            className="w-32"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading || !selectedPlan}
          variant="default"
        >
          {isLoading ? 'Assigning...' : 'Assign Plan'}
        </Button>
      </form>

      {message && (
        <Card className={`mt-4 ${
          message.startsWith('Error') 
            ? 'border-red-500 bg-red-900/20'
            : 'border-green-500 bg-green-900/20'
        }`}>
          <CardContent className="pt-6">
            <p className={message.startsWith('Error') ? 'text-red-400' : 'text-green-400'}>
              {message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Plan Details */}
      {selectedPlan && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Plan Details</CardTitle>
          </CardHeader>
          <CardContent>
            {plans.find(p => p.id === selectedPlan) && (
              <div className="text-sm text-foreground/80 space-y-1">
                <p><strong>Name:</strong> {plans.find(p => p.id === selectedPlan)?.name}</p>
                <p><strong>Description:</strong> {plans.find(p => p.id === selectedPlan)?.description || 'N/A'}</p>
                <p><strong>Price:</strong> ${(plans.find(p => p.id === selectedPlan)?.price_cents || 0) / 100}/month</p>
                <p><strong>Limits:</strong> 
                  {plans.find(p => p.id === selectedPlan)?.max_artists || 'Unlimited'} artists, {' '}
                  {plans.find(p => p.id === selectedPlan)?.max_members || 'Unlimited'} members, {' '}
                  {plans.find(p => p.id === selectedPlan)?.max_collaborators || 'Unlimited'} collaborators
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}