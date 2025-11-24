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
    <header className="sticky top-0 z-40 w-full bg-background max-w-[1440px] mx-auto ">
      <div className="flex h-16 items-center ">
        {/* Left spacing for mobile hamburger menu */}
        <div className="w-10 lg:w-0 shrink-0" />
        <Button className="rounded-full font-header text-xs cursor-not-allowed">
          Import Data
        </Button>
        {/* Center search area */}
        <div className="flex-1 flex items-center justify-center px-2 sm:px-4">
          <div className="w-full max-w-md lg:max-w-lg">
            <ExpandingSearch open={open} onOpenChange={setOpen} />
          </div>
        </div>

        {/* Right action buttons */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* <Notifications /> */}
          {/* PUT THE DROPDOWN HERE */}
          <UserDropdownMenu />
          <Button variant="ghost" size="icon" asChild title="Settings">
            <Link href={`/${orgSlug}/settings`}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
