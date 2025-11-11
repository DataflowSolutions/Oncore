"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getGroupedNavigationItems } from "@/lib/constants/navigation";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params?.org as string;

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const runCommand = React.useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange]
  );

  // Define navigation items based on the org context
  const navigationItems = React.useMemo(() => {
    if (!orgSlug) return [];

    const groups = getGroupedNavigationItems(orgSlug);

    return groups.map((group) => ({
      group: group.group,
      items: group.items.map((item) => ({
        icon: item.icon,
        label: item.label,
        action: () => router.push(item.href),
      })),
    }));
  }, [orgSlug, router]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search anything" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {navigationItems.map((group) => (
          <CommandGroup key={group.group} heading={group.group}>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.label}
                  onSelect={() => runCommand(item.action)}
                  className="cursor-pointer"
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
