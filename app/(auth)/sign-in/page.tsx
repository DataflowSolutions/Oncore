import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Card className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Sign In</h2>
            <p className="text-muted-foreground text-sm">
              Sign in to your account
            </p>
          </div>

          <SignInForm />

          <div className="text-center mt-6 space-y-2">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="text-primary hover:text-primary/80 transition-colors"
              >
                Sign up
              </Link>
            </p>
            <Link
              href="/"
              className="block text-sm text-foreground hover:text-foreground/80 transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
