import { useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AuthLayout
      title={isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
      subtitle={isLogin ? "Entre na sua conta para continuar" : "Comece sua jornada com o FastCRM"}
    >
      {isLogin ? <LoginForm /> : <SignupForm />}
    </AuthLayout>
  );
}
