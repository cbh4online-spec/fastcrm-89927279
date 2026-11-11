import { useState } from "react";
import { toast } from "sonner";
import { Phone, Loader2, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { invokeZapiCall, useZapiCallStatus } from "@/hooks/useZapiCall";

/**
 * Chamada de voz WhatsApp feita pela pessoa (microfone do computador) via Z-API.
 * Nunca liga sozinho: opt-out, consentimento e limites são verificados no servidor antes.
 */
export function ZapiCallButton({ phone, contactId, inHeader = false }: { phone?: string | null; contactId?: string; inHeader?: boolean }) {
  const { currentWorkspace } = useWorkspace();
  const status = useZapiCallStatus();
  const [state, setState] = useState<"idle" | "starting" | "in_call">("idle");
  const [hangup, setHangup] = useState<(() => void) | null>(null);
  const wsId = currentWorkspace?.id;
  if (!wsId || !phone || phone.replace(/\D/g, "").length < 9 || !status.data) return null;

  const onClick = async () => {
    setState("starting");
    let callLogId: string | undefined;
    try {
      const start = await invokeZapiCall(wsId, "start", { phone, contactId });
      callLogId = start.callLogId;
      const first = await invokeZapiCall(wsId, "token");
      let firstUsed = false;
      const { ZAPICall } = await import("@z-api/call");
      const t0 = Date.now();
      const handle = ZAPICall.call({
        instanceId: first.instanceId!, number: start.phone!, position: "bottom-right",
        // Token efémero de uso único: o primeiro já foi pedido; reconexões pedem outro ao servidor.
        getToken: async () => {
          if (!firstUsed) { firstUsed = true; return first.token!; }
          return (await invokeZapiCall(wsId, "token")).token!;
        },
      });
      setHangup(() => handle.hangup);
      setState("in_call");
      await handle.done;
      await invokeZapiCall(wsId, "end", { callLogId, durationSeconds: Math.round((Date.now() - t0) / 1000) }).catch(() => undefined);
      toast.success("Chamada terminada e registada.");
    } catch (e) {
      if (callLogId) await invokeZapiCall(wsId, "end", { callLogId, durationSeconds: 0, outcome: "failed" }).catch(() => undefined);
      toast.error((e as Error).message);
    } finally {
      setState("idle"); setHangup(null);
    }
  };

  const cls = inHeader ? "gap-2" : "w-full justify-start gap-2";
  if (state === "in_call") {
    return (
      <Button variant="destructive" size={inHeader ? "default" : "sm"} className={cls} onClick={() => hangup?.()}>
        <PhoneOff className="w-4 h-4" /> Desligar chamada WhatsApp
      </Button>
    );
  }
  return (
    <Button variant="outline" size={inHeader ? "default" : "sm"} className={cls} onClick={onClick} disabled={state === "starting"} aria-label="Ligar via WhatsApp">
      {state === "starting" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
      Ligar via WhatsApp
    </Button>
  );
}
