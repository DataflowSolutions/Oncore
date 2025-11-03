"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { User, Building2 } from "lucide-react";

export function WelcomeHero() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md space-y-8">
        <div>
          <Building2 className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Welcome to Oncore
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Organize your shows, manage your team, and streamline your events.
          </p>
        </div>

        <div className="space-y-4">
          <Button asChild size="lg" className="w-full">
            <Link href="/sign-in">
              <User className="h-4 w-4 mr-2" />
              Sign In
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/sign-up">
              Sign Up
            </Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Start organizing your events with professional tools and team collaboration.
        </p>
      </div>
    </div>
  );
}
