"use client";
import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { tabLinks } from "../constants/showviewlinks";
import { cn } from "@/lib/utils";

const ShowViewToggler = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("view") || "list";

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", tabId);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div>
      <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted">
        {tabLinks.map((link) => {
          const Icon = link.icon;
          const isActive = activeTab === link.id;

          return (
            <Button
              key={link.id}
              onClick={() => handleTabChange(link.id)}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className={cn(
                "gap-2 cursor-pointer transition-all",
                !isActive && "hover:bg-background/50"
              )}
            >
              {Icon && <Icon size={16} />}
              <span>{link.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default ShowViewToggler;
