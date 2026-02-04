import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function Login() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
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
