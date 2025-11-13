import { AuthCard } from "@/components/auth/AuthCard";

export default function SignInPage() {
  return (
    <AuthCard
      formType="signin"
      title="Welcome back"
      description="Sign in to your account to continue"
      switchText="Don't have an account?"
      switchLinkText="Sign up"
      switchLinkHref="/sign-up"
    />
  );
}
