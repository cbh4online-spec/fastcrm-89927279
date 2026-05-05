import { useState, useMemo } from "react";
import { Phone, Send, Loader2, Search, Users, User, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useSendWhatsAppZapi,
  useWhatsAppZapiGroups,
  useSyncWhatsAppZapiGroups,
  type WhatsAppZapiGroup,
} from "@/hooks/useWhatsAppZapi";
import { useWhatsAppZapiConnection } from "@/hooks/useWhatsAppZapiConnection";

interface QuickWhatsAppZapiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}

export function QuickWhatsAppZapiDialog({ open, onOpenChange }: QuickWhatsAppZapiDialogProps) {
  const { data: connection } = useWhatsAppZapiConnection();
  const { data: groups, isLoading: groupsLoading } = useWhatsAppZapiGroups();
  const sendMutation = useSendWhatsAppZapi();
  const syncMutation = useSyncWhatsAppZapiGroups();

  const [tab, setTab] = useState<"dm" | "group">("dm");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<WhatsAppZapiGroup | null>(null);

  const isConnected = connection?.status === "connected";

  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    if (!groupSearch) return groups;
    const q = groupSearch.toLowerCase();
    return groups.filter((g) =>
      (g.name ?? "").toLowerCase().includes(q) || g.group_id.toLowerCase().includes(q),
    );
  }, [groups, groupSearch]);

  const reset = () => {
    setPhone("");
    setMessage("");
    setGroupSearch("");
    setSelectedGroup(null);
    setTab("dm");
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Escreva uma mensagem");
      return;
    }
    if (tab === "dm") {
      const normalized = normalizePhone(phone);
      if (normalized.length < 8) {
        toast.error("Número inválido (incluir indicativo, ex: 351912345678)");
        return;
      }
      await sendMutation.mutateAsync({ phone: normalized, message: message.trim() });
      toast.success("Mensagem enviada");
      handleClose(false);
    } else {
      if (!selectedGroup) {
        toast.error("Escolha um grupo");
        return;
      }
      await sendMutation.mutateAsync({ groupId: selectedGroup.group_id, message: message.trim() });
      toast.success(`Mensagem enviada ao grupo ${selectedGroup.name ?? ""}`.trim());
      handleClose(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-500" />
            WhatsApp — Nova Mensagem
          </DialogTitle>
        </DialogHeader>

        {!isConnected && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              WhatsApp não está ligado. Configure em <strong>Definições → Canais → WhatsApp</strong>.
            </span>
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as "dm" | "group")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dm" className="gap-2">
              <User className="h-4 w-4" /> Contacto
            </TabsTrigger>
            <TabsTrigger value="group" className="gap-2">
              <Users className="h-4 w-4" /> Grupo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dm" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="zapi-phone">Número de telefone *</Label>
              <Input
                id="zapi-phone"
                placeholder="351912345678 (com indicativo)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
              />
              <p className="text-xs text-muted-foreground">
                Apenas dígitos. Inclua o indicativo do país (ex: 351 para Portugal).
              </p>
            </div>
          </TabsContent>

          <TabsContent value="group" className="space-y-4 pt-4">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar grupo..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending || !isConnected}
                className="gap-2 shrink-0"
              >
                {syncMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sincronizar
              </Button>
            </div>

            <div className="border rounded-md">
              <ScrollArea className="h-[220px]">
                {groupsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    {groups && groups.length === 0
                      ? "Nenhum grupo. Clique em Sincronizar para importar."
                      : "Nenhum grupo encontrado."}
                  </div>
                ) : (
                  <div className="p-1">
                    {filteredGroups.map((g) => {
                      const active = selectedGroup?.id === g.id;
                      return (
                        <button
                          key={g.id}
                          onClick={() => setSelectedGroup(g)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors",
                            active ? "bg-primary/10" : "hover:bg-muted/50",
                          )}
                        >
                          <div className="h-8 w-8 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
                            <Users className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {g.name ?? g.group_id}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {g.participants_count} participantes
                            </div>
                          </div>
                          {g.is_admin && (
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              Admin
                            </Badge>
                          )}
                          {active && (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Label htmlFor="zapi-message">Mensagem *</Label>
          <Textarea
            id="zapi-message"
            placeholder="Escreva a sua mensagem..."
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={
              sendMutation.isPending ||
              !isConnected ||
              !message.trim() ||
              (tab === "dm" ? phone.trim().length === 0 : !selectedGroup)
            }
            className="gap-2 bg-green-500 hover:bg-green-600"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
