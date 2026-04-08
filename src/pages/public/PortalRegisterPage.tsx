import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePublicWorkspace } from "@/hooks/hr/usePublicJobs";
import { useRegisterPortalCompany } from "@/hooks/hr/usePortalCompany";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, CheckCircle } from "lucide-react";
import { Helmet } from "react-helmet-async";

const schema = z.object({
  name: z.string().trim().min(2, "Nome da empresa é obrigatório").max(200),
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
  phone: z.string().max(20).optional(),
  website: z.string().url("URL inválido").max(500).optional().or(z.literal("")),
  nif: z.string().max(20).optional(),
  sector: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function PortalRegisterPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { data: workspace } = usePublicWorkspace(workspaceSlug);
  const register = useRegisterPortalCompany();
  const [done, setDone] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", phone: "", website: "", nif: "", sector: "", location: "" },
  });

  const onSubmit = async (values: FormValues) => {
    if (!workspace) return;
    await register.mutateAsync({
      workspace_id: workspace.id,
      name: values.name,
      email: values.email,
      password: values.password,
      phone: values.phone,
      website: values.website,
      nif: values.nif,
      sector: values.sector,
      location: values.location,
    });
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h3 className="text-xl font-semibold">Conta Criada!</h3>
            <p className="text-muted-foreground">
              Verifique o seu email para confirmar a conta. Após confirmação, poderá fazer login e publicar vagas.
            </p>
            <Link to={`/careers/${workspaceSlug}/login`}>
              <Button className="mt-4">Ir para Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Helmet>
        <title>Registar Empresa — {workspace?.company_name || workspace?.name || "Portal"}</title>
      </Helmet>
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <Building2 className="h-10 w-10 mx-auto text-primary mb-2" />
          <CardTitle>Registar Empresa</CardTitle>
          <p className="text-sm text-muted-foreground">Crie uma conta para publicar vagas no portal</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nome da Empresa *</Label>
                <Input {...form.register("name")} placeholder="Empresa Lda." />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>NIF</Label>
                <Input {...form.register("nif")} placeholder="123456789" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" {...form.register("email")} placeholder="empresa@email.com" />
              {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Password *</Label>
              <Input type="password" autoComplete="new-password" {...form.register("password")} placeholder="Mínimo 8 caracteres" />
              {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input {...form.register("phone")} placeholder="+351 912 345 678" />
              </div>
              <div className="space-y-1">
                <Label>Sector</Label>
                <Input {...form.register("sector")} placeholder="Tecnologia" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Website</Label>
              <Input {...form.register("website")} placeholder="https://empresa.pt" />
              {form.formState.errors.website && <p className="text-xs text-destructive">{form.formState.errors.website.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Localização</Label>
              <Input {...form.register("location")} placeholder="Lisboa, Portugal" />
            </div>

            <Button type="submit" className="w-full" disabled={register.isPending}>
              {register.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A registar...</> : "Registar Empresa"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link to={`/careers/${workspaceSlug}/login`} className="text-primary hover:underline">Entrar</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
