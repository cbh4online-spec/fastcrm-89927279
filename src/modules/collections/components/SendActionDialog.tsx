import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info } from "lucide-react";
import { useRegisterAction } from "../hooks/useRegisterAction";

type Channel = "email" | "whatsapp" | "sms" | "phone";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
}

export function SendActionDialog({ open, onOpenChange, caseId }: Props) {
  const [tab, setTab] = useState<Channel>("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [outcome, setOutcome] = useState("attended");
  const mutation = useRegisterAction();

  const reset = () => {
    setSubject(""); setBody(""); setOutcome("attended"); setTab("email");
  };

  const handleSubmit = async () => {
    const actionType = tab === "email" ? "email_sent"
      : tab === "whatsapp" ? "whatsapp_sent"
      : tab === "sms" ? "sms_sent"
      : "call_logged";
    const channel = tab;

    await mutation.mutateAsync({
      caseId,
      actionType,
      channel,
      subject: tab === "email" ? subject : undefined,
      body: tab === "phone" ? body || undefined : body,
      outcome: tab === "phone" ? outcome : undefined,
    });
    reset();
    onOpenChange(false);
  };

  const canSubmit =
    (tab === "email" && subject.trim() && body.trim()) ||
    (tab !== "email" && tab !== "phone" && body.trim()) ||
    (tab === "phone");

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registar ação</DialogTitle>
          <DialogDescription>
            <span className="flex items-start gap-2 text-xs">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              O envio automático será ativado nas próximas fases. Por agora, esta ação
              fica registada como contacto manual no histórico do caso.
            </span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Channel)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="sms">SMS</TabsTrigger>
            <TabsTrigger value="phone">Chamada</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="ca-subject">Assunto</Label>
              <Input id="ca-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ca-body">Mensagem</Label>
              <Textarea id="ca-body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="ca-wa">Mensagem</Label>
              <Textarea id="ca-wa" rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
          </TabsContent>

          <TabsContent value="sms" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="ca-sms">Mensagem ({body.length}/160)</Label>
              <Textarea
                id="ca-sms" rows={3} maxLength={160}
                value={body} onChange={(e) => setBody(e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="phone" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label>Resultado</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="attended">Atendeu</SelectItem>
                  <SelectItem value="not_attended">Não atendeu</SelectItem>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                  <SelectItem value="busy">Ocupado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ca-notes">Notas (opcional)</Label>
              <Textarea id="ca-notes" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? "A registar…" : "Registar ação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
