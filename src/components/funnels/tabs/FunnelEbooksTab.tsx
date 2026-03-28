import { useState } from "react";
import { BookOpen, Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useFunnelEbooks, useAddFunnelEbook, useRemoveFunnelEbook } from "@/hooks/useFunnelEbooks";
import { useEbooks } from "@/hooks/useEbooks";

const POSITION_LABELS: Record<string, string> = {
  lead_magnet: "Lead Magnet",
  bonus: "Bónus",
  main: "Principal",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

interface FunnelEbooksTabProps {
  funnelId: string;
}

export function FunnelEbooksTab({ funnelId }: FunnelEbooksTabProps) {
  const { data: ebooks = [], isLoading } = useFunnelEbooks(funnelId);
  const { data: allEbooks = [] } = useEbooks();
  const addEbook = useAddFunnelEbook();
  const removeEbook = useRemoveFunnelEbook();

  const [addOpen, setAddOpen] = useState(false);
  const [selectedEbookId, setSelectedEbookId] = useState("");
  const [position, setPosition] = useState("lead_magnet");
  const [searchTerm, setSearchTerm] = useState("");

  const existingEbookIds = new Set(ebooks.map((fe: any) => fe.ebook_id));
  const availableEbooks = allEbooks.filter(
    (e) => !existingEbookIds.has(e.id) &&
    (searchTerm === "" || e.title?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAdd = async () => {
    if (!selectedEbookId) return;
    await addEbook.mutateAsync({ funnel_id: funnelId, ebook_id: selectedEbookId, position });
    setAddOpen(false);
    setSelectedEbookId("");
    setPosition("lead_magnet");
    setSearchTerm("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">eBooks do Funil</h3>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar eBook
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-muted-foreground">A carregar...</Card>
      ) : !ebooks.length ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
          <h4 className="font-medium mb-1">Sem eBooks associados</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Associa eBooks a este funil como lead magnets ou bónus
          </p>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar eBook
          </Button>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Posição</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ebooks.map((fe: any) => (
                <TableRow key={fe.id}>
                  <TableCell className="font-medium">{fe.ebooks?.title ?? fe.ebook_id}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{STATUS_LABELS[fe.ebooks?.status] || fe.ebooks?.status || "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{POSITION_LABELS[fe.position] || fe.position}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEbook.mutate({ id: fe.id, funnelId })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) { setSearchTerm(""); setSelectedEbookId(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar eBook ao Funil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>eBook</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setSelectedEbookId(""); }}
                  placeholder="Pesquisar eBook por título..."
                  className="pl-9"
                />
              </div>
              {(searchTerm || selectedEbookId) && (
                <div className="mt-2 max-h-48 overflow-y-auto border rounded-md bg-popover">
                  {availableEbooks.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      Nenhum eBook encontrado
                    </div>
                  ) : (
                    availableEbooks.slice(0, 20).map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between ${
                          selectedEbookId === e.id ? "bg-accent font-medium" : ""
                        }`}
                        onClick={() => { setSelectedEbookId(e.id); setSearchTerm(e.title); }}
                      >
                        <span className="font-medium">{e.title}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{STATUS_LABELS[e.status] || e.status}</Badge>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div>
              <Label>Posição</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead_magnet">Lead Magnet</SelectItem>
                  <SelectItem value="bonus">Bónus</SelectItem>
                  <SelectItem value="main">Principal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={!selectedEbookId || addEbook.isPending}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
