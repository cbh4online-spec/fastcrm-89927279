import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, Send, Eye, Loader2 } from "lucide-react";
import { useRegisterAction } from "../hooks/useRegisterAction";
import { useDispatchAction } from "../hooks/useDispatchAction";
import { useCollectionCase } from "../hooks/useCollectionCase";
import {
  COLLECTION_TEMPLATE_VARIABLES,
  buildCaseTemplateVars,
  renderCollectionTemplate,
} from "../lib/collectionsTemplates";

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
  const [preview, setPreview] = useState(false);
  const register = useRegisterAction();
  const dispatch = useDispatchAction();
  const { data: caseRow } = useCollectionCase(open ? caseId : undefined);

  const vars = caseRow ? buildCaseTemplateVars(caseRow) : {};
  const canDispatch = tab === "email" || tab === "whatsapp";
  const isBusy = register.isPending || dispatch.isPending;

  const reset = () => {
    setSubject(""); setBody(""); setOutcome("attended"); setTab("email"); setPreview(false);
  };

  const close = () => { reset(); onOpenChange(false); };

  const insertVar = (key: string) => setBody((b) => `${b}{{${key}}}`);

  const handleRegister = async () => {
    const actionType = tab === "email" ? "email_sent"
      : tab === "whatsapp" ? "whatsapp_sent"
      : tab === "sms" ? "sms_sent"
      : "call_logged";

    await register.mutateAsync({
      caseId,
      actionType,
      channel: tab,
      subject: tab === "email" ? subject : undefined,
      body: tab === "phone" ? body || undefined : body,
      outcome: tab === "phone" ? outcome : undefined,
    });
    close();
  };

  const handleDispatch = async () => {
    if (!canDispatch) return;
    await dispatch.mutateAsync({
      caseId,
      channel: tab as "email" | "whatsapp",
      subject: tab === "email" ? subject : undefined,
      body,
    });
    close();
  };

  const canSubmit =
    (tab === "email" && subject.trim() && body.trim()) ||
    (tab !== "email" && tab !== "phone" && body.trim()) ||
    (tab === "phone");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Comunicar com o devedor</DialogTitle>
          <DialogDescription>
            <span className="flex items-start gap-2 text-xs">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Email e WhatsApp podem ser enviados de imediato. SMS e chamada ficam
              registados como contacto manual no histórico do caso.
            </span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as Channel); setPreview(false); }}>
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

        {tab !== "phone" && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {COLLECTION_TEMPLATE_VARIABLES.map((v) => (
                <Badge
                  key={v.key}
                  variant="outline"
                  className="cursor-pointer text-[11px] font-normal"
                  onClick={() => insertVar(v.key)}
                  title={v.label}
                >
                  {`{{${v.key}}}`}
                </Badge>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setPreview((p) => !p)}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              {preview ? "Ocultar antevisão" : "Antever com dados do caso"}
            </Button>
            {preview && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                {tab === "email" && subject && (
                  <p className="mb-2 font-medium">{renderCollectionTemplate(subject, vars)}</p>
                )}
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {renderCollectionTemplate(body, vars) || "—"}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={close}>Cancelar</Button>
          <Button variant="outline" onClick={handleRegister} disabled={!canSubmit || isBusy}>
            {register.isPending ? "A registar…" : "Registar manual"}
          </Button>
          {canDispatch && (
            <Button onClick={handleDispatch} disabled={!canSubmit || isBusy}>
              {dispatch.isPending
                ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />A enviar…</>
                : <><Send className="mr-1.5 h-4 w-4" />Enviar agora</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
