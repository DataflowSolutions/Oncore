import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";

type FormType = "signin" | "signup";

interface AuthCardProps {
  formType: FormType;
  title: string;
  description: string;
  switchText: string;
  switchLinkText: string;
  switchLinkHref: string;
}

export function AuthCard({
  formType,
  title,
  description,
  switchText,
  switchLinkText,
  switchLinkHref,
}: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Link
        href="/"
        className="absolute top-8 left-8 text-sm text-foreground hover:text-foreground/80 transition-colors"
      >
        ← Back to home
      </Link>
      <div className="w-full max-w-md">
        <Card className="p-8">
          <div className="flex flex-col gap-6">
            <div className="flex gap-2">
              <Link
                href="/sign-in"
                className={`flex-1 py-2.5 text-center text-sm font-medium rounded-lg ${
                  formType === "signin"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                }`}
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className={`flex-1 py-2.5 text-center text-sm font-medium rounded-lg ${
                  formType === "signup"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                }`}
              >
                Sign Up
              </Link>
            </div>
            <h1 className="mx-auto text-xl font-bold font-header text-foreground hover:text-primary transition-colors lowercase">
              oncore
            </h1>
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-foreground">
                {title}
              </h2>
              <p className="text-muted-foreground text-sm">{description}</p>
            </div>

            {formType === "signin" ? <SignInForm /> : <SignUpForm />}

            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                {switchText}{" "}
                <Link
                  href={switchLinkHref}
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  {switchLinkText}
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
