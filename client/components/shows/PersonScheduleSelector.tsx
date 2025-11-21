"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

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

  return (
    <div className="space-y-2">
      {selectedPeople.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedPeople.map((person) => (
            <Badge
              key={person.id}
              variant="secondary"
              className="flex items-center gap-1 pl-2 pr-1 py-0.5 text-[11px] h-6 bg-neutral-800/50 border-neutral-700/50"
            >
              <span className="font-medium">{person.name}</span>
              {person.duty && (
                <span className="text-neutral-500">• {person.duty}</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleRemovePerson(person.id)}
              >
                <X className="h-2.5 w-2.5" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
      {availablePeople.length === 0 && (
        <span className="text-[10px] text-neutral-600">
          No team members available.{" "}
          <Link
            href="./team"
            className="text-blue-500 hover:text-blue-400 transition-colors"
          >
            Add team members
          </Link>
        </span>
      )}
    </div>
  );
}
