"use client";

import * as React from "react";
import { Settings, Menu } from "lucide-react";
import { ExpandingSearch } from "./ExpandingSearch";
// import { Notifications } from "./Notifications";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import Link from "next/link";
import { UserDropdownMenu } from "./UserDropdownMenu";
import { ArtistFilterDropdown } from "./ArtistFilterDropdown";
import { useSidebarStore } from "@/lib/stores/sidebar-store";

export function TopBar() {
  const [open, setOpen] = React.useState(false);
  const params = useParams();
  const orgSlug = params?.org as string;
  const { toggle } = useSidebarStore();

  return (
    <header className="sticky top-0 z-40 w-full bg-background lg:pl-64">
      <div className="flex h-16 items-center px-4   max-w-[1440px] mx-auto gap-2 sm:gap-4">
        {/* Mobile hamburger menu */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          onClick={toggle}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Import Data button - hidden on mobile */}
        <Button className="hidden sm:flex rounded-full font-header text-xs cursor-not-allowed shrink-0">
          Import Data
        </Button>

        {/* Center search area */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md lg:max-w-lg">
            <ExpandingSearch open={open} onOpenChange={setOpen} />
          </div>
        </div>

        {/* Right action buttons - visible on desktop */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          {/* <Notifications /> */}
          <ArtistFilterDropdown />
          <UserDropdownMenu />
          <Button variant="ghost" size="icon" asChild title="Settings">
            <Link href={`/${orgSlug}/settings`}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Mobile right actions - minimal set */}
        <div className="flex lg:hidden items-center gap-1 shrink-0">
          <UserDropdownMenu />
        </div>
      </div>
    </header>
  );
}
