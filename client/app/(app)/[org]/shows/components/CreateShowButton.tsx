"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popup } from "@/components/ui/popup";
import { createShow } from "@/lib/actions/shows";
import { logger } from "@/lib/logger";
import { ArtistSelector } from "@/components/shows/ArtistSelector";
import { toast } from "sonner";

interface CreateShowButtonProps {
  orgId: string;
  orgSlug: string;
}

export default function CreateShowButton({
  orgId,
  orgSlug,
}: CreateShowButtonProps) {
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArtistId, setSelectedArtistId] = useState<string>("");
  const [selectedArtistName, setSelectedArtistName] = useState<string>("");

  const handleArtistChange = (artistId: string, artistName: string) => {
    setSelectedArtistId(artistId);
    setSelectedArtistName(artistName);
  };

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);

    try {
      // Add orgId to formData
      formData.append("orgId", orgId);

      // Get the city value and use it for both venue name and city
      const city = formData.get("city") as string;
      if (city) {
        formData.append("venueCity", city);
        formData.append("venueName", city);
      }

      // Add selected artist ID if one was selected
      if (selectedArtistId) {
        formData.append("artistId", selectedArtistId);
      }

      await createShow(formData);
      toast.success("Show created successfully!");

      // Reset artist selection
      setSelectedArtistId("");
      setSelectedArtistName("");

      // Close form after brief delay
      setTimeout(() => {
        setShowForm(false);
      }, 500);
    } catch (error) {
      logger.error("Error creating show", error);
      toast.error(
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
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* Show Name */}
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

            {/* City */}
            <div>
              <label
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="city"
              >
                City *
              </label>
              <Input id="city" name="city" placeholder="Enter city" required />
            </div>

            {/* Performance Date */}
            <div>
              <label
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="performance_date"
              >
                Performance Date *
              </label>
              <Input id="performance_date" name="date" type="date" required />
            </div>

            {/* Artist */}
            <div>
              <label
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="artist"
              >
                Artist *
              </label>
              <ArtistSelector
                orgSlug={orgSlug}
                orgId={orgId}
                value={selectedArtistId}
                onValueChange={handleArtistChange}
                placeholder="Search or create an artist..."
                disabled={isLoading}
              />
              {selectedArtistId && (
                <p className="text-xs text-muted-foreground mt-1">
                  Selected: {selectedArtistName}
                </p>
              )}
            </div>
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
