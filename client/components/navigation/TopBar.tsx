"use client";

import * as React from "react";
import { Search, Settings, UserCircle } from "lucide-react";
import { CommandPalette } from "./CommandPalette";
// import { Notifications } from "./Notifications";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import Link from "next/link";

export function TopBar() {
  const [open, setOpen] = React.useState(false);
  const params = useParams();
  const orgSlug = params?.org as string;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 lg:px-8">
          {/* make parent relative so we can absolutely center the search */}
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end relative">
            {/* center this wrapper using absolute positioning; control width responsively */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-full sm:w-3/4 md:w-96 lg:w-[500px] max-w-2xl">
              <Button
                variant="outline"
                className="relative h-11 w-full justify-start text-sm text-muted-foreground sm:pr-12 cursor-text"
                onClick={() => setOpen(true)}
              >
                <Search className="mr-2 h-4 w-4" />
                <span className="hidden lg:inline-flex">Search anything</span>
                <span className="inline-flex lg:hidden">Search...</span>
                <kbd className="pointer-events-none absolute right-1.5 top-2.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {/* <Notifications /> */}
              <Button
                variant="ghost"
                size="icon"
                asChild
                title="Profile & Artist Filters"
              >
                <div className="cursor-not-allowed">
                  <UserCircle className="h-4 w-4" />
                </div>
              </Button>
              <Button variant="ghost" size="icon" asChild title="Settings">
                <Link href={`/${orgSlug}/profile`}>
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}
