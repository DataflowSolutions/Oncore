"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Person {
  id: string;
  name: string;
  duty: string | null;
}

interface PersonScheduleSelectorProps {
  availablePeople: Person[];
  selectedPeopleIds: string[];
}

export function PersonScheduleSelector({
  availablePeople,
  selectedPeopleIds,
}: PersonScheduleSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleAddPerson = (personId: string) => {
    if (selectedPeopleIds.includes(personId)) return;

    const newSelectedIds = [...selectedPeopleIds, personId];
    const params = new URLSearchParams(searchParams);
    params.set("people", newSelectedIds.join(","));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleRemovePerson = (personId: string) => {
    const newSelectedIds = selectedPeopleIds.filter((id) => id !== personId);
    const params = new URLSearchParams(searchParams);

    if (newSelectedIds.length === 0) {
      params.delete("people");
    } else {
      params.set("people", newSelectedIds.join(","));
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const selectedPeople = availablePeople.filter((p) =>
    selectedPeopleIds.includes(p.id)
  );

  const availableToAdd = availablePeople.filter(
    (p) => !selectedPeopleIds.includes(p.id)
  );

  return (
    <div className="">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {selectedPeople.map((person) => (
            <Badge
              key={person.id}
              variant="secondary"
              className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1"
            >
              <span className="text-xs font-medium">{person.name}</span>
              {person.duty && (
                <span className="text-xs text-neutral-500">
                  • {person.duty}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent ml-1"
                onClick={() => handleRemovePerson(person.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Add person selector */}
      {availableToAdd.length > 0 && (
        <Select onValueChange={handleAddPerson}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="+ Add person to schedule" />
          </SelectTrigger>
          <SelectContent>
            {availableToAdd.map((person) => (
              <SelectItem key={person.id} value={person.id}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{person.name}</span>
                  {person.duty && (
                    <span className="text-xs text-neutral-500">
                      ({person.duty})
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {availableToAdd.length === 0 && availablePeople.length > 0 && (
        <span className="text-xs text-neutral-500">
          All team members selected
        </span>
      )}

      {availablePeople.length === 0 && (
        <span className="text-xs text-neutral-500">
          No team members available
        </span>
      )}
    </div>
  );
}
