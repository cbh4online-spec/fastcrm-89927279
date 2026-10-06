import { resolveWhatsAppAvailability, type WhatsAppAvailability } from "@/lib/whatsapp/availability";
import { useState } from "react";
import { Phone, MessageCircle, Mail, StickyNote, CalendarPlus, Copy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  whatsapp?: ReturnType<typeof resolveWhatsAppAvailability> & { status: WhatsAppAvailability };
  contactId: string;
  workspaceId?: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  lastActivityAt?: string | null;
  onEmail?: () => void;
}

const QUICK_NOTES = ["Sem resposta", "Reunião feita", "Pediu proposta", "Ligar mais tarde"];
const FOLLOW_UPS = [
  { label: "Amanhã", days: 1 },
  { label: "3 dias", days: 3 },
  { label: "1 semana", days: 7 },
];

const haptic = () => { try { navigator.vibrate?.(10); } catch { /* noop */ } };

export function ContactMobileQuickActions({ contactId, workspaceId, name, phone, email, lastActivityAt, onEmail, whatsapp }: Props) {
  const wa = whatsapp ?? resolveWhatsAppAvailability({ phone });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [followDays, setFollowDays] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const daysIdle = lastActivityAt ? Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / 86400000) : null;
  const firstName = name.split(" ")[0];

  const copy = async (value: string, label: string) => {
    try { await navigator.clipboard.writeText(value); haptic(); toast.success(`${label} copiado`); }
    catch { toast.error("Não foi possível copiar"); }
  };

  const openSheet = (withFollow: boolean) => { setFollowDays(withFollow ? 1 : null); setOpen(true); };

  const save = async () => {
    const text = note.trim();
    if (!text && followDays === null) return;
    if (text.length > 1000) { toast.error("Nota demasiado longa (máx. 1000)"); return; }
    if (!workspaceId) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada");
      const base = { workspace_id: workspaceId, created_by: user.id, assigned_to: user.id, related_type: "contact", related_id: contactId };
      const rows: any[] = [];
      if (text) rows.push({ ...base, title: `Nota: ${text.slice(0, 80)}`, description: text, status: "completed", priority: "low" });
      if (followDays !== null) rows.push({
        ...base, title: `Follow-up com ${firstName}`, description: text || null, status: "pending", priority: "high",
        due_at: new Date(Date.now() + followDays * 86400000).toISOString(),
      });
      const { error } = await supabase.from("tasks").insert(rows);
      if (error) throw error;
      haptic();
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(followDays !== null ? "Registado e follow-up agendado" : "Nota registada");
      setNote(""); setFollowDays(null); setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao guardar");
    } finally { setSaving(false); }
  };

  return (
    <div className="md:hidden mt-3 space-y-2">
      {daysIdle !== null && daysIdle >= 30 && (
        <button
          type="button"
          onClick={() => openSheet(true)}
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-left text-sm"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-primary" />
          <span className="flex-1 text-foreground">Sem contacto há {daysIdle} dias</span>
          <span className="font-medium text-primary">Follow-up</span>
        </button>
      )}

      {wa.status !== "confirmed" && phone && (
        <p className="text-xs text-muted-foreground" role="note">{wa.label}</p>
      )}
      <div className="grid grid-cols-5 gap-1.5">
        <QuickBtn icon={Phone} label="Ligar" href={phone ? `tel:${phone}` : undefined} />
        <QuickBtn icon={MessageCircle} label="WhatsApp" href={wa.canOpen && wa.number ? `https://wa.me/${wa.number}` : undefined} />
        <QuickBtn icon={Mail} label="Email" onClick={email ? onEmail : undefined} />
        <QuickBtn icon={StickyNote} label="Nota" onClick={() => openSheet(false)} />
        <QuickBtn icon={CalendarPlus} label="Follow-up" onClick={() => openSheet(true)} />
      </div>

      {(phone || email) && (
        <div className="flex flex-col gap-1 text-sm">
          {phone && (
            <button type="button" onClick={() => copy(phone, "Telefone")} className="flex items-center gap-2 text-foreground min-h-9">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" /><span className="truncate">{phone}</span>
              <Copy className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          {email && (
            <button type="button" onClick={() => copy(email, "Email")} className="flex items-center gap-2 text-foreground min-h-9">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" /><span className="truncate">{email}</span>
              <Copy className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader><DrawerTitle>Registar atividade · {firstName}</DrawerTitle></DrawerHeader>
          <div className="space-y-3 px-4">
            <div className="flex flex-wrap gap-2">
              {QUICK_NOTES.map((q) => (
                <Button key={q} size="sm" variant="outline" className="rounded-full" onClick={() => setNote((n) => (n ? `${n} · ${q}` : q))}>{q}</Button>
              ))}
            </div>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={3} placeholder="O que aconteceu?" aria-label="Nota" />
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">Agendar follow-up</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={followDays === null ? "default" : "outline"} className="rounded-full" onClick={() => setFollowDays(null)}>Não</Button>
                {FOLLOW_UPS.map((f) => (
                  <Button key={f.days} size="sm" variant={followDays === f.days ? "default" : "outline"} className="rounded-full" onClick={() => setFollowDays(f.days)}>{f.label}</Button>
                ))}
              </div>
            </div>
          </div>
          <DrawerFooter>
            <Button onClick={save} disabled={saving || (!note.trim() && followDays === null)}>{saving ? "A guardar…" : "Guardar"}</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function QuickBtn({ icon: Icon, label, href, onClick }: { icon: any; label: string; href?: string; onClick?: () => void }) {
  const disabled = !href && !onClick;
  const cls = "flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-card py-2 text-[11px] text-foreground active:bg-muted disabled:opacity-40 aria-disabled:opacity-40";
  const inner = <><Icon className="h-4 w-4 text-primary" />{label}</>;
  if (href) return <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" onClick={haptic} className={cls}>{inner}</a>;
  return <button type="button" disabled={disabled} onClick={() => { haptic(); onClick?.(); }} className={cls}>{inner}</button>;
}
