"use client";
import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { tabLinks } from "../constants/venueviewlinks";
import { cn } from "@/lib/utils";

const VenueViewToggler = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("view") || "venues";

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", tabId);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div>
      <div className="inline-flex items-center rounded-full bg-tab-bg">
        {tabLinks.map((link) => {
          const isActive = activeTab === link.id;

          return (
            <Button
              key={link.id}
              onClick={() => handleTabChange(link.id)}
              size="sm"
              className={cn(
                "gap-2 rounded-full cursor-pointer transition-all text-tab-text px-8 py-5 font-header",
                isActive
                  ? "bg-tab-bg-active hover:bg-tab-bg-active/50 "
                  : "bg-transparent hover:bg-tab-bg-active/50"
              )}
            >
              <span>{link.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default VenueViewToggler;
