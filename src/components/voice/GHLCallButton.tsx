import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PhoneCall, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface GHLCallButtonProps {
  entityType: "lead" | "contact";
  entityId: string;
  entityName?: string | null;
  phone?: string | null;
  className?: string;
}

/**
 * Abre o contacto na location correta do GHL (LC Phone) para marcação assistida.
 * O GHL não expõe endpoint de marcação automática via API, por isso usamos deep link.
 */
export function GHLCallButton({ entityType, entityId, entityName, phone, className }: GHLCallButtonProps) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const [isLogging, setIsLogging] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["ghl-call-target", workspaceId, entityType, entityId],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data: config } = await supabase
        .from("workspace_ghl_config")
        .select("ghl_location_id, is_active")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (!config?.ghl_location_id || config.is_active === false) return null;

      const table = entityType === "lead" ? "leads" : "contacts";
      const { data: entity } = await supabase
        .from(table)
        .select("ghl_contact_id")
        .eq("id", entityId)
        .maybeSingle();

      const ghlContactId = (entity as { ghl_contact_id?: string } | null)?.ghl_contact_id;
      if (!ghlContactId) return null;

      return { locationId: config.ghl_location_id, ghlContactId };
    },
    enabled: !!workspaceId && !!entityId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (!data) return null;

  const handleClick = async () => {
    const url = `https://app.gohighlevel.com/v2/location/${data.locationId}/contacts/detail/${data.ghlContactId}`;
    window.open(url, "_blank", "noopener,noreferrer");

    if (!workspaceId) return;
    setIsLogging(true);
    try {
      const { error } = await supabase.from("entity_activities").insert({
        workspace_id: workspaceId,
        entity_type: entityType,
        entity_id: entityId,
        activity_type: "call_made",
        title: "Chamada iniciada via GHL",
        description: [
          entityName ? `Contacto ${entityName}` : null,
          phone ? `Número ${phone}` : null,
          "Marcação assistida no LC Phone",
        ]
          .filter(Boolean)
          .join(" · "),
        metadata: {
          channel: "call",
          source: "ghl_manual",
          ghl_contact_id: data.ghlContactId,
          ghl_location_id: data.locationId,
        },
      });
      if (error) throw error;
      toast.success("Chamada registada na timeline", {
        description: "Conclua a marcação no separador do GHL.",
      });
    } catch (err) {
      console.error("GHL call log error:", err);
      toast.error("Não foi possível registar a chamada na timeline");
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={className}
            onClick={handleClick}
            disabled={isLogging}
            aria-label="Ligar via GHL"
          >
            {isLogging ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PhoneCall className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Ligar via GHL</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Abre o contacto no GHL para marcar a chamada no LC Phone e regista a atividade.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
