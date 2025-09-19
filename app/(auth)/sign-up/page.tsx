import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Card className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Sign Up</h2>
            <p className="text-muted-foreground text-sm">
              Create a new account
            </p>
          </div>

          <SignUpForm />

          <div className="text-center mt-6 space-y-2">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="text-primary hover:text-primary/80 transition-colors"
              >
                Sign in
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
