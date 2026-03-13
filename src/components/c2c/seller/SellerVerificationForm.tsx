import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useMyVerificationRequest, useSubmitVerification } from "@/hooks/useC2CVerification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";

interface Props {
  sellerId: string;
}

export function SellerVerificationForm({ sellerId }: Props) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const { data: existing, isLoading } = useMyVerificationRequest(wid);
  const submit = useSubmitVerification();
  
  const [docType, setDocType] = useState("id_card");
  const [businessName, setBusinessName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [notes, setNotes] = useState("");

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  if (existing) {
    const statusInfo: Record<string, { icon: any; label: string; color: string }> = {
      pending: { icon: Clock, label: "Em análise", color: "text-amber-500" },
      approved: { icon: CheckCircle2, label: "Verificado", color: "text-green-500" },
      rejected: { icon: XCircle, label: "Rejeitado", color: "text-destructive" },
    };
    const info = statusInfo[existing.status] || statusInfo.pending;
    const Icon = info.icon;
    
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <Icon className={`h-8 w-8 mx-auto mb-2 ${info.color}`} />
          <p className="font-medium">{info.label}</p>
          {existing.status === "rejected" && existing.rejection_reason && (
            <p className="text-sm text-muted-foreground mt-2">Motivo: {existing.rejection_reason}</p>
          )}
          {existing.status === "pending" && (
            <p className="text-xs text-muted-foreground mt-2">O teu pedido está a ser analisado pela equipa.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = () => {
    if (!user || !wid) return;
    submit.mutate({
      workspace_id: wid,
      seller_id: sellerId,
      user_id: user.id,
      document_type: docType,
      document_urls: [],
      business_name: businessName || undefined,
      tax_id: taxId || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Pedir Verificação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Tipo de documento</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="id_card">Cartão de Cidadão / BI</SelectItem>
              <SelectItem value="passport">Passaporte</SelectItem>
              <SelectItem value="business_license">Licença Comercial</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Nome da empresa (opcional)</Label>
          <Input value={businessName} onChange={e => setBusinessName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>NIF (opcional)</Label>
          <Input value={taxId} onChange={e => setTaxId(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Notas adicionais</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1" />
        </div>
        <Button onClick={handleSubmit} disabled={submit.isPending} className="w-full">
          {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
          Submeter pedido
        </Button>
      </CardContent>
    </Card>
  );
}
