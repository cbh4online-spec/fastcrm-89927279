import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { matchesSearch } from "@/lib/search/normalize";

export type WorkItem = { id: string; label: string; sameCompany: boolean };

/** Uma só janela para criar um projeto/ticket novo já ligado à avença, ou ligar um existente. */
export function AddWorkItemDialog({ open, onOpenChange, kind, companyName, items, creating, onCreate, onPick }: {
  open: boolean; onOpenChange: (o: boolean) => void; kind: "project" | "ticket"; companyName?: string | null;
  items: WorkItem[]; creating: boolean; onCreate: (title: string) => void; onPick: (item: WorkItem) => void;
}) {
  const [tab, setTab] = useState<"new" | "existing">("new");
  const [title, setTitle] = useState("");
  const [q, setQ] = useState("");
  const noun = kind === "project" ? "projeto" : "ticket";
  useEffect(() => { if (open) { setTitle(""); setQ(""); setTab("new"); } }, [open]);

  const filtered = items.filter((i) => !q.trim() || matchesSearch(i.label, q))
    .sort((a, b) => Number(b.sameCompany) - Number(a.sameCompany));
  const valid = title.trim().length >= 3 && title.trim().length <= 200;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar {noun}</DialogTitle>
          <DialogDescription>O tempo registado neste {noun} passa a contar para a avença.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "new" | "existing")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">Criar novo</TabsTrigger>
            <TabsTrigger value="existing">Ligar existente ({items.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="new" className="space-y-2 pt-2">
            <Label htmlFor="wi-title">{kind === "project" ? "Nome do projeto" : "Assunto do ticket"}</Label>
            <Input id="wi-title" autoFocus maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === "project" ? "Ex: Campanhas Meta — novembro" : "Ex: Ajuste ao formulário de leads"}
              onKeyDown={(e) => { if (e.key === "Enter" && valid && !creating) onCreate(title.trim()); }} />
            {companyName && <p className="text-xs text-muted-foreground">Fica associado a {companyName}.</p>}
          </TabsContent>
          <TabsContent value="existing" className="space-y-2 pt-2">
            {items.length === 0 ? <p className="text-sm text-muted-foreground">Não há {noun}s por ligar. Crie um novo.</p> : (<>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Pesquisar ${noun}`} aria-label={`Pesquisar ${noun}`} />
              <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-md border border-border">
                {filtered.map((i) => (
                  <li key={i.id}>
                    <button type="button" onClick={() => onPick(i)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted">
                      <span className="truncate text-foreground">{i.label}</span>
                      {i.sameCompany && <span className="shrink-0 text-xs text-primary">Mesma empresa</span>}
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Sem resultados.</li>}
              </ul>
            </>)}
          </TabsContent>
        </Tabs>
        {tab === "new" && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button disabled={!valid || creating} onClick={() => onCreate(title.trim())}>{creating ? "A criar..." : `Criar ${noun}`}</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
