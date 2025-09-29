"use client";
import React, { useState } from "react";
import { tabLinks } from "../constants/showviewlinks";

const ShowViewToggler = () => {
  const [activeTab, setActiveTab] = useState("list");

  return (
    <div
      className="inline-flex items-center p-1 rounded-lg"
      style={{ backgroundColor: "var(--tab-bg)" }}
    >
      {tabLinks.map((link) => {
        const Icon = link.icon;
        const isActive = activeTab === link.id;

        return (
          <div
            key={link.id}
            onClick={() => setActiveTab(link.id)}
            className={`
              flex cursor-pointer items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 
              ${
                isActive
                  ? "text-[var(--background)]"
                  : "text-white hover:text-gray-300"
              }
            `}
            style={{
              backgroundColor: isActive ? "white" : "transparent",
            }}
          >
            {Icon && <Icon size={16} />}
            <span className="text-sm font-normal">{link.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default ShowViewToggler;
