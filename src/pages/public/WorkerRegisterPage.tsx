import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePublicWorkspace } from "@/hooks/hr/usePublicJobs";
import { useRegisterPortalWorker } from "@/hooks/hr/usePortalWorker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, User, CheckCircle } from "lucide-react";
import { Helmet } from "react-helmet-async";

const schema = z.object({
  first_name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  last_name: z.string().trim().min(1, "Apelido é obrigatório").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
  phone: z.string().max(20).optional(),
  location: z.string().max(200).optional(),
  sector: z.string().max(100).optional(),
  experience_years: z.coerce.number().min(0).max(50).optional(),
  education: z.string().max(500).optional(),
  bio: z.string().max(2000).optional(),
  linkedin_url: z.string().url("URL inválido").max(500).optional().or(z.literal("")),
  skills: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function WorkerRegisterPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { data: workspace } = usePublicWorkspace(workspaceSlug);
  const register = useRegisterPortalWorker();
  const [done, setDone] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "", last_name: "", email: "", password: "", phone: "",
      location: "", sector: "", experience_years: 0, education: "", bio: "",
      linkedin_url: "", skills: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!workspace) return;
    const skillsArr = values.skills
      ? values.skills.split(",").map(s => s.trim()).filter(Boolean)
      : [];
    await register.mutateAsync({
      workspace_id: workspace.id,
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      password: values.password,
      phone: values.phone,
      location: values.location,
      sector: values.sector,
      skills: skillsArr,
      experience_years: values.experience_years,
      education: values.education,
      bio: values.bio,
      linkedin_url: values.linkedin_url,
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
              Verifique o seu email para confirmar a conta. Após confirmação, poderá fazer login e publicar a sua disponibilidade.
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
        <title>Registar Trabalhador — {workspace?.company_name || workspace?.name || "Portal"}</title>
      </Helmet>
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <User className="h-10 w-10 mx-auto text-primary mb-2" />
          <CardTitle>Registar como Trabalhador</CardTitle>
          <p className="text-sm text-muted-foreground">Crie o seu perfil profissional e publique a sua disponibilidade</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input {...form.register("first_name")} placeholder="João" />
                {form.formState.errors.first_name && <p className="text-xs text-destructive">{form.formState.errors.first_name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Apelido *</Label>
                <Input {...form.register("last_name")} placeholder="Silva" />
                {form.formState.errors.last_name && <p className="text-xs text-destructive">{form.formState.errors.last_name.message}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" {...form.register("email")} placeholder="joao@email.com" />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Localização</Label>
                <Input {...form.register("location")} placeholder="Lisboa, Portugal" />
              </div>
              <div className="space-y-1">
                <Label>Anos de experiência</Label>
                <Input type="number" {...form.register("experience_years")} placeholder="5" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Competências</Label>
              <Input {...form.register("skills")} placeholder="React, Node.js, Python (separadas por vírgula)" />
            </div>

            <div className="space-y-1">
              <Label>Formação</Label>
              <Input {...form.register("education")} placeholder="Licenciatura em Eng. Informática" />
            </div>

            <div className="space-y-1">
              <Label>LinkedIn</Label>
              <Input {...form.register("linkedin_url")} placeholder="https://linkedin.com/in/joaosilva" />
              {form.formState.errors.linkedin_url && <p className="text-xs text-destructive">{form.formState.errors.linkedin_url.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Sobre mim</Label>
              <Textarea {...form.register("bio")} rows={3} placeholder="Breve descrição profissional..." />
            </div>

            <Button type="submit" className="w-full" disabled={register.isPending}>
              {register.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A registar...</> : "Criar Perfil"}
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
