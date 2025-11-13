import { AuthCard } from "@/components/auth/AuthCard";

export default function SignUpPage() {
  return (
    <AuthCard
      formType="signup"
      title="Create account"
      description="Create your account to streamline your tours"
      switchText="Already have an account?"
      switchLinkText="Sign in"
      switchLinkHref="/sign-in"
    />
  );
}
