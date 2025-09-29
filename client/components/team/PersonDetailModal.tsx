'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Mail, Phone, User, X } from 'lucide-react'
import { getPersonDetails } from '@/lib/actions/team'

interface PersonDetailModalProps {
  personId: string | null
  isOpen: boolean
  onClose: () => void
}

export default function PersonDetailModal({ personId, isOpen, onClose }: PersonDetailModalProps) {
  const [details, setDetails] = useState<{
    person: {
      id: string
      name: string
      email: string | null
      phone: string | null
      member_type: string | null
      notes: string | null
      created_at: string
    }
    assignments: Array<{
      duty: string | null
      shows: {
        id: string
        title: string | null
        date: string
        status: string
        venues: {
          name: string
          city: string | null
        } | null
      }
    }>
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPersonDetails = useCallback(async () => {
    if (!personId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const data = await getPersonDetails(personId)
      setDetails(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load person details')
    } finally {
      setLoading(false)
    }
  }, [personId])

  useEffect(() => {
    if (personId && isOpen) {
      fetchPersonDetails()
    }
  }, [personId, isOpen, fetchPersonDetails])

  if (!isOpen) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getMemberTypeBadgeColor = (type: string | null) => {
    if (!type) return 'bg-gray-100 text-gray-800'
    switch (type.toLowerCase()) {
      case 'band':
        return 'bg-purple-100 text-purple-800'
      case 'crew':
        return 'bg-blue-100 text-blue-800'
      case 'freelancer':
        return 'bg-green-100 text-green-800'
      case 'vendor':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'tentative':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User size={20} />
              <h2 className="text-xl font-semibold">
                {details?.person?.name || 'Loading...'}
              </h2>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClose}
              className="flex items-center gap-1"
            >
              <X size={16} />
              Close
            </Button>
          </div>
          <p className="text-gray-600 mb-6">Team member details and show assignments</p>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {details && (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Member Type</span>
                    <Badge className={getMemberTypeBadgeColor(details.person.member_type)}>
                      {details.person.member_type || 'Not specified'}
                    </Badge>
                  </div>
                  
                  {details.person.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-gray-500" />
                      <a 
                        href={`mailto:${details.person.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {details.person.email}
                      </a>
                    </div>
                  )}
                  
                  {details.person.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-500" />
                      <a 
                        href={`tel:${details.person.phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {details.person.phone}
                      </a>
                    </div>
                  )}

                  {details.person.notes && (
                    <div>
                      <span className="font-medium text-sm text-gray-700">Notes:</span>
                      <p className="text-sm text-gray-600 mt-1">{details.person.notes}</p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Added on {formatDate(details.person.created_at)}
                  </div>
                </CardContent>
              </Card>

              {/* Show Assignments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Show Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  {details.assignments.length === 0 ? (
                    <p className="text-gray-500 text-sm">No show assignments yet</p>
                  ) : (
                    <div className="space-y-3">
                      {details.assignments.map((assignment, index) => (
                        <div key={index} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{assignment.shows.title || 'Untitled Show'}</h4>
                            <Badge className={getStatusBadgeColor(assignment.shows.status)}>
                              {assignment.shows.status}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar size={14} />
                              {formatDate(assignment.shows.date)}
                            </div>
                            
                            {assignment.shows.venues && (
                              <div className="flex items-center gap-1">
                                <MapPin size={14} />
                                {assignment.shows.venues.name}
                                {assignment.shows.venues.city && `, ${assignment.shows.venues.city}`}
                              </div>
                            )}
                          </div>

                          {assignment.duty && (
                            <div className="text-sm">
                              <span className="font-medium">Role:</span> {assignment.duty}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}