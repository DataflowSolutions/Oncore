"use client";

import * as React from "react";
import { Settings } from "lucide-react";
import { ExpandingSearch } from "./ExpandingSearch";
// import { Notifications } from "./Notifications";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import Link from "next/link";
import { UserDropdownMenu } from "./UserDropdownMenu";

export function TopBar() {
  const [open, setOpen] = React.useState(false);
  const params = useParams();
  const orgSlug = params?.org as string;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 lg:px-8">
        {/* make parent relative so we can absolutely center the search */}
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end relative">
          {/* Expanding Search Component */}
          <ExpandingSearch open={open} onOpenChange={setOpen} />

          <div className="flex items-center gap-2">
            {/* <Notifications /> */}
            <UserDropdownMenu />
            <Button variant="ghost" size="icon" asChild title="Settings">
              <Link href={`/${orgSlug}/profile`}>
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
