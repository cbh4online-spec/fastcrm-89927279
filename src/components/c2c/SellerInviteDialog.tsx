import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Upload, X, Plus } from "lucide-react";
import { useSendSellerInvite } from "@/hooks/useC2CSellerInvites";
import Papa from "papaparse";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

export default function SellerInviteDialog({ open, onOpenChange, workspaceId }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [csvInvites, setCsvInvites] = useState<Array<{ email: string; name: string }>>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const sendInvite = useSendSellerInvite(workspaceId);

  const handleSendSingle = () => {
    if (!name.trim() || !email.trim()) return;
    sendInvite.mutate([{ email: email.trim(), name: name.trim(), message: message.trim() || undefined }], {
      onSuccess: () => {
        setName("");
        setEmail("");
        setMessage("");
        onOpenChange(false);
      },
    });
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data
          .map((row: any) => ({
            email: (row.email || row.Email || row.EMAIL || "").trim(),
            name: (row.name || row.Name || row.nome || row.Nome || "").trim(),
          }))
          .filter((r) => r.email && r.name);
        setCsvInvites(parsed);
      },
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSendBulk = () => {
    if (!csvInvites.length) return;
    sendInvite.mutate(csvInvites, {
      onSuccess: () => {
        setCsvInvites([]);
        onOpenChange(false);
      },
    });
  };

  const removeCsvInvite = (idx: number) => {
    setCsvInvites((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Convidar Vendedor
          </DialogTitle>
          <DialogDescription>
            Envia um convite por email para se juntar ao marketplace como vendedor
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="single">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="single">Individual</TabsTrigger>
            <TabsTrigger value="bulk">Em Massa (CSV)</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do vendedor" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Mensagem personalizada (opcional)</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Adiciona uma mensagem pessoal ao convite..." rows={3} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSendSingle} disabled={!name.trim() || !email.trim() || sendInvite.isPending} className="gap-2">
                <Send className="h-4 w-4" />
                {sendInvite.isPending ? "A enviar..." : "Enviar Convite"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Ficheiro CSV</Label>
              <p className="text-xs text-muted-foreground">O CSV deve ter colunas "name" e "email"</p>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
              <Button variant="outline" className="gap-2 w-full" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" /> Importar CSV
              </Button>
            </div>

            {csvInvites.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <p className="text-sm font-medium">{csvInvites.length} contacto(s) importados</p>
                {csvInvites.map((inv, idx) => (
                  <div key={idx} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{inv.name}</p>
                      <p className="text-xs text-muted-foreground">{inv.email}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCsvInvite(idx)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSendBulk} disabled={!csvInvites.length || sendInvite.isPending} className="gap-2">
                <Send className="h-4 w-4" />
                {sendInvite.isPending ? "A enviar..." : `Enviar ${csvInvites.length} Convite(s)`}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
