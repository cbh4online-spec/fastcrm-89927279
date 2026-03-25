import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface AccountData {
  id: string;
  name: string;
  domain: string;
  description_short?: string | null;
  tagline?: string | null;
  probable_sector?: string | null;
  probable_geography?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  twitter_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
  email_main?: string | null;
  phone_main?: string | null;
}

interface AccountBriefEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountData;
  onSave: (updates: Partial<AccountData> & { id: string }) => void;
  isSaving?: boolean;
}

export function AccountBriefEditDialog({ open, onOpenChange, account, onSave, isSaving }: AccountBriefEditDialogProps) {
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && account) {
      setForm({
        name: account.name || "",
        domain: account.domain || "",
        description_short: account.description_short || "",
        tagline: account.tagline || "",
        probable_sector: account.probable_sector || "",
        probable_geography: account.probable_geography || "",
        nif: (account as any).nif || "",
        linkedin_url: (account as any).linkedin_url || "",
        instagram_url: (account as any).instagram_url || "",
        facebook_url: (account as any).facebook_url || "",
        twitter_url: (account as any).twitter_url || "",
        youtube_url: (account as any).youtube_url || "",
        tiktok_url: (account as any).tiktok_url || "",
        email_main: (account as any).email_main || "",
        phone_main: (account as any).phone_main || "",
      });
    }
  }, [open, account]);

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    const updates: Record<string, unknown> = { id: account.id };
    for (const [key, value] of Object.entries(form)) {
      const original = (account as any)[key] || "";
      if (value !== original) {
        updates[key] = value || null;
      }
    }
    // Also update normalized_domain if domain changed
    if (updates.domain) {
      updates.normalized_domain = String(updates.domain).replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
    }
    onSave(updates as any);
  };

  const fields: { key: string; label: string; type?: "textarea" | "url" | "email" | "tel" }[] = [
    { key: "name", label: "Nome" },
    { key: "domain", label: "Domínio" },
    { key: "nif", label: "NIF" },
    { key: "description_short", label: "Descrição curta", type: "textarea" },
    { key: "tagline", label: "Tagline" },
    { key: "probable_sector", label: "Setor" },
    { key: "probable_geography", label: "Geografia" },
    { key: "email_main", label: "Email principal", type: "email" },
    { key: "phone_main", label: "Telefone principal", type: "tel" },
    { key: "linkedin_url", label: "LinkedIn", type: "url" },
    { key: "instagram_url", label: "Instagram", type: "url" },
    { key: "facebook_url", label: "Facebook", type: "url" },
    { key: "twitter_url", label: "X (Twitter)", type: "url" },
    { key: "youtube_url", label: "YouTube", type: "url" },
    { key: "tiktok_url", label: "TikTok", type: "url" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Conta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {fields.map(({ key, label, type }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
              {type === "textarea" ? (
                <Textarea
                  value={form[key] || ""}
                  onChange={(e) => set(key, e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              ) : (
                <Input
                  value={form[key] || ""}
                  onChange={(e) => set(key, e.target.value)}
                  type={type || "text"}
                  className="text-sm"
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
