"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import { Popup } from "@/components/ui/popup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createVenue } from "@/lib/actions/venues";
import { toast } from "sonner";

interface AddVenueModalProps {
  orgId: string;
}

export function AddVenueModal({ orgId }: AddVenueModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
    capacity: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataObj = new FormData();
      formDataObj.append("name", formData.name);
      formDataObj.append("address", formData.address);
      formDataObj.append("city", formData.city);
      formDataObj.append("country", formData.country);
      formDataObj.append("org_id", orgId);

      if (formData.capacity) {
        formDataObj.append("capacity", formData.capacity);
      }

      const result = await createVenue(formDataObj);

      if (result.success) {
        toast.success("Venue added successfully");
        setOpen(false);
        setFormData({
          name: "",
          address: "",
          city: "",
          country: "",
          capacity: "",
        });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to add venue");
      }
    } catch (error) {
      logger.error("Error adding venue", error);
      toast.error("Failed to add venue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popup
      open={open}
      onOpenChange={setOpen}
      title="Add New Venue"
      description="Add a venue where shows can be performed"
      trigger={
        <Button className="rounded-full font-header gap-2">Add New</Button>
      }
      className="max-w-2xl"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading} onClick={handleSubmit}>
            {loading ? "Adding..." : "Add Venue"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Venue Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="The Apollo Theater"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder="New York"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                placeholder="United States"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              type="number"
              value={formData.capacity}
              onChange={(e) =>
                setFormData({ ...formData, capacity: e.target.value })
              }
              placeholder="1500"
              min="0"
            />
          </div>
        </div>
      </form>
    </Popup>
  );
}
