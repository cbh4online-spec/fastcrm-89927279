import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workspaceId?: string;
  member: { user_id: string; profile?: { full_name?: string | null; email?: string | null } | null } | null;
}

export function MemberPasswordDialog({ open, onOpenChange, workspaceId, member }: Props) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<null | "set" | "reset">(null);

  const call = async (action: "set_password" | "send_reset") => {
    if (!member || !workspaceId) return;
    if (action === "set_password") {
      if (pw.length < 8) return toast.error("Mínimo 8 caracteres");
      if (pw !== confirm) return toast.error("As palavras-passe não coincidem");
    }
    setBusy(action === "set_password" ? "set" : "reset");
    const { data, error } = await supabase.functions.invoke("workspace-member-password", {
      body: { workspaceId, userId: member.user_id, action, password: action === "set_password" ? pw : undefined },
    });
    setBusy(null);
    const msg = (data as any)?.error || error?.message;
    if (msg) return toast.error(msg);
    toast.success(action === "set_password" ? "Palavra-passe alterada" : "Email de reposição enviado");
    setPw(""); setConfirm(""); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setPw(""); setConfirm(""); } onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Palavra-passe</DialogTitle>
          <DialogDescription>
            {member?.profile?.full_name || member?.profile?.email}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="member-pw">Nova palavra-passe</Label>
            <Input id="member-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Mínimo 8 caracteres" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-pw2">Confirmar</Label>
            <Input id="member-pw2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" disabled={!!busy || !member?.profile?.email} onClick={() => call("send_reset")}>
            {busy === "reset" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Enviar reposição por email
          </Button>
          <Button disabled={!!busy} onClick={() => call("set_password")}>
            {busy === "set" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Guardar palavra-passe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
