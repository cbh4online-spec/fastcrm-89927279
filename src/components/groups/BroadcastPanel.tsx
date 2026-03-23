import { useState } from "react";
import { useGroups } from "@/hooks/useGroups";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ProductPickerButton } from "./ProductPickerButton";

const sb = supabase as any;

interface BroadcastPanelProps {
  open: boolean;
  onClose: () => void;
}

export function BroadcastPanel({ open, onClose }: BroadcastPanelProps) {
  const { currentWorkspace } = useWorkspace();
  const { data: groups = [] } = useGroups();
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [filterPurpose, setFilterPurpose] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string; price: number } | null>(null);

  const telegramGroups = groups.filter(
    (g) => (g.group_type === "telegram" || g.group_type === "hybrid") && g.telegram_chat_id
  );

  const filtered = filterPurpose === "all"
    ? telegramGroups
    : telegramGroups.filter((g) => g.purpose === filterPurpose);

  const toggleGroup = (id: string) => {
    const next = new Set(selectedGroups);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedGroups(next);
  };

  const selectAll = () => {
    if (selectedGroups.size === filtered.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(filtered.map((g) => g.id)));
    }
  };

  const broadcast = useMutation({
    mutationFn: async () => {
      if (!message.trim() && !selectedProduct) throw new Error("Escreva uma mensagem ou seleccione um produto");
      if (selectedGroups.size === 0) throw new Error("Seleccione pelo menos um grupo");

      const { data: { session } } = await supabase.auth.getSession();
      const targetGroupsList = Array.from(selectedGroups);
      
      // Create broadcast record
      await sb.from("group_broadcasts").insert({
        workspace_id: currentWorkspace!.id,
        message: message || null,
        product_id: selectedProduct?.id || null,
        target_groups: targetGroupsList,
        total_count: targetGroupsList.length,
        status: "sending",
        created_by: session?.user?.id,
      });

      // Send to each group
      let sentCount = 0;
      for (const groupId of targetGroupsList) {
        const group = groups.find((g) => g.id === groupId);
        if (!group?.telegram_chat_id) continue;

        try {
          const action = selectedProduct ? "sendProduct" : "sendMessage";
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              action,
              workspace_id: currentWorkspace!.id,
              chat_id: group.telegram_chat_id,
              text: message,
              group_id: groupId,
              ...(selectedProduct ? { product_id: selectedProduct.id } : {}),
            }),
          });
          sentCount++;
        } catch (err) {
          console.error(`Failed to send to group ${groupId}:`, err);
        }
      }

      return { sentCount, total: targetGroupsList.length };
    },
    onSuccess: (result) => {
      toast.success(`Broadcast enviado: ${result.sentCount}/${result.total} grupos`);
      setMessage("");
      setSelectedGroups(new Set());
      setSelectedProduct(null);
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" /> Broadcast
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          <div>
            <Label>Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreva a mensagem para enviar..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <ProductPickerButton
              onSelect={(p) => setSelectedProduct(p)}
              disabled={broadcast.isPending}
            />
            {selectedProduct && (
              <Badge variant="secondary" className="gap-1">
                {selectedProduct.name}
                <button onClick={() => setSelectedProduct(null)} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label>Grupos de destino ({selectedGroups.size}/{filtered.length})</Label>
            <div className="flex items-center gap-2">
              <Select value={filterPurpose} onValueChange={setFilterPurpose}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sales">Vendas</SelectItem>
                  <SelectItem value="support">Suporte</SelectItem>
                  <SelectItem value="community">Comunidade</SelectItem>
                  <SelectItem value="team">Equipa</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">
                {selectedGroups.size === filtered.length ? "Desmarcar" : "Todos"}
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[180px] border rounded-md">
            <div className="p-2 space-y-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum grupo Telegram encontrado</p>
              ) : (
                filtered.map((g) => (
                  <label
                    key={g.id}
                    className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedGroups.has(g.id)}
                      onCheckedChange={() => toggleGroup(g.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{g.name}</p>
                      <p className="text-xs text-muted-foreground">{g.member_count} membros</p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">{g.purpose}</Badge>
                  </label>
                ))
              )}
            </div>
          </ScrollArea>

          <Button
            onClick={() => broadcast.mutate()}
            disabled={broadcast.isPending || (selectedGroups.size === 0) || (!message.trim() && !selectedProduct)}
            className="w-full"
          >
            {broadcast.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A enviar...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> Enviar para {selectedGroups.size} grupo{selectedGroups.size !== 1 ? "s" : ""}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
