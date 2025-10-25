"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { CommandPalette } from "./CommandPalette";
import { Notifications } from "./Notifications";
import { Button } from "@/components/ui/button";

export function TopBar() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 lg:px-8">
          {/* make parent relative so we can absolutely center the search */}
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end relative">
            {/* center this wrapper using absolute positioning; control width responsively */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-full sm:w-3/4 md:w-80 lg:w-160">
              <Button
                variant="outline"
                className="relative h-10 w-full justify-start text-sm text-muted-foreground sm:pr-12 cursor-text"
                onClick={() => setOpen(true)}
              >
                <Search className="mr-2 h-4 w-4" />
                <span className="hidden lg:inline-flex">Search pages...</span>
                <span className="inline-flex lg:hidden">Search...</span>
                <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </div>
            <Notifications />
          </div>
        </div>
      </header>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}
