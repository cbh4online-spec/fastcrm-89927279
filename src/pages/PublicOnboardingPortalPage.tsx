import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, AlertCircle, FileText, Upload, Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const FN_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

const STATUS_BADGE: Record<string, { label: string; variant: any }> = {
  pending: { label: "Pendente", variant: "outline" },
  in_progress: { label: "Em curso", variant: "secondary" },
  submitted: { label: "Submetido", variant: "default" },
  approved: { label: "Aprovado", variant: "default" },
  rejected: { label: "Precisa correção", variant: "destructive" },
  not_applicable: { label: "N/A", variant: "outline" },
};

export default function PublicOnboardingPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<Record<string, string>>({});

  const load = () => {
    if (!token) return;
    fetch(`${FN_BASE}/portal-load-onboarding?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [token]);

  const submitItem = async (item_id: string) => {
    const v = responses[item_id];
    if (!v) return;
    const r = await fetch(`${FN_BASE}/portal-submit-checklist`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, item_id, response_value: v }),
    });
    const d = await r.json();
    if (d.success) { toast.success("Resposta submetida"); load(); }
    else toast.error("Erro ao submeter");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">A carregar…</div>;
  if (!data) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md"><CardContent className="pt-6 text-center space-y-3">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
        <h2 className="text-xl font-semibold">Onboarding não encontrado</h2>
      </CardContent></Card>
    </div>
  );

  const { project, items, documents } = data;
  const total = items.length;
  const done = items.filter((i: any) => ["approved", "submitted"].includes(i.status)).length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" /> Portal de Onboarding</Badge>
          <h1 className="text-3xl font-bold">Bem-vindo, {project.customer_contact_name}</h1>
          <p className="text-muted-foreground">{project.title}</p>
        </header>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Progresso do onboarding</div>
                <div className="text-2xl font-bold">{progress}%</div>
              </div>
              {project.target_go_live_date && (
                <div className="text-right">
                  <div className="text-sm text-muted-foreground flex items-center gap-1 justify-end"><Clock className="h-3 w-3" /> Go-live previsto</div>
                  <div className="font-medium">{new Date(project.target_go_live_date).toLocaleDateString("pt-PT")}</div>
                </div>
              )}
            </div>
            <Progress value={progress} />
          </CardContent>
        </Card>

        <Tabs defaultValue="checklist">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="next">Próximos passos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3">
            <Card><CardContent className="pt-6 space-y-2 text-sm">
              <div><span className="text-muted-foreground">Empresa:</span> <strong>{project.customer_company_name}</strong></div>
              <div><span className="text-muted-foreground">Contacto:</span> {project.customer_contact_name} ({project.customer_contact_email})</div>
              <div><span className="text-muted-foreground">Estado:</span> <Badge>{project.status}</Badge></div>
              <div><span className="text-muted-foreground">Módulos:</span> {(project.selected_modules || []).join(", ") || "—"}</div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="checklist" className="space-y-3">
            {items.length === 0 ? <p className="text-muted-foreground text-center py-8">Sem itens pendentes</p> :
              items.map((it: any) => {
                const badge = STATUS_BADGE[it.status] ?? STATUS_BADGE.pending;
                const editable = ["pending", "rejected"].includes(it.status);
                return (
                  <Card key={it.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{it.title} {it.required && <span className="text-destructive">*</span>}</CardTitle>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      {it.description && <p className="text-sm text-muted-foreground">{it.description}</p>}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {it.rejection_reason && (
                        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">⚠ {it.rejection_reason}</div>
                      )}
                      {editable ? (
                        <div className="space-y-2">
                          {it.field_type === "textarea" ? (
                            <Textarea value={responses[it.id] ?? it.response_value ?? ""} onChange={(e) => setResponses({ ...responses, [it.id]: e.target.value })} />
                          ) : (
                            <Input type={it.field_type === "phone" ? "tel" : it.field_type === "email" ? "email" : "text"}
                              value={responses[it.id] ?? it.response_value ?? ""}
                              onChange={(e) => setResponses({ ...responses, [it.id]: e.target.value })} />
                          )}
                          <Button size="sm" onClick={() => submitItem(it.id)}>Submeter</Button>
                        </div>
                      ) : (
                        it.response_value && <div className="text-sm bg-muted p-2 rounded">{it.response_value}</div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </TabsContent>

          <TabsContent value="documents" className="space-y-3">
            {documents.length === 0 ? <p className="text-muted-foreground text-center py-8">Sem documentos</p> :
              documents.map((d: any) => (
                <Card key={d.id}><CardContent className="pt-6 flex items-center justify-between">
                  <div className="flex items-center gap-3"><FileText className="h-5 w-5 text-muted-foreground" />
                    <div><div className="font-medium">{d.title}</div><div className="text-xs text-muted-foreground">{d.file_name ?? "—"}</div></div>
                  </div>
                  <Badge>{d.status}</Badge>
                </CardContent></Card>
              ))}
            <Card className="border-dashed"><CardContent className="pt-6 text-center text-muted-foreground">
              <Upload className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Para carregar novos documentos, contacte a equipa.</p>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="next">
            <Card><CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /> Próximos passos</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Preencher os itens da checklist</li>
                <li>Carregar os documentos solicitados</li>
                <li>Aguardar agendamento do kickoff pela nossa equipa</li>
                <li>Iniciar a configuração e go-live</li>
              </ol>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
