import { logger } from '@/lib/logger'
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { User, LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface UserHeaderProps {
  email: string;
}

export function UserHeader({ email }: UserHeaderProps) {
  const [signingOut, setSigningOut] = useState(false);
  const supabase = createClient();

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      logger.error('Error signing out', error);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground">{email}</p>
        </div>
      </div>
      
      <Button 
        variant="outline" 
        onClick={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4 mr-2" />
        )}
        Sign Out
      </Button>
    </div>
  );
}
