"use client";
import { User } from "lucide-react";
import { SignOutButton } from "@/components/auth/SignOutButton";

interface UserHeaderProps {
  email: string;
}

export function UserHeader({ email }: UserHeaderProps) {
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

      <SignOutButton />
    </div>
  );
}
