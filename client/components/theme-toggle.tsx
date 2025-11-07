"use client";
import { logger } from '@/lib/logger'

import * as React from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Loader2 } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled>
        <Loader2 className="h-[1.2rem] w-[1.2rem] animate-spin" />
        <span className="sr-only">Loading theme...</span>
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark" || theme === "dark";

  const handleToggle = () => {
    const newTheme = isDark ? "light" : "dark";
    logger.debug("`Theme toggle clicked", {
      currentTheme: theme,
      resolvedTheme,
      newTheme,
    });
    setTheme(newTheme);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="cursor-pointer"
        onClick={handleToggle}
        title={`Current: ${resolvedTheme || theme}. Click to switch to ${
          isDark ? "light" : "dark"
        } mode`}
      >
        {isDark ? (
          <Sun className="h-[1.2rem] w-[1.2rem] transition-all" />
        ) : (
          <Moon className="h-[1.2rem] w-[1.2rem] transition-all" />
        )}
        <span className="sr-only">
          {isDark ? "Switch to light mode" : "Switch to dark mode"}
        </span>
      </Button>
    </div>
  );
}
