import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useSearchParams } from "react-router-dom";

export default function Login() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  if (!loading && user) {
    return <Navigate to={redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard"} replace />;
  }

  return (
    <AuthLayout
      title="Bem-vindo de volta"
      subtitle="Inicie sessão na sua conta para continuar"
    >
      <LoginForm />
    </AuthLayout>
  );
}
