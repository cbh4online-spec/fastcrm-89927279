import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubmitApplication } from "@/hooks/hr/usePublicJobs";

const applicationSchema = z.object({
  first_name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  last_name: z.string().trim().min(1, "Apelido é obrigatório").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  phone: z.string().max(20).optional().default(""),
  linkedin_url: z.string().url("URL inválido").max(500).optional().or(z.literal("")),
  cover_letter: z.string().max(3000, "Máximo 3000 caracteres").optional().default(""),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

interface ApplicationFormProps {
  jobId: string;
  workspaceId: string;
  jobTitle: string;
}

export function ApplicationForm({ jobId, workspaceId, jobTitle }: ApplicationFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const submitApp = useSubmitApplication();

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { first_name: "", last_name: "", email: "", phone: "", linkedin_url: "", cover_letter: "" },
  });

  const onSubmit = async (values: ApplicationFormValues) => {
    let cv_url: string | undefined;

    if (cvFile) {
      setUploading(true);
      const ext = cvFile.name.split(".").pop();
      const path = `${workspaceId}/${jobId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("hr-cvs").upload(path, cvFile);
      if (error) {
        form.setError("root", { message: "Erro ao fazer upload do CV" });
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("hr-cvs").getPublicUrl(path);
      cv_url = urlData.publicUrl;
      setUploading(false);
    }

    await submitApp.mutateAsync({
      job_posting_id: jobId,
      workspace_id: workspaceId,
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      phone: values.phone || undefined,
      linkedin_url: values.linkedin_url || undefined,
      cv_url,
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h3 className="text-xl font-semibold">Candidatura Enviada!</h3>
          <p className="text-muted-foreground">
            Obrigado pelo interesse na posição de <strong>{jobTitle}</strong>. Entraremos em contacto em breve.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Candidatar-se</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="first_name">Nome *</Label>
              <Input id="first_name" {...form.register("first_name")} placeholder="João" />
              {form.formState.errors.first_name && (
                <p className="text-xs text-destructive">{form.formState.errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="last_name">Apelido *</Label>
              <Input id="last_name" {...form.register("last_name")} placeholder="Silva" />
              {form.formState.errors.last_name && (
                <p className="text-xs text-destructive">{form.formState.errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" {...form.register("email")} placeholder="joao@email.com" />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" {...form.register("phone")} placeholder="+351 912 345 678" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="linkedin_url">LinkedIn</Label>
            <Input id="linkedin_url" {...form.register("linkedin_url")} placeholder="https://linkedin.com/in/..." />
            {form.formState.errors.linkedin_url && (
              <p className="text-xs text-destructive">{form.formState.errors.linkedin_url.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Currículo (PDF, DOC)</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => document.getElementById("cv-upload")?.click()}>
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {cvFile ? cvFile.name : "Clique para seleccionar ficheiro"}
              </p>
              <input
                id="cv-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={e => setCvFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="cover_letter">Carta de Motivação</Label>
            <Textarea id="cover_letter" {...form.register("cover_letter")} rows={4} placeholder="Porque gostaria de se juntar à equipa..." />
            {form.formState.errors.cover_letter && (
              <p className="text-xs text-destructive">{form.formState.errors.cover_letter.message}</p>
            )}
          </div>

          {form.formState.errors.root && (
            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
          )}

          <Button type="submit" className="w-full" disabled={submitApp.isPending || uploading}>
            {(submitApp.isPending || uploading) ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A enviar...</>
            ) : "Enviar Candidatura"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
