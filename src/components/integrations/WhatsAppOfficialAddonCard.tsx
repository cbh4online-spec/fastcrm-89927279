import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { BadgeCheck, Loader2 } from "lucide-react";

export const WHATSAPP_OFFICIAL_ADDON_PRICE_EUR = 49;

const RequestSchema = z.object({
  phone_number: z.string().trim().regex(/^\+?[0-9 ]{8,20}$/, "Número inválido (ex.: +351 912 345 678)"),
  business_name: z.string().trim().max(120).optional(),
});

const STATUS_LABEL: Record<string, string> = {
  pending: "A aguardar aprovação",
  approved: "Aprovado — em ativação",
  active: "Ativo",
  rejected: "Recusado",
  cancelled: "Cancelado",
};

type Req = {
  id: string; workspace_id: string; phone_number: string; business_name: string | null;
  status: string; created_at: string; review_notes: string | null;
};

export function WhatsAppOfficialAddonCard() {
  const { currentWorkspace, isSuperAdmin, workspaces } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();
  const wsId = currentWorkspace?.id;
  const [phone, setPhone] = useState("");
  const [business, setBusiness] = useState("");

  const key = ["wa-official-requests", isSuperAdmin ? "all" : wsId];
  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: key,
    enabled: !!wsId,
    queryFn: async () => {
      let q = supabase.from("whatsapp_official_number_requests")
        .select("id, workspace_id, phone_number, business_name, status, created_at, review_notes")
        .order("created_at", { ascending: false }).limit(100);
      if (!isSuperAdmin) q = q.eq("workspace_id", wsId!);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Req[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const parsed = RequestSchema.safeParse({ phone_number: phone, business_name: business || undefined });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const { error } = await supabase.from("whatsapp_official_number_requests").insert({
        workspace_id: wsId!, requested_by: user!.id,
        phone_number: parsed.data.phone_number.replace(/\s/g, ""),
        business_name: parsed.data.business_name ?? null,
      });
      if (error) throw new Error(error.code === "23505" ? "Já existe um pedido aberto para este número." : error.message);
    },
    onSuccess: () => { toast.success("Pedido enviado. Será avisado quando for aprovado."); setPhone(""); setBusiness(""); qc.invalidateQueries({ queryKey: ["wa-official-requests"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("whatsapp_official_number_requests")
        .update({ status, reviewed_by: user!.id, reviewed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-official-requests"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_official_number_requests").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-official-requests"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const wsName = (id: string) => workspaces.find((w) => w.id === id)?.name ?? "Workspace";
  const hasOpen = requests.some((r) => r.workspace_id === wsId && ["pending", "approved", "active"].includes(r.status));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BadgeCheck className="h-5 w-5 text-primary" /> WhatsApp Business Oficial
          <Badge variant="outline">{WHATSAPP_OFFICIAL_ADDON_PRICE_EUR} €/mês por número</Badge>
        </CardTitle>
        <CardDescription>
          Número oficial da Meta só para este workspace. As mensagens da Meta são cobradas à parte
          (respostas dentro de 24 h são grátis).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasOpen && (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="wa-off-phone">Número a ligar</Label>
              <Input id="wa-off-phone" value={phone} maxLength={20} placeholder="+351 912 345 678" onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wa-off-name">Nome do negócio (opcional)</Label>
              <Input id="wa-off-name" value={business} maxLength={120} onChange={(e) => setBusiness(e.target.value)} />
            </div>
            <Button onClick={() => create.mutate()} disabled={!phone || create.isPending || !wsId}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Pedir add-on
            </Button>
          </div>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">A carregar pedidos…</p>}
        {error && <p className="text-sm text-destructive">Não foi possível ler os pedidos.</p>}
        {!isLoading && requests.length === 0 && <p className="text-sm text-muted-foreground">Ainda não há pedidos.</p>}

        <ul className="divide-y divide-border rounded-lg border">
          {requests.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <div>
                <p className="font-medium text-foreground">{r.phone_number}{r.business_name ? ` · ${r.business_name}` : ""}</p>
                <p className="text-muted-foreground">
                  {isSuperAdmin && `${wsName(r.workspace_id)} · `}{new Date(r.created_at).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={r.status === "active" ? "default" : "secondary"}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                {isSuperAdmin && r.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => review.mutate({ id: r.id, status: "approved" })}>Aprovar</Button>
                    <Button size="sm" variant="outline" onClick={() => review.mutate({ id: r.id, status: "rejected" })}>Recusar</Button>
                  </>
                )}
                {isSuperAdmin && r.status === "approved" && (
                  <Button size="sm" variant="outline" onClick={() => review.mutate({ id: r.id, status: "active" })}>Marcar ativo</Button>
                )}
                {!isSuperAdmin && r.status === "pending" && (
                  <Button size="sm" variant="ghost" onClick={() => cancel.mutate(r.id)}>Cancelar</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
