import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/SignupForm";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useSearchParams } from "react-router-dom";

export default function Signup() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  if (!loading && user) {
    return <Navigate to={redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard"} replace />;
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start your 14-day free trial"
    >
      <SignupForm />
    </AuthLayout>
  );
}
