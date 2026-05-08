import { Bell, BellOff, Loader2, Send, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLeadChefPush } from "@/hooks/leadchef/useLeadChefPush";

export function LeadChefPushSettingsCard() {
  const push = useLeadChefPush();

  if (!push.supported) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900">Notificações push</h3>
        </div>
        <p className="text-xs text-slate-600">
          Este dispositivo/navegador não suporta notificações push (ou estás na pré-visualização). Instala a app no telemóvel para receberes alertas.
        </p>
      </div>
    );
  }

  const denied = push.permission === "denied";

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="h-4 w-4 text-emerald-600" />
        <h3 className="text-sm font-semibold text-slate-900">Notificações push</h3>
      </div>
      <p className="text-xs text-slate-600 mb-3">
        Recebe avisos no telemóvel sobre leads quentes, follow-ups e demos. Funciona melhor com a app instalada no ecrã principal.
      </p>

      {denied ? (
        <p className="text-xs text-rose-600">
          Bloqueaste as notificações. Volta às definições do navegador para reativar.
        </p>
      ) : push.isEnabled ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={push.disable} disabled={push.isDisabling}>
            {push.isDisabling ? <Loader2 className="h-3 w-3 animate-spin" /> : <BellOff className="h-3 w-3 mr-1" />}
            Desativar
          </Button>
          <Button size="sm" variant="default" onClick={push.sendTest} disabled={push.isSending}>
            {push.isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
            Enviar teste
          </Button>
        </div>
      ) : (
        <Button size="sm" onClick={push.enable} disabled={push.isEnabling} className="bg-emerald-600 hover:bg-emerald-700">
          {push.isEnabling ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Bell className="h-3 w-3 mr-1" />}
          Ativar notificações
        </Button>
      )}
    </div>
  );
}
