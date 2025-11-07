"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

// Map Supabase sign-up errors to friendly messages
function getFriendlySignUpError(error: string): {
  message: string;
  type: "error" | "warning" | "success";
} {
  const errorLower = error.toLowerCase();

  if (errorLower.includes("password") && errorLower.includes("short")) {
    return {
      message: "Password must be at least 6 characters long.",
      type: "error",
    };
  }

  if (errorLower.includes("already") || errorLower.includes("exists")) {
    return {
      message:
        "An account with this email already exists. Please sign in instead.",
      type: "warning",
    };
  }

  if (errorLower.includes("rate limit") || errorLower.includes("too many")) {
    return {
      message:
        "Too many sign-up attempts. Please wait a few minutes before trying again.",
      type: "warning",
    };
  }

  if (errorLower.includes("invalid email") || errorLower.includes("email format")) {
    return {
      message: "Please enter a valid email address.",
      type: "error",
    };
  }

  return {
    message: "Unable to create account. Please try again.",
    type: "error",
  };
}

export function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusInfo, setStatusInfo] = useState<{
    message: string;
    type: "error" | "warning" | "success";
  } | null>(null);

  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusInfo(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setStatusInfo(getFriendlySignUpError(error.message));
      } else {
        setStatusInfo({
          message:
            "Success! Check your email for a confirmation link to complete your registration.",
          type: "success",
        });
      }
    } catch (err) {
      console.error("SignUp error:", err);
      setStatusInfo({
        message:
          "Network error. Please check your internet connection and try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form className="space-y-6" onSubmit={handleSignUp}>
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-sm font-medium text-foreground"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(e.target.value)
            }
            required
            placeholder="you@example.com"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium text-foreground"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
            required
            placeholder="••••••••"
            minLength={6}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Must be at least 6 characters
          </p>
        </div>

        {statusInfo && (
          <div
            className={`p-3 rounded-md text-sm border ${
              statusInfo.type === "success"
                ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                : statusInfo.type === "warning"
                ? "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
                : "bg-destructive/10 text-destructive border-destructive/20"
            }`}
          >
            <div className="flex gap-2">
              {statusInfo.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              )}
              <p>{statusInfo.message}</p>
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
          size="lg"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="animate-spin h-4 w-4" />
              Creating account...
            </span>
          ) : (
            "Sign Up"
          )}
        </Button>
      </form>
    </>
  );
}
