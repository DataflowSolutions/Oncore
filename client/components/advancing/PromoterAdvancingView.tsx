"use client";

import { useState, useEffect } from "react";
import { DocumentsBox } from "./DocumentsBox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Building, Lightbulb, Briefcase, Trash2, Plus, Save, X } from "lucide-react";
import { updateAdvancingField, createAdvancingField } from "@/lib/actions/advancing";
import { logger } from "@/lib/logger";

interface PromoterAdvancingViewProps {
  orgSlug: string;
  sessionId: string;
  documents: Array<{
    id: string;
    label: string | null;
    party_type: "from_us" | "from_you";
    created_at: string;
    files: Array<{
      id: string;
      original_name: string | null;
      content_type: string | null;
      size_bytes: number | null;
      storage_path: string;
      created_at: string;
    }>;
  }>;
  existingFields?: Array<{
    id: string;
    field_name: string;
    value: string | null;
  }>;
}

interface SectionCardProps {
  title: string;
  placeholder: string;
  fieldName: string;
  orgSlug: string;
  sessionId: string;
  section: string;
  initialValue?: string;
  existingFieldId?: string;
}

interface Transfer {
  id: string;
  from: string;
  fromTime: string;
  to: string;
  toTime: string;
}

function SectionCard({ 
  title, 
  placeholder, 
  fieldName, 
  orgSlug, 
  sessionId, 
  section,
  initialValue = "",
  existingFieldId
}: SectionCardProps) {
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [fieldId, setFieldId] = useState(existingFieldId);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    setHasUnsavedChanges(newValue !== initialValue);
  };

  const handleSave = async () => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      if (fieldId) {
        // Update existing field
        const result = await updateAdvancingField(orgSlug, sessionId, fieldId, {
          value: value
        });
        if (result.success) {
          setHasUnsavedChanges(false);
          logger.debug("Field updated successfully");
        } else {
          logger.error("Failed to update field", result.error);
        }
      } else {
        // Create new field
        const result = await createAdvancingField(orgSlug, sessionId, {
          section: section,
          fieldName: fieldName,
          fieldType: "text",
          partyType: "from_you",
          value: value
        });
        if (result.success && result.data) {
          setFieldId(result.data.id);
          setHasUnsavedChanges(false);
          logger.debug("Field created successfully");
        } else {
          logger.error("Failed to create field", result.error);
        }
      }
    } catch (error) {
      logger.error("Error saving field", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(initialValue);
    setHasUnsavedChanges(false);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{title}</h4>
      </div>
      <Textarea
        value={value}
        onChange={(e) => handleValueChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[80px] text-sm"
      />
      {hasUnsavedChanges && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1"
          >
            <Save className="w-3 h-3" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="w-3 h-3" />
            Cancel
          </Button>
          <span className="text-xs text-yellow-400">Unsaved changes</span>
        </div>
      )}
    </div>
  );
}

function TransfersCard({ 
  orgSlug, 
  sessionId,
  initialTransfers = [],
  existingFieldId
}: { 
  orgSlug: string; 
  sessionId: string;
  initialTransfers?: Transfer[];
  existingFieldId?: string;
}) {
  const [transfers, setTransfers] = useState<Transfer[]>(
    initialTransfers.length > 0 
      ? initialTransfers 
      : [
          { id: "1", from: "", fromTime: "", to: "", toTime: "" },
          { id: "2", from: "", fromTime: "", to: "", toTime: "" },
          { id: "3", from: "", fromTime: "", to: "", toTime: "" },
          { id: "4", from: "", fromTime: "", to: "", toTime: "" },
        ]
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savedTransfersJson, setSavedTransfersJson] = useState(JSON.stringify(initialTransfers));
  const [fieldId, setFieldId] = useState(existingFieldId);

  const addTransfer = () => {
    const newTransfers = [...transfers, { id: Date.now().toString(), from: "", fromTime: "", to: "", toTime: "" }];
    setTransfers(newTransfers);
    setHasUnsavedChanges(true);
  };

  const removeTransfer = (id: string) => {
    const newTransfers = transfers.filter((t) => t.id !== id);
    setTransfers(newTransfers);
    setHasUnsavedChanges(true);
  };

  const updateTransfer = (id: string, field: keyof Transfer, value: string) => {
    const newTransfers = transfers.map((t) => (t.id === id ? { ...t, [field]: value } : t));
    setTransfers(newTransfers);
    
    // Check if there are actual changes
    const currentJson = JSON.stringify(newTransfers);
    setHasUnsavedChanges(currentJson !== savedTransfersJson);
  };

  const handleSave = async () => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      if (fieldId) {
        // Update existing field using the UUID
        const result = await updateAdvancingField(orgSlug, sessionId, fieldId, {
          value: JSON.stringify(transfers)
        });
        
        if (result.success) {
          setSavedTransfersJson(JSON.stringify(transfers));
          setHasUnsavedChanges(false);
          logger.debug("Transfers updated successfully");
        } else {
          logger.error("Failed to update transfers", result.error);
        }
      } else {
        // Create new field
        const createResult = await createAdvancingField(orgSlug, sessionId, {
          section: "Logistics",
          fieldName: "promoter_transfers",
          fieldType: "json",
          partyType: "from_you",
          value: JSON.stringify(transfers)
        });
        
        if (createResult.success && createResult.data) {
          setFieldId(createResult.data.id);
          setSavedTransfersJson(JSON.stringify(transfers));
          setHasUnsavedChanges(false);
          logger.debug("Transfers created successfully");
        } else {
          logger.error("Failed to create transfers", createResult.error);
        }
      }
    } catch (error) {
      logger.error("Error saving transfers", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTransfers(JSON.parse(savedTransfersJson));
    setHasUnsavedChanges(false);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3 w-full md:w-1/2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Transfers</h4>
      </div>
      <div className="space-y-3">
        {/* Header */}
        <div
          className="grid gap-3 items-center text-xs font-medium text-muted-foreground"
          style={{ gridTemplateColumns: "1fr 80px 1fr 80px 40px" }}
        >
          <span>From</span>
          <span>Time</span>
          <span>To</span>
          <span>Time</span>
          <span></span>
        </div>
        {/* Transfer rows */}
        {transfers.map((transfer) => (
          <div
            key={transfer.id}
            className="grid gap-3 items-center"
            style={{ gridTemplateColumns: "1fr 80px 1fr 80px 40px" }}
          >
            <Input
              placeholder="From"
              className="text-xs h-8"
              value={transfer.from}
              onChange={(e) => updateTransfer(transfer.id, "from", e.target.value)}
            />
            <Input
              placeholder="HH:MM"
              className="text-xs h-8"
              value={transfer.fromTime}
              onChange={(e) => updateTransfer(transfer.id, "fromTime", e.target.value)}
            />
            <Input
              placeholder="To"
              className="text-xs h-8"
              value={transfer.to}
              onChange={(e) => updateTransfer(transfer.id, "to", e.target.value)}
            />
            <Input
              placeholder="HH:MM"
              className="text-xs h-8"
              value={transfer.toTime}
              onChange={(e) => updateTransfer(transfer.id, "toTime", e.target.value)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive justify-self-center"
              onClick={() => removeTransfer(transfer.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" className="w-full text-xs h-8" onClick={addTransfer}>
          <Plus className="w-3 h-3 mr-1" />
          Add Transfer
        </Button>
      </div>
      {hasUnsavedChanges && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1"
          >
            <Save className="w-3 h-3" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="w-3 h-3" />
            Cancel
          </Button>
          <span className="text-xs text-yellow-400">Unsaved changes</span>
        </div>
      )}
    </div>
  );
}

export function PromoterAdvancingView({
  orgSlug,
  sessionId,
  documents,
  existingFields = [],
}: PromoterAdvancingViewProps) {
  // Helper function to get field value and ID by field name
  const getFieldData = (fieldName: string) => {
    const field = existingFields.find(f => f.field_name === fieldName);
    return {
      value: field?.value || "",
      id: field?.id
    };
  };

  // Parse transfers from JSON field
  const transfersField = existingFields.find(f => f.field_name === "promoter_transfers");
  let initialTransfers: Transfer[] = [];
  if (transfersField?.value) {
    try {
      initialTransfers = JSON.parse(transfersField.value as string);
    } catch {
      initialTransfers = [];
    }
  }

  return (
    <div className="space-y-6">
      {/* Documents Section */}
      <DocumentsBox
        sessionId={sessionId}
        orgSlug={orgSlug}
        partyType="from_you"
        documents={documents}
        title="Documents"
      />

      {/* Logistics Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <Building className="w-4 h-4" />
          Logistics
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard 
              title="Catering" 
              placeholder="General meals information"
              fieldName="promoter_catering"
              orgSlug={orgSlug}
              sessionId={sessionId}
              section="Logistics"
              {...getFieldData("promoter_catering")}
              initialValue={getFieldData("promoter_catering").value}
              existingFieldId={getFieldData("promoter_catering").id}
            />
            <SectionCard
              title="Accommodation Details"
              placeholder="Hotel details, address, confirmation"
              fieldName="promoter_accommodation"
              orgSlug={orgSlug}
              sessionId={sessionId}
              section="Logistics"
              {...getFieldData("promoter_accommodation")}
              initialValue={getFieldData("promoter_accommodation").value}
              existingFieldId={getFieldData("promoter_accommodation").id}
            />
          </div>
          <TransfersCard 
            orgSlug={orgSlug}
            sessionId={sessionId}
            initialTransfers={initialTransfers}
            existingFieldId={transfersField?.id}
          />
        </div>
      </div>

      {/* Venue & Production Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4" />
          Venue & Production
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SectionCard 
            title="Venue Capacity" 
            placeholder="Total capacity"
            fieldName="promoter_venue_capacity"
            orgSlug={orgSlug}
            sessionId={sessionId}
            section="Venue & Production"
            {...getFieldData("promoter_venue_capacity")}
            initialValue={getFieldData("promoter_venue_capacity").value}
            existingFieldId={getFieldData("promoter_venue_capacity").id}
          />
          <SectionCard 
            title="Soundcheck/Rehearsal" 
            placeholder="Schedule times"
            fieldName="promoter_soundcheck"
            orgSlug={orgSlug}
            sessionId={sessionId}
            section="Venue & Production"
            {...getFieldData("promoter_soundcheck")}
            initialValue={getFieldData("promoter_soundcheck").value}
            existingFieldId={getFieldData("promoter_soundcheck").id}
          />
          <SectionCard 
            title="Load-in/Load-out" 
            placeholder="Equipment schedule"
            fieldName="promoter_load_in_out"
            orgSlug={orgSlug}
            sessionId={sessionId}
            section="Venue & Production"
            {...getFieldData("promoter_load_in_out")}
            initialValue={getFieldData("promoter_load_in_out").value}
            existingFieldId={getFieldData("promoter_load_in_out").id}
          />
          <SectionCard 
            title="Set/Running Order" 
            placeholder="Performance schedule"
            fieldName="promoter_running_order"
            orgSlug={orgSlug}
            sessionId={sessionId}
            section="Venue & Production"
            {...getFieldData("promoter_running_order")}
            initialValue={getFieldData("promoter_running_order").value}
            existingFieldId={getFieldData("promoter_running_order").id}
          />
          <SectionCard
            title="Backstage Meals"
            placeholder="Show day vs standard catering"
            fieldName="promoter_backstage_meals"
            orgSlug={orgSlug}
            sessionId={sessionId}
            section="Venue & Production"
            {...getFieldData("promoter_backstage_meals")}
            initialValue={getFieldData("promoter_backstage_meals").value}
            existingFieldId={getFieldData("promoter_backstage_meals").id}
          />
          <SectionCard 
            title="Green Room Setup" 
            placeholder="Room arrangement details"
            fieldName="promoter_green_room"
            orgSlug={orgSlug}
            sessionId={sessionId}
            section="Venue & Production"
            {...getFieldData("promoter_green_room")}
            initialValue={getFieldData("promoter_green_room").value}
            existingFieldId={getFieldData("promoter_green_room").id}
          />
          <SectionCard 
            title="PA System & Monitors" 
            placeholder="System specifications"
            fieldName="promoter_pa_monitors"
            orgSlug={orgSlug}
            sessionId={sessionId}
            section="Venue & Production"
            {...getFieldData("promoter_pa_monitors")}
            initialValue={getFieldData("promoter_pa_monitors").value}
            existingFieldId={getFieldData("promoter_pa_monitors").id}
          />
          <SectionCard
            title="Lighting/Visuals/Pyro"
            placeholder="Equipment availability"
            fieldName="promoter_lighting"
            orgSlug={orgSlug}
            sessionId={sessionId}
            section="Venue & Production"
            {...getFieldData("promoter_lighting")}
            initialValue={getFieldData("promoter_lighting").value}
            existingFieldId={getFieldData("promoter_lighting").id}
          />
          <SectionCard
            title="Backline Availability"
            placeholder="Available instruments/equipment"
            fieldName="promoter_backline"
            orgSlug={orgSlug}
            sessionId={sessionId}
            section="Venue & Production"
            {...getFieldData("promoter_backline")}
            initialValue={getFieldData("promoter_backline").value}
            existingFieldId={getFieldData("promoter_backline").id}
          />
        </div>
      </div>

      {/* Business & Admin Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <Briefcase className="w-4 h-4" />
          Business & Admin
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SectionCard 
            title="Payment Status" 
            placeholder="Settlement details"
            fieldName="promoter_payment_status"
            orgSlug={orgSlug}
            sessionId={sessionId}
            section="Business & Admin"
            {...getFieldData("promoter_payment_status")}
            initialValue={getFieldData("promoter_payment_status").value}
            existingFieldId={getFieldData("promoter_payment_status").id}
          />
          <SectionCard
            title="Merchandising Policy"
            placeholder="Rates, cuts, seller, settlement time"
            fieldName="promoter_merchandising"
            orgSlug={orgSlug}
            sessionId={sessionId}
            section="Business & Admin"
            {...getFieldData("promoter_merchandising")}
            initialValue={getFieldData("promoter_merchandising").value}
            existingFieldId={getFieldData("promoter_merchandising").id}
          />
          <SectionCard
            title="Venue Contact Info"
            placeholder="Production, promoter rep, emergency contacts"
            fieldName="promoter_venue_contact"
            orgSlug={orgSlug}
            sessionId={sessionId}
            section="Business & Admin"
            {...getFieldData("promoter_venue_contact")}
            initialValue={getFieldData("promoter_venue_contact").value}
            existingFieldId={getFieldData("promoter_venue_contact").id}
          />
        </div>
      </div>
    </div>
  );
}
