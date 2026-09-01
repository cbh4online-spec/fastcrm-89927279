import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Link2, Loader2, Power } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import {
  PRIVACY_POLICY_PATH,
  WHATSAPP_CONSENT_BRAND,
  WHATSAPP_CONSENT_TEXT,
  WHATSAPP_CONSENT_VERSION,
} from "@/lib/whatsapp/consent";
import { toast } from "sonner";

interface LinkRow {
  id: string;
  token: string;
  label: string;
  campaign_reference: string | null;
  is_active: boolean;
  submission_count: number;
  created_at: string;
}

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Gera e gere links públicos de opt-in (token opaco, sem IDs internos no URL). */
export function WhatsAppConsentLinksCard() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const [label, setLabel] = useState("");
  const [campaignRef, setCampaignRef] = useState("");
  const [consentText, setConsentText] = useState(WHATSAPP_CONSENT_TEXT);

  const { data: links, isLoading } = useQuery({
    queryKey: ["whatsapp-consent-links", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<LinkRow[]> => {
      const { data, error } = await supabase
        .from("whatsapp_consent_links")
        .select("id, token, label, campaign_reference, is_active, submission_count, created_at")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LinkRow[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("Sem workspace ativo");
      if (label.trim().length < 3) throw new Error("Indique um nome para o link");
      if (consentText.trim().length < 20) throw new Error("Texto de consentimento demasiado curto");
      const { error } = await supabase.from("whatsapp_consent_links").insert({
        workspace_id: workspaceId,
        token: generateToken(),
        label: label.trim().slice(0, 120),
        brand_name: WHATSAPP_CONSENT_BRAND,
        campaign_reference: campaignRef.trim() || null,
        consent_category: "marketing",
        consent_text: consentText.trim(),
        consent_version: WHATSAPP_CONSENT_VERSION,
        privacy_policy_url: PRIVACY_POLICY_PATH,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setLabel("");
      setCampaignRef("");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-consent-links"] });
      toast.success("Link de opt-in criado");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha a criar link"),
  });

  const toggle = useMutation({
    mutationFn: async (row: LinkRow) => {
      const { error } = await supabase
        .from("whatsapp_consent_links")
        .update({ is_active: !row.is_active, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp-consent-links"] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha a atualizar"),
  });

  const publicUrl = (token: string) => `${window.location.origin}/consentimento-whatsapp?t=${token}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" /> Links públicos de opt-in</CardTitle>
        <CardDescription>
          O URL usa apenas um token aleatório — nunca expõe o workspace, a campanha nem a Lead.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-lg border p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Nome do link</Label>
              <Input value={label} maxLength={120} onChange={(e) => setLabel(e.target.value)} placeholder="ex.: Opt-in myMIA — site" />
            </div>
            <div className="space-y-1">
              <Label>Referência (opcional)</Label>
              <Input value={campaignRef} maxLength={120} onChange={(e) => setCampaignRef(e.target.value)} placeholder="ex.: aquecimento-ghl" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Texto de consentimento apresentado</Label>
            <Textarea rows={3} value={consentText} onChange={(e) => setConsentText(e.target.value)} />
          </div>
          <div>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
              Criar link
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (links ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Ainda não existem links de opt-in.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Submissões</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(links ?? []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.label}</div>
                      <div className="text-xs text-muted-foreground">{row.campaign_reference ?? "—"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.is_active ? "default" : "secondary"}>
                        {row.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.submission_count}</TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(publicUrl(row.token));
                          toast.success("Link copiado");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggle.mutate(row)}>
                        <Power className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
