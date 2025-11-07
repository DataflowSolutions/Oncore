"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";

// Map Supabase errors to friendly messages
function getFriendlyErrorMessage(error: string): {
  message: string;
  type: "error" | "warning" | "info";
  showSupport?: boolean;
} {
  const errorLower = error.toLowerCase();

  // Rate limiting / lockout (multiple variations)
  if (
    errorLower.includes("rate limit") ||
    errorLower.includes("too many") ||
    errorLower.includes("429") ||
    errorLower.includes("try again later") ||
    errorLower.includes("temporarily blocked")
  ) {
    return {
      message:
        "Too many sign-in attempts. Please wait a few minutes before trying again.",
      type: "warning",
    };
  }

  // Email not confirmed
  if (
    errorLower.includes("email not confirmed") ||
    errorLower.includes("confirm your email")
  ) {
    return {
      message:
        "Please check your email and click the confirmation link before signing in.",
      type: "info",
    };
  }

  // Invalid credentials (Supabase returns this)
  if (
    errorLower.includes("invalid login credentials") ||
    errorLower.includes("invalid credentials") ||
    errorLower.includes("email not found") ||
    errorLower.includes("invalid password")
  ) {
    return {
      message:
        "The email or password you entered is incorrect. Please double-check and try again.",
      type: "error",
    };
  }

  // Generic invalid/incorrect/wrong
  if (
    errorLower.includes("invalid") ||
    errorLower.includes("incorrect") ||
    errorLower.includes("wrong")
  ) {
    return {
      message:
        "Something isn't right with your email or password. Please try again.",
      type: "error",
    };
  }

  // User not found
  if (
    errorLower.includes("user not found") ||
    errorLower.includes("not registered") ||
    errorLower.includes("no user")
  ) {
    return {
      message: "No account found with this email. Would you like to sign up?",
      type: "info",
    };
  }

  // Account locked/suspended
  if (
    errorLower.includes("locked") ||
    errorLower.includes("disabled") ||
    errorLower.includes("suspended") ||
    errorLower.includes("banned")
  ) {
    return {
      message:
        "Your account has been locked for security reasons. Please contact support.",
      type: "error",
      showSupport: true,
    };
  }

  // Network/connection errors
  if (
    errorLower.includes("network") ||
    errorLower.includes("fetch") ||
    errorLower.includes("timeout") ||
    errorLower.includes("connection") ||
    errorLower.includes("offline")
  ) {
    return {
      message:
        "Network error. Please check your internet connection and try again.",
      type: "error",
    };
  }

  // Server errors (500, 502, 503, etc.)
  if (
    errorLower.includes("server error") ||
    errorLower.includes("500") ||
    errorLower.includes("502") ||
    errorLower.includes("503") ||
    errorLower.includes("internal error")
  ) {
    return {
      message:
        "Our servers are experiencing issues. Please try again in a few moments.",
      type: "error",
    };
  }

  // Default fallback - show part of the original error for debugging
  return {
    message:
      "Unable to sign in. Please check your email and password and try again.",
    type: "error",
  };
}

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{
    message: string;
    type: "error" | "warning" | "info";
    showSupport?: boolean;
  } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = createClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorInfo(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorInfo(getFriendlyErrorMessage(error.message));
      setLoading(false);
    } else if (data.user) {
      // Check for redirect parameter first
      const redirect = searchParams.get("redirect");
      
      if (redirect) {
        // Redirect to the specified path
        router.push(redirect);
        router.refresh();
        return;
      }

      // Get user's organization(s) and redirect to their dashboard
      const { data: orgData, error: orgError } = await supabase
        .from("org_members")
        .select(
          `
          role,
          organizations (
            slug
          )
        `
        )
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      // Redirect to user's org dashboard if available, otherwise create-org page
      if (!orgError && orgData?.organizations && "slug" in orgData.organizations) {
        router.push(`/${orgData.organizations.slug}`);
      } else {
        // User has no org yet - redirect to create-org page
        router.push("/create-org");
      }
      
      // Note: We don't setLoading(false) here because we're navigating away
      router.refresh();
    } else {
      setLoading(false);
    }
  };

  return (
    <>
      <form className="space-y-6" onSubmit={handleSignIn}>
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
            disabled={loading}
          />
        </div>

        {errorInfo && (
          <div
            className={`p-3 rounded-md text-sm border ${
              errorInfo.type === "error"
                ? "bg-destructive/10 text-destructive border-destructive/20"
                : errorInfo.type === "warning"
                ? "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
                : "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
            }`}
          >
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p>{errorInfo.message}</p>
                {errorInfo.showSupport && (
                  <p className="mt-2 text-xs opacity-80">
                    Contact support: support@oncore.app
                  </p>
                )}
              </div>
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
              Signing in...
            </span>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>
    </>
  );
}
