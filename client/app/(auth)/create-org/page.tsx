"use client";

import { useState, useEffect, useCallback } from "react";
import { createOrganization } from "./actions";
import { logger } from '@/lib/logger'
import { isReservedSlug } from '@/lib/constants/reserved-slugs'
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

type SlugCheckStatus = 'idle' | 'checking' | 'available' | 'unavailable' | 'invalid'

export default function CreateOrgPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugCheckStatus>('idle');
  const [slugMessage, setSlugMessage] = useState("");
  const [slugCheckTimeout, setSlugCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  // Validate and check slug availability
  const checkSlugAvailability = useCallback(async (slugToCheck: string) => {
    if (!slugToCheck) {
      setSlugStatus('idle');
      setSlugMessage('');
      return;
    }

    // Client-side format validation
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slugToCheck)) {
      setSlugStatus('invalid');
      setSlugMessage('Slug must contain only lowercase letters, numbers, and hyphens');
      return;
    }

    // Check reserved slugs
    if (isReservedSlug(slugToCheck)) {
      setSlugStatus('unavailable');
      setSlugMessage('This slug is reserved and cannot be used');
      return;
    }

    // Check availability with server
    setSlugStatus('checking');
    setSlugMessage('Checking availability...');

    try {
      const response = await fetch(`/api/check-slug?slug=${encodeURIComponent(slugToCheck)}`);
      const data = await response.json();

      if (data.available) {
        setSlugStatus('available');
        setSlugMessage('✓ Slug is available');
      } else {
        setSlugStatus('unavailable');
        setSlugMessage(data.reason || 'This slug is not available');
      }
    } catch (err) {
      logger.error('Error checking slug availability', err);
      setSlugStatus('invalid');
      setSlugMessage('Error checking availability');
    }
  }, []);

  // Debounced slug check
  useEffect(() => {
    if (slugCheckTimeout) {
      clearTimeout(slugCheckTimeout);
    }

    if (slug) {
      const timeout = setTimeout(() => {
        checkSlugAvailability(slug);
      }, 500); // Wait 500ms after user stops typing

      setSlugCheckTimeout(timeout);
    } else {
      setSlugStatus('idle');
      setSlugMessage('');
    }

    return () => {
      if (slugCheckTimeout) {
        clearTimeout(slugCheckTimeout);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManuallyEdited && name) {
      const autoSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/-+/g, "-") // Replace multiple hyphens with single
        .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
      setSlug(autoSlug);
    }
  }, [name, slugManuallyEdited]);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
    setSlugManuallyEdited(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("slug", slug);

    try {
      const result = await createOrganization(formData);
      if (result?.error) {
        setError(result.error);
      }
      // If no error, the server action will redirect
    } catch (err) {
      // NEXT_REDIRECT is thrown by redirect() and should not be treated as an error
      if (err instanceof Error && err.message === 'NEXT_REDIRECT') {
        throw err; // Re-throw to let Next.js handle the redirect
      }
      logger.error("Form submission error", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-bold">
            Create Organization
          </h2>
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
            <div className="relative">
              <input
                id="slug"
                name="slug"
                type="text"
                required
                placeholder="my-tour-company"
                value={slug}
                onChange={handleSlugChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-md pr-10 ${
                  slugStatus === 'available' ? 'border-green-500' :
                  slugStatus === 'unavailable' || slugStatus === 'invalid' ? 'border-red-500' :
                  'border-gray-300'
                }`}
              />
              {slugStatus === 'checking' && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />
              )}
              {slugStatus === 'available' && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
              )}
              {(slugStatus === 'unavailable' || slugStatus === 'invalid') && (
                <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Used in URLs: /{slug || "your-org"}/dashboard
            </p>
            {!slugManuallyEdited && (
              <p className="mt-1 text-xs text-blue-600">
                Auto-generated from organization name (you can edit this)
              </p>
            )}
            {slugMessage && (
              <p className={`mt-1 text-xs flex items-center gap-1 ${
                slugStatus === 'available' ? 'text-green-600' :
                slugStatus === 'unavailable' || slugStatus === 'invalid' ? 'text-red-600' :
                'text-gray-500'
              }`}>
                {slugStatus === 'checking' && <AlertCircle className="h-3 w-3" />}
                {slugMessage}
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
            disabled={isSubmitting || slugStatus !== 'available'}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? "Creating Organization..." : "Create Organization"}
          </button>
        </form>
      </div>
    </div>
  );
}
