import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popup } from "@/components/ui/popup";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";

interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  location?: string;
  type: "arrival" | "departure" | "show" | "venue" | "schedule";
  personId?: string;
  personName?: string;
  endTime?: string;
  notes?: string;
}

interface FormData {
  title: string;
  date: string;
  starts_at: string;
  ends_at: string;
  location: string;
  notes: string;
}

interface ScheduleEventDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: ScheduleItem | null;
  formData: FormData;
  onFormDataChange: (data: FormData) => void;
  onSubmit: () => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
}

export function ScheduleEventDialog({
  isOpen,
  onOpenChange,
  editingItem,
  formData,
  onFormDataChange,
  onSubmit,
  onDelete,
}: ScheduleEventDialogProps) {
  return (
    <Popup
      title={editingItem ? "Edit Schedule Event" : "Add Schedule Event"}
      open={isOpen}
      onOpenChange={onOpenChange}
      className="sm:max-w-[720px]"
      trigger={
        <Button className="h-7 rounded-full px-5 text-xs bg-button-bg font-bold">
          Add
        </Button>
      }
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await onSubmit();
        }}
        className="space-y-6"
      >
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Name</label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  title: e.target.value,
                })
              }
              placeholder="Enter your name"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Location
            </label>
            <Input
              type="text"
              value={formData.location}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  location: e.target.value,
                })
              }
              placeholder="Enter your location"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Start Time
            </label>
            <Input
              type="time"
              value={formData.starts_at}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  starts_at: e.target.value,
                })
              }
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">
              Going somewhere? Add destination
            </label>
            <input type="checkbox" className="w-4 h-4" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Name</label>
            <Input type="text" placeholder="Enter your name" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Location
            </label>
            <Input type="text" placeholder="Enter your location" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              End Time
            </label>
            <Input
              type="time"
              value={formData.ends_at}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  ends_at: e.target.value,
                })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Notes</label>
          <Textarea
            value={formData.notes}
            onChange={(e) =>
              onFormDataChange({
                ...formData,
                notes: e.target.value,
              })
            }
            placeholder="Write notes..."
            className="w-full min-h-[120px] p-3 rounded-md bg-card-cell border border-card-cell-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex gap-2 justify-end">
          {editingItem && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={async () => {
                if (confirm("Delete this schedule item?")) {
                  await onDelete(editingItem.id);
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          )}
          <Button type="submit" size="sm">
            {editingItem ? "Save Changes" : "Add Activity"}
          </Button>
        </div>
      </form>
    </Popup>
  );
}
