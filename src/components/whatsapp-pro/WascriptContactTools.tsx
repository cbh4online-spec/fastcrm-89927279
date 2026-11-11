import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import { useWascriptContactActions, useWascriptLabels } from "@/hooks/useWascript";

/** Etiquetas e notas do WhatsApp Web (WAScript) para um número. */
export function WascriptContactTools({ phone: initialPhone }: { phone?: string }) {
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const labels = useWascriptLabels();
  const { labels: modify, note: createNote } = useWascriptContactActions();
  const validPhone = phone.replace(/\D/g, "").length >= 9;
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const apply = (mode: "add" | "remove") =>
    modify.mutate({ phone, addLabels: mode === "add" ? selected : [], removeLabels: mode === "remove" ? selected : [] }, {
      onSuccess: (d) => { toast.success(d.message); setSelected([]); },
      onError: (e) => toast.error((e as Error).message),
    });

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-medium flex items-center gap-2"><Tag className="h-4 w-4" /> Etiquetas e notas no WhatsApp</p>
      {!initialPhone && (
        <div className="space-y-1">
          <Label htmlFor="wascript-tools-phone" className="text-xs">Número do contacto</Label>
          <Input id="wascript-tools-phone" value={phone} maxLength={40} placeholder="912 345 678" onChange={(e) => setPhone(e.target.value)} />
        </div>
      )}
      {labels.isLoading ? (
        <p className="text-xs text-muted-foreground flex items-center gap-2" role="status"><Loader2 className="h-3 w-3 animate-spin" /> A carregar etiquetas…</p>
      ) : labels.isError ? (
        <p className="text-xs text-destructive">{(labels.error as Error).message}</p>
      ) : !labels.data?.length ? (
        <p className="text-xs text-muted-foreground">Não há etiquetas no WhatsApp Business ligado.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Etiquetas do WhatsApp">
          {labels.data.map((l) => (
            <button key={l.id} type="button" onClick={() => toggle(l.id)} aria-pressed={selected.includes(l.id)}
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Badge variant={selected.includes(l.id) ? "default" : "outline"} className="gap-1.5">
                {l.hexColor && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.hexColor }} aria-hidden />}
                {l.name} <span className="text-[10px] opacity-70">{l.count}</span>
              </Badge>
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={!validPhone || !selected.length || modify.isPending} onClick={() => apply("add")}>Aplicar</Button>
        <Button size="sm" variant="ghost" disabled={!validPhone || !selected.length || modify.isPending} onClick={() => apply("remove")}>Remover</Button>
      </div>
      <div className="space-y-1">
        <Label htmlFor="wascript-tools-note" className="text-xs">Nota para o contacto no WhatsApp</Label>
        <Textarea id="wascript-tools-note" rows={2} maxLength={4000} value={note} onChange={(e) => setNote(e.target.value)} />
        <Button size="sm" variant="outline" disabled={!validPhone || !note.trim() || createNote.isPending}
          onClick={() => createNote.mutate({ phone, text: note.trim() }, {
            onSuccess: (d) => { toast.success(d.message); setNote(""); },
            onError: (e) => toast.error((e as Error).message),
          })}>
          {createNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar nota para o WhatsApp"}
        </Button>
      </div>
    </div>
  );
}
