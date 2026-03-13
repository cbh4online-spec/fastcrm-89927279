import { useState } from "react";
import { supabase as _supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";

const supabase = _supabase as any;

interface Props {
  listingId: string;
  workspaceId: string;
}

export function ReportListingButton({ listingId, workspaceId }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("c2c_reports").insert({
        workspace_id: workspaceId,
        reporter_email: email,
        entity_type: "listing",
        entity_id: listingId,
        reason,
        details: details || null,
      });
      if (error) throw error;
      toast.success("Denúncia enviada. Obrigado!");
      setOpen(false);
    } catch {
      toast.error("Erro ao enviar denúncia");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5">
          <Flag className="h-3.5 w-3.5" /> Denunciar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" /> Denunciar anúncio
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Motivo</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="fraud">Fraude</SelectItem>
                <SelectItem value="inappropriate">Conteúdo impróprio</SelectItem>
                <SelectItem value="counterfeit">Produto falsificado</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>O teu email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" className="mt-1" />
          </div>
          <div>
            <Label>Detalhes (opcional)</Label>
            <Textarea value={details} onChange={e => setDetails(e.target.value)} rows={3} className="mt-1" />
          </div>
          <Button onClick={handleSubmit} disabled={loading || !email} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Enviar denúncia
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
