import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

const schema = z.object({
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(1, "Password é obrigatória"),
});

export default function PortalLoginPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Email ou password incorretos" : error.message);
      return;
    }

    navigate(`/careers/${workspaceSlug}/dashboard`);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Helmet>
        <title>Login Empresa — Portal</title>
      </Helmet>
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <LogIn className="h-10 w-10 mx-auto text-primary mb-2" />
          <CardTitle>Login Empresa</CardTitle>
          <p className="text-sm text-muted-foreground">Aceda ao seu painel para gerir vagas</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" {...form.register("email")} placeholder="empresa@email.com" />
              {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Password</Label>
              <Input type="password" {...form.register("password")} />
              {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A entrar...</> : "Entrar"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Não tem conta?{" "}
              <Link to={`/careers/${workspaceSlug}/register`} className="text-primary hover:underline">Registar empresa</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
