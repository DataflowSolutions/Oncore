"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popup } from "@/components/ui/popup";
import { AlertCircle, CheckCircle } from "lucide-react";
import { createShow } from "@/lib/actions/shows";
import VenueFormFields from "@/components/advancing/VenueFormFields";
import { logger } from "@/lib/logger";
import { Textarea } from "@/components/ui/textarea";

interface CreateShowButtonProps {
  orgId: string;
}

export default function CreateShowButton({ orgId }: CreateShowButtonProps) {
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedVenue, setSelectedVenue] = useState<{
    id: string;
    name: string;
    city: string | null;
  } | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Add orgId to formData
      formData.append("orgId", orgId);
      await createShow(formData);
      setSuccess(true);

      // Close form after brief success message
      setTimeout(() => {
        setShowForm(false);
        setSuccess(false);
      }, 1500);
    } catch (error) {
      logger.error("Error creating show", error);
      setError(
        error instanceof Error ? error.message : "Failed to create show"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowForm(true)}
        size="lg"
        type="button"
        className="font-header cursor-pointer rounded-full"
      >
        Create Show
      </Button>

      <Popup
        open={showForm}
        onOpenChange={setShowForm}
        title="Create New Show"
        description="Add a new show to your schedule. Fill in the basic details below."
        className="sm:max-w-[600px]"
      >
        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-md bg-primary/10 border border-primary/20 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground">
              Show created successfully!
            </span>
          </div>
        )}

        <form action={handleSubmit} className="space-y-4">
          {/* Layout exactly as requested:
                Row 1: Show Name, Venue Name
                Row 2: City, Address  
                Row 3: Performance Date, Performance Time
                Row 4: Artist, Show Type
                Row 5: Crew Requirements */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Row 1: Show Name, Venue Name */}
            <div>
              <label
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="name"
              >
                Show Name *
              </label>
              <Input
                id="name"
                name="title"
                placeholder="Enter show name"
                required
              />
            </div>

            <VenueFormFields
              orgId={orgId}
              onVenueSelect={(venue) => setSelectedVenue(venue)}
            />

            {/* Row 3: Performance Date, Performance Time */}
            <div>
              <label
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="performance_date"
              >
                Performance Date *
              </label>
              <Input id="performance_date" name="date" type="date" required />
            </div>

            <div>
              <label
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="performance_time"
              >
                Performance Time *
              </label>
              <Input
                id="performance_time"
                name="setTime"
                type="time"
                required
              />
            </div>

            {/* Row 4: Artist, Show Type */}
            <div>
              <label
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="artist"
              >
                Artist *
              </label>
              <Input
                id="artist"
                name="artist"
                placeholder="Enter artist name"
                required
              />
            </div>

            <div>
              <label
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="show_type"
              >
                Show Type
              </label>
              <select
                id="show_type"
                name="showType"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="concert">Concert</option>
                <option value="festival">Festival</option>
                <option value="private">Private Event</option>
                <option value="acoustic">Acoustic</option>
              </select>
            </div>
          </div>

          {/* Row 5: Crew Requirements (full width) */}
          <div>
            <label
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor="crew_requirements"
            >
              Crew Requirements
            </label>
            <Textarea
              id="crew_requirements"
              name="notes"
              placeholder="Describe crew requirements and special notes..."
              className="flex w-full rounded-md border border-input bg-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? "Creating..." : "Create Show"}
            </Button>
          </div>
        </form>
      </Popup>
    </>
  );
}
