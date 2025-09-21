'use client'

import { useState, useEffect } from 'react'
import { createOrganization } from './actions'

export default function CreateOrgPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManuallyEdited && name) {
      const autoSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      setSlug(autoSlug)
    }
  }, [name, slugManuallyEdited])

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value)
    setSlugManuallyEdited(true)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    const formData = new FormData()
    formData.append('name', name)
    formData.append('slug', slug)

    try {
      const result = await createOrganization(formData)
      if (result?.error) {
        setError(result.error)
      }
      // If no error, the server action will redirect
    } catch (err) {
      console.error('Form submission error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-bold">Create Organization</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Set up your tour organization to get started
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Organization Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="My Tour Company"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label htmlFor="slug" className="block text-sm font-medium">
              URL Slug
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              required
              placeholder="my-tour-company"
              value={slug}
              onChange={handleSlugChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="mt-1 text-xs text-gray-500">
              Used in URLs: /{slug || 'your-org'}/dashboard
            </p>
            {!slugManuallyEdited && (
              <p className="mt-1 text-xs text-blue-600">
                Auto-generated from organization name (you can edit this)
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating Organization...' : 'Create Organization'}
          </button>
        </form>
      </div>
    </div>
  )
}