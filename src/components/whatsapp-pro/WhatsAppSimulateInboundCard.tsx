import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSimulateInbound } from "@/hooks/useWhatsAppProOps";
import { Beaker } from "lucide-react";

export function WhatsAppSimulateInboundCard() {
  const sim = useSimulateInbound();
  const [phone, setPhone] = useState("351912345678");
  const [contactName, setContactName] = useState("Cliente Teste");
  const [messageType, setMessageType] = useState<"text" | "image" | "audio" | "document" | "video">("text");
  const [text, setText] = useState("Olá, vi o vosso produto e queria mais informações.");
  const [mediaUrl, setMediaUrl] = useState("");

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Beaker className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold">Simular mensagem recebida (QA)</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Cria uma conversa e mensagem inbound como se viesse do fornecedor real. Ideal para testar fluxos sem ligar provider real.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Telefone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="351912345678" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nome do contacto</Label>
          <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tipo de mensagem</Label>
          <Select value={messageType} onValueChange={(v) => setMessageType(v as never)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Texto</SelectItem>
              <SelectItem value="image">Imagem</SelectItem>
              <SelectItem value="audio">Áudio (voz)</SelectItem>
              <SelectItem value="video">Vídeo</SelectItem>
              <SelectItem value="document">Documento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {messageType !== "text" && (
          <div className="space-y-1">
            <Label className="text-xs">URL do media</Label>
            <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://..." />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Texto / Caption</Label>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() =>
            sim.mutate({
              phone: phone.replace(/\D/g, ""),
              contactName,
              messageType,
              text,
              mediaUrl: mediaUrl || undefined,
            })
          }
          disabled={sim.isPending || !phone}
          size="sm"
        >
          Simular mensagem
        </Button>
      </div>
    </Card>
  );
}
