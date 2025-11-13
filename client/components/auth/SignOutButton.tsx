"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

interface SignOutButtonProps {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showIcon?: boolean;
}

export function SignOutButton({
  variant = "outline",
  size = "default",
  className,
  showIcon = true,
}: SignOutButtonProps) {
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (error) {
      logger.error("Error signing out", error);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSignOut}
      disabled={signingOut}
      className={className}
    >
      {signingOut ? (
        <Loader2
          className={
            showIcon ? "mr-2 h-4 w-4 animate-spin" : "h-4 w-4 animate-spin"
          }
        />
      ) : (
        showIcon && <LogOut className="mr-2 h-4 w-4" />
      )}
      <span>Sign Out</span>
    </Button>
  );
}
