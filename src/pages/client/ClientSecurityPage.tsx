import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Camera, AlertTriangle, FileText, Wrench, Clock, CheckCircle, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";
const supabase = _supabase as any;
import { format } from "date-fns";
import { pt } from "date-fns/locale";

function useClientSecurityData() {
  return useQuery({
    queryKey: ["client-security-portal"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get client user record
      const { data: clientUser } = await supabase
        .from("client_users")
        .select("id, workspace_id, company_id")
        .eq("auth_user_id", user.id)
        .single();

      if (!clientUser) throw new Error("No client profile");
      const wsId = clientUser.workspace_id;

      // Get systems for this company/workspace
      const { data: systems } = await supabase
        .from("security_systems")
        .select("*, security_installation_sites(site_name, address, locality)")
        .eq("workspace_id", wsId);

      // Get recent occurrences
      const { data: occurrences } = await supabase
        .from("security_occurrences")
        .select("*, security_systems(system_type, security_installation_sites(site_name))")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false })
        .limit(20);

      // Get documents
      const { data: documents } = await supabase
        .from("security_documents")
        .select("*")
        .eq("workspace_id", wsId)
        .in("status", ["validated", "emitted", "signed"])
        .order("created_at", { ascending: false })
        .limit(20);

      // Get upcoming maintenance
      const { data: maintenance } = await supabase
        .from("security_maintenance_visits")
        .select("*, security_systems(system_type, security_installation_sites(site_name))")
        .eq("workspace_id", wsId)
        .in("visit_status", ["scheduled", "in_progress"])
        .order("scheduled_at", { ascending: true })
        .limit(10);

      return { systems: systems ?? [], occurrences: occurrences ?? [], documents: documents ?? [], maintenance: maintenance ?? [] };
    },
  });
}

const statusBadge = (status: string) => {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    active: { variant: "default", label: "Activo" },
    inactive: { variant: "secondary", label: "Inactivo" },
    open: { variant: "destructive", label: "Aberta" },
    in_progress: { variant: "default", label: "Em curso" },
    closed: { variant: "secondary", label: "Fechada" },
    scheduled: { variant: "outline", label: "Agendada" },
    completed: { variant: "default", label: "Concluída" },
    emitted: { variant: "default", label: "Emitido" },
    validated: { variant: "outline", label: "Validado" },
    signed: { variant: "default", label: "Assinado" },
  };
  const cfg = map[status] ?? { variant: "secondary" as const, label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

export default function ClientSecurityPage() {
  const { data, isLoading } = useClientSecurityData();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-bold">Segurança Eletrónica</h1>
        </div>
        <div className="text-muted-foreground text-sm">A carregar...</div>
      </div>
    );
  }

  const systemsActive = data?.systems.filter((s: any) => s.status === "active").length ?? 0;
  const occOpen = data?.occurrences.filter((o: any) => o.status !== "closed").length ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Segurança Eletrónica</h1>
          <p className="text-sm text-muted-foreground">Visão geral dos seus sistemas e serviços</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Camera className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{data?.systems.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Sistemas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold">{systemsActive}</p>
            <p className="text-xs text-muted-foreground">Activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold">{occOpen}</p>
            <p className="text-xs text-muted-foreground">Ocorrências Abertas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Wrench className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{data?.maintenance.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Manutenções Pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="systems" className="space-y-4">
        <TabsList>
          <TabsTrigger value="systems">Sistemas</TabsTrigger>
          <TabsTrigger value="occurrences">Ocorrências</TabsTrigger>
          <TabsTrigger value="maintenance">Manutenção</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="systems" className="space-y-3">
          {data?.systems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum sistema registado</p>
          ) : (
            data?.systems.map((sys: any) => (
              <Card key={sys.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{sys.system_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {sys.security_installation_sites?.site_name} — {sys.security_installation_sites?.locality}
                    </p>
                  </div>
                  {statusBadge(sys.status)}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="occurrences" className="space-y-3">
          {data?.occurrences.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem ocorrências</p>
          ) : (
            data?.occurrences.map((occ: any) => (
              <Card key={occ.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium">{occ.title ?? occ.occurrence_type}</p>
                    <div className="flex gap-2">
                      <Badge variant={occ.severity === "critical" ? "destructive" : "outline"}>{occ.severity}</Badge>
                      {statusBadge(occ.status)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {occ.security_systems?.security_installation_sites?.site_name} · {format(new Date(occ.created_at), "dd MMM yyyy", { locale: pt })}
                  </p>
                  {occ.description && <p className="text-sm mt-1">{occ.description}</p>}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-3">
          {data?.maintenance.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem manutenções agendadas</p>
          ) : (
            data?.maintenance.map((v: any) => (
              <Card key={v.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{v.security_systems?.system_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {v.security_systems?.security_installation_sites?.site_name} · {format(new Date(v.scheduled_at), "dd MMM yyyy HH:mm", { locale: pt })}
                    </p>
                  </div>
                  {statusBadge(v.visit_status)}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-3">
          {data?.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem documentos disponíveis</p>
          ) : (
            data?.documents.map((doc: any) => (
              <Card key={doc.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{doc.document_type}</p>
                    <p className="text-sm text-muted-foreground">
                      v{doc.version ?? 1} · {format(new Date(doc.created_at), "dd MMM yyyy", { locale: pt })}
                    </p>
                  </div>
                  {statusBadge(doc.status)}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
