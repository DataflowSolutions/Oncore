"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { tabLinks } from "../constants/showviewlinks";
import { cn } from "@/lib/utils";

const ShowViewToggler = () => {
  const [activeTab, setActiveTab] = useState("list");

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted">
      {tabLinks.map((link) => {
        const Icon = link.icon;
        const isActive = activeTab === link.id;

        return (
          <Button
            key={link.id}
            onClick={() => setActiveTab(link.id)}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            className={cn(
              "gap-2 transition-all",
              !isActive && "hover:bg-background/50"
            )}
          >
            {Icon && <Icon size={16} />}
            <span>{link.label}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default ShowViewToggler;
