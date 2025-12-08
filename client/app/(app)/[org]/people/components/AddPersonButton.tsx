"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popup } from "@/components/ui/popup";
import {
  Plus,
  CheckCircle,
  AlertCircle,
  Music,
  Wrench,
  Briefcase,
  UserCheck,
} from "lucide-react";
import { createPerson } from "@/lib/actions/team";
import { Textarea } from "@/components/ui/textarea";

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

  const selectedMemberType = memberTypes.find(
    (type) => type.id === selectedType
  );

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-foreground text-background hover:bg-foreground/90 font-header rounded-full"
      >
        Add New
      </Button>

      <Popup
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Add New Team Member"
        description="Create a new team member profile. Choose the type and fill in their details."
        className="sm:max-w-[600px]"
      >
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
                      p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 cursor-pointer
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
            </div>
          </div>

          {/* Bio/Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Bio / Notes
            </label>
            <Textarea
              name="notes"
              placeholder="Additional information, skills, or notes..."
              disabled={isSubmitting || success}
              rows={3}
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
      </Popup>
    </>
  );
}
