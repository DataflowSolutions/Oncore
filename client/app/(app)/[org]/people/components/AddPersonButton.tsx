"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Music,
  Wrench,
  Briefcase,
  UserCheck,
} from "lucide-react";
import { createPerson } from "@/lib/actions/team";

interface AddPersonButtonProps {
  orgId: string;
}

type MemberType = "artist" | "crew" | "agent" | "manager";

const memberTypes = [
  { id: "artist", label: "Artist", icon: Music },
  { id: "crew", label: "Crew", icon: Wrench },
  { id: "agent", label: "Agent", icon: Briefcase },
  { id: "manager", label: "Manager", icon: UserCheck },
] as const;

export default function AddPersonButton({ orgId }: AddPersonButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedType, setSelectedType] = useState<MemberType>("artist");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);
      // Add the selected member type
      formData.set("memberType", selectedType);

      await createPerson(formData);
      setSuccess(true);

      // Reset form after success
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setSelectedType("artist");
        (event.target as HTMLFormElement).reset();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add person");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-foreground text-background hover:bg-foreground/90 font-header rounded-full"
      >
        Add New
      </Button>
    );
  }

  const selectedMemberType = memberTypes.find(
    (type) => type.id === selectedType
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background p-6 rounded-lg shadow-lg max-w-[600px] w-full mx-4 max-h-[90vh] overflow-y-auto border">
        {/* Header */}
        <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-6">
          <h2 className="font-semibold tracking-tight flex items-center gap-2 text-xl">
            <UserPlus className="h-5 w-5" />
            Add New Team Member
          </h2>
          <p className="text-sm text-muted-foreground">
            Create a new team member profile. Choose the type and fill in their
            details.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <p className="text-green-700 dark:text-green-300 text-sm">
              Team member added successfully!
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <input type="hidden" name="orgId" value={orgId} />

          {/* Member Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Member Type</label>
            <div className="grid grid-cols-4 gap-2">
              {memberTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type.id)}
                    disabled={isSubmitting || success}
                    className={`
                      p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105
                      ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-md"
                          : "border-border hover:border-primary/50"
                      }
                    `}
                  >
                    <Icon
                      className={`h-5 w-5 mx-auto mb-1 ${
                        isSelected ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <p
                      className={`text-xs font-medium ${
                        isSelected ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {type.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Full Name *
              </label>
              <Input
                name="name"
                required
                placeholder="Enter full name"
                disabled={isSubmitting || success}
                className="transition-all duration-200 focus:scale-[1.02]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Email Address
              </label>
              <Input
                name="email"
                type="email"
                placeholder="Enter email address"
                disabled={isSubmitting || success}
                className="transition-all duration-200 focus:scale-[1.02]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Phone Number
              </label>
              <Input
                name="phone"
                placeholder="Enter phone number"
                disabled={isSubmitting || success}
                className="transition-all duration-200 focus:scale-[1.02]"
              />
            </div>

            {/* Dynamic field based on member type */}
            <div className="space-y-2">
              {selectedType === "artist" && (
                <>
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Role Description
                  </label>
                  <Input
                    name="roleDescription"
                    placeholder="e.g., Lead Vocalist, Guitarist"
                    disabled={isSubmitting || success}
                    className="transition-all duration-200 focus:scale-[1.02]"
                  />
                </>
              )}

              {selectedType === "crew" && (
                <>
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Specialty
                  </label>
                  <Input
                    name="roleDescription"
                    placeholder="e.g., Sound Engineer, Lighting Technician"
                    disabled={isSubmitting || success}
                    className="transition-all duration-200 focus:scale-[1.02]"
                  />
                </>
              )}

              {selectedType === "agent" && (
                <>
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Agency Name
                  </label>
                  <Input
                    name="roleDescription"
                    placeholder="e.g., Elite Talent Agency"
                    disabled={isSubmitting || success}
                    className="transition-all duration-200 focus:scale-[1.02]"
                  />
                </>
              )}

              {selectedType === "manager" && (
                <>
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Experience (Years)
                  </label>
                  <Input
                    name="experience"
                    placeholder="Years of experience"
                    disabled={isSubmitting || success}
                    className="transition-all duration-200 focus:scale-[1.02]"
                  />
                </>
              )}
            </div>
          </div>

          {/* Experience field for crew members */}
          {selectedType === "crew" && (
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Experience (Years)
              </label>
              <Input
                name="experience"
                placeholder="Years of experience"
                disabled={isSubmitting || success}
                className="transition-all duration-200 focus:scale-[1.02]"
              />
            </div>
          )}

          {/* Bio/Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Bio / Notes
            </label>
            <textarea
              name="notes"
              placeholder="Additional information, skills, or notes..."
              disabled={isSubmitting || success}
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 focus:scale-[1.01] resize-none"
            />
          </div>

          {/* Adding As Badge */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            {selectedMemberType && (
              <selectedMemberType.icon className="h-4 w-4" />
            )}
            <span className="text-sm text-muted-foreground">Adding as:</span>
            <Badge className="bg-primary text-primary-foreground hover:bg-primary/80">
              {selectedMemberType?.label}
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || success}
              className="hover:scale-105 transition-transform"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Adding...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Added!
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Team Member
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
