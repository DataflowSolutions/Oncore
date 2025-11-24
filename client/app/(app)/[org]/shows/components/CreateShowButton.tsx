"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popup } from "@/components/ui/popup";
import { AlertCircle, CheckCircle } from "lucide-react";
import { createShow } from "@/lib/actions/shows";
import { logger } from "@/lib/logger";

interface CreateShowButtonProps {
  orgId: string;
}

export default function CreateShowButton({ orgId }: CreateShowButtonProps) {
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
              <Input
                id="artist"
                name="artist"
                placeholder="Enter artist name"
                required
              />
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
