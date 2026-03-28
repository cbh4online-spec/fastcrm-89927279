import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useInviteToEvent } from "@/hooks/useEvents";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface BulkInviteDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eventId: string;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string | null;
  eventLink?: string | null;
}

export function BulkInviteDialog({ open, onOpenChange, eventId, eventTitle, eventDate, eventLocation, eventLink }: BulkInviteDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const inviteMut = useInviteToEvent();

  useEffect(() => {
    if (!open || !currentWorkspace) return;
    setLoading(true);
    (supabase.from("contacts").select("id, name, email, phone") as any)
      .eq("workspace_id", currentWorkspace.id)
      .order("name")
      .limit(200)
      .then(({ data }: any) => {
        setContacts(data || []);
        setLoading(false);
      });
  }, [open, currentWorkspace]);

  const filtered = contacts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  const toggleContact = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkInvite = async () => {
    if (selected.size === 0) return;
    setSending(true);

    const toInvite = contacts.filter((c) => selected.has(c.id));
    let success = 0;

    for (const c of toInvite) {
      try {
        await inviteMut.mutateAsync({
          event_id: eventId,
          workspace_id: currentWorkspace!.id,
          contact_id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          status: "invited",
          notes: null,
          eventTitle,
          eventDate,
          eventLocation,
          eventLink,
        });
        success++;
      } catch {
        // continue
      }
    }

    toast.success(`${success} convites enviados!`);
    setSending(false);
    setSelected(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Convidar contactos
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar contactos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {selected.size > 0 && (
          <Badge variant="secondary" className="w-fit">
            {selected.size} selecionado{selected.size > 1 ? "s" : ""}
          </Badge>
        )}

        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum contacto encontrado
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selected.has(c.id)}
                    onCheckedChange={() => toggleContact(c.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.email || c.phone || "—"}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </ScrollArea>

        <Button
          onClick={handleBulkInvite}
          disabled={selected.size === 0 || sending}
          className="w-full gap-1.5"
        >
          {sending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> A enviar...</>
          ) : (
            <>Convidar {selected.size > 0 ? `(${selected.size})` : ""}</>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
