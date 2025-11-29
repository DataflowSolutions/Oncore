import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-10">Loading...</div>}>
      <AuthCard
        formType="signin"
        title="Welcome back"
        description="Sign in to your account to continue"
        switchText="Don't have an account?"
        switchLinkText="Sign up"
        switchLinkHref="/sign-up"
      />
    </Suspense>
  );
}
