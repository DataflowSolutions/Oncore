"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import { Popup } from "@/components/ui/popup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPromoter } from "@/lib/actions/promoters";
import { toast } from "sonner";

interface AddPromoterModalProps {
  orgId: string;
}

export function AddPromoterModal({ orgId }: AddPromoterModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    city: "",
    country: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createPromoter({
        orgId,
        status: "active",
        contact_type: "promoter",
        ...formData,
      });

      if (result.success) {
        toast.success("Promoter added successfully");
        setOpen(false);
        setFormData({
          name: "",
          email: "",
          phone: "",
          company: "",
          city: "",
          country: "",
          notes: "",
        });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to add promoter");
      }
    } catch (error) {
      logger.error("Error adding promoter", error);
      toast.error("Failed to add promoter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popup
      open={open}
      onOpenChange={setOpen}
      title="Add New Promoter"
      description="Add a promoter who manages venues in specific regions"
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
            {loading ? "Adding..." : "Add Promoter"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="john@company.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+1 234 567 8900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
                placeholder="Company Name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City/Region</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder="Mumbai, Berlin, etc."
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
                placeholder="India, Germany, etc."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Additional information about this promoter..."
              rows={3}
            />
          </div>
        </div>
      </form>
    </Popup>
  );
}
