import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  badge,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4", className)}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{title}</h1>
          {badge && <div>{badge}</div>}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}

interface PageHeaderMetaProps {
  items: Array<{
    icon: React.ReactNode;
    text: string;
  }>;
  className?: string;
}

export function PageHeaderMeta({ items, className }: PageHeaderMetaProps) {
  return (
    <div className={cn("flex items-center gap-4 text-sm text-muted-foreground flex-wrap", className)}>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          {item.icon}
          {item.text}
        </span>
      ))}
    </div>
  );
}
