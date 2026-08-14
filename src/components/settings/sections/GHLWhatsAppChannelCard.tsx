import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface DiagnosticState {
  hasConfig: boolean;
  locationId: string | null;
  sharedLocationWorkspaces: number;
  channels: Array<{ id: string; ghl_account_id: string; account_name: string | null; is_active: boolean }>;
  conversationCount: number;
}

export function GHLWhatsAppChannelCard() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const [isActivating, setIsActivating] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");


  const { data, isLoading, isError, refetch, isFetching } = useQuery<DiagnosticState>({
    queryKey: ["ghl-whatsapp-diagnostic", workspaceId],
    queryFn: async () => {
      if (!workspaceId) throw new Error("Workspace em falta");

      const { data: config, error: configError } = await supabase
        .from("workspace_ghl_config")
        .select("ghl_location_id, is_active")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (configError) throw configError;

      const locationId = config?.ghl_location_id ?? null;

      let sharedLocationWorkspaces = 0;
      if (locationId) {
        const { count } = await supabase
          .from("workspace_ghl_config")
          .select("workspace_id", { count: "exact", head: true })
          .eq("ghl_location_id", locationId);
        sharedLocationWorkspaces = count ?? 0;
      }

      const { data: channels, error: channelsError } = await supabase
        .from("workspace_ghl_social_channels")
        .select("id, ghl_account_id, account_name, is_active")
        .eq("workspace_id", workspaceId)
        .eq("channel_type", "whatsapp");
      if (channelsError) throw channelsError;

      const { count: conversationCount } = await supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("channel", "whatsapp");

      return {
        hasConfig: !!locationId && config?.is_active !== false,
        locationId,
        sharedLocationWorkspaces,
        channels: channels ?? [],
        conversationCount: conversationCount ?? 0,
      };
    },
    enabled: !!workspaceId,
  });

  const isShared = (data?.sharedLocationWorkspaces ?? 0) > 1;
  const phoneDigits = phoneNumber.replace(/\D/g, "");

  const handleActivate = async () => {
    if (!workspaceId || !data?.locationId) return;
    if (isShared && phoneDigits.length < 9) {
      toast.error("Indique o número WhatsApp deste workspace (location partilhada)");
      return;
    }
    setIsActivating(true);
    try {
      if (data.channels.length > 0) {
        const { error } = await supabase
          .from("workspace_ghl_social_channels")
          .update({ is_active: true })
          .eq("workspace_id", workspaceId)
          .eq("channel_type", "whatsapp");
        if (error) throw error;
      } else {
        const accountId = isShared ? `${data.locationId}_${phoneDigits}` : data.locationId;
        const { error } = await supabase
          .from("workspace_ghl_social_channels")
          .upsert(
            {
              workspace_id: workspaceId,
              channel_type: "whatsapp",
              ghl_account_id: accountId,
              account_name: isShared ? `WhatsApp (GHL) +${phoneDigits}` : "WhatsApp (GHL)",
              is_active: true,
            },
            { onConflict: "workspace_id,channel_type,ghl_account_id" }
          );
        if (error) throw error;
      }
      await refetch();
      toast.success("WhatsApp via GHL ativado neste workspace");
    } catch (err) {
      console.error("Activate GHL WhatsApp error:", err);
      toast.error("Não foi possível ativar o WhatsApp via GHL");
    } finally {
      setIsActivating(false);
    }
  };


  const handleDeactivate = async () => {
    if (!workspaceId) return;
    setIsActivating(true);
    try {
      const { error } = await supabase
        .from("workspace_ghl_social_channels")
        .update({ is_active: false })
        .eq("workspace_id", workspaceId)
        .eq("channel_type", "whatsapp");
      if (error) throw error;
      await refetch();
      toast.success("WhatsApp via GHL desativado neste workspace");
    } catch (err) {
      console.error("Deactivate GHL WhatsApp error:", err);
      toast.error("Não foi possível desativar o canal");
    } finally {
      setIsActivating(false);
    }
  };

  const activeChannels = data?.channels.filter((c) => c.is_active) ?? [];
  const isActive = activeChannels.length > 0;

  return (
    <Card className="border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/40 dark:bg-emerald-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              WhatsApp via GHL
            </CardTitle>
            <CardDescription className="mt-1">
              Estado real do canal WhatsApp neste workspace (envio e receção via GHL)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!isLoading && (
              <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                {isActive ? "Ativo" : "Inativo"}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Atualizar diagnóstico"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Não foi possível carregar o diagnóstico. Tente novamente.
            </AlertDescription>
          </Alert>
        ) : !data?.hasConfig ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Configure primeiro a Location ID e a API Key do GHL neste workspace.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="grid gap-2 text-sm">
              <DiagnosticRow label="Location GHL" value={data.locationId ?? "—"} ok />
              <DiagnosticRow
                label="Canais WhatsApp registados"
                value={`${data.channels.length} (${activeChannels.length} ativo${activeChannels.length !== 1 ? "s" : ""})`}
                ok={isActive}
              />
              <DiagnosticRow
                label="Conversas WhatsApp no FastCRM"
                value={String(data.conversationCount)}
                ok={data.conversationCount > 0}
              />
            </div>

            {isShared && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs space-y-2">
                  <p>
                    Esta location é partilhada por {data.sharedLocationWorkspaces} workspaces. Para o
                    encaminhamento não ficar ambíguo, indique o número WhatsApp que pertence a este
                    workspace — mensagens sem correspondência são rejeitadas (nunca vão para o workspace errado).
                  </p>
                  {!isActive && (
                    <Input
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+351 912 345 678"
                      aria-label="Número WhatsApp deste workspace"
                      className="h-8 bg-background"
                    />
                  )}
                </AlertDescription>
              </Alert>
            )}


            {isActive ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleDeactivate}
                disabled={isActivating}
              >
                {isActivating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Desativar WhatsApp neste workspace
              </Button>
            ) : (
              <Button size="sm" className="w-full" onClick={handleActivate} disabled={isActivating}>
                {isActivating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Ativar WhatsApp via GHL
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DiagnosticRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 text-xs font-medium truncate">
        {ok ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        ) : (
          <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        )}
        <span className="truncate">{value}</span>
      </span>
    </div>
  );
}
