import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChefHat, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  full_name: z.string().min(2, "Nome demasiado curto").max(120),
  email: z.string().email("Email inválido").max(180),
  phone: z.string().max(40).optional(),
  iban: z.string().max(40).optional(),
});

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "amb";
}

export default function LeadChefAmbassadorRegistroPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: user?.email ?? "",
    phone: "",
    iban: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Dados inválidos");
      return;
    }
    if (!user?.id) {
      toast.error("Precisas de estar autenticado para te tornares embaixador.");
      navigate("/auth?redirect=/embaixador/registo");
      return;
    }
    setSubmitting(true);
    try {
      const baseSlug = slugify(parsed.data.full_name);
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await supabase.from("ambassadors" as any).insert({
        user_id: user.id,
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        iban: parsed.data.iban || null,
        slug,
      });
      if (error) throw error;
      toast.success("Bem-vindo ao programa!");
      navigate("/embaixador/dashboard");
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível criar o perfil");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Registo Embaixador LeadChef</title>
      </Helmet>
      <header className="border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/embaixador-programa" className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <div className="flex items-center gap-2 font-semibold">
            <ChefHat className="h-5 w-5 text-primary" /> LeadChef
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Tornar-me embaixador</CardTitle>
            <CardDescription>
              Cria o teu perfil para receberes o link único e começares a ganhar
              comissões recorrentes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="full_name">Nome completo *</Label>
                <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="iban">IBAN para pagamentos (podes adicionar depois)</Label>
                <Input id="iban" value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="PT50 ..." />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar perfil de embaixador
              </Button>
              {!user && (
                <p className="text-xs text-muted-foreground text-center">
                  Será pedido login antes de finalizar.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
