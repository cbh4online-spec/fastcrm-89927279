import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Library } from "lucide-react";
import { useObjectionLibrary } from "@/hooks/useConversationQuality";

export function ObjectionLibraryDashboard() {
  const { data: items = [], isLoading } = useObjectionLibrary();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");

  const types = Array.from(new Set(items.map((i) => i.objection_type)));
  const filtered = items.filter((i) => {
    if (type !== "all" && i.objection_type !== type) return false;
    if (search && !`${i.title} ${i.description ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Library className="h-5 w-5" /> Biblioteca de Objeções
        </h2>
        <p className="text-sm text-muted-foreground">
          Objeções reais, exemplos e respostas recomendadas. Apoio à equipa comercial e suporte.
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Procurar objeção…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">A carregar…</div>}
      {!isLoading && filtered.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Ainda não existem objeções registadas. Podem ser guardadas a partir das análises de conversa.
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((o) => (
          <Card key={o.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline">{o.objection_type}</Badge>
              <div className="flex gap-1">
                {o.is_template && <Badge variant="secondary" className="text-[10px]">Modelo</Badge>}
                {o.frequency_count > 1 && <Badge className="text-[10px]">×{o.frequency_count}</Badge>}
              </div>
            </div>
            <div className="font-semibold text-sm">{o.title}</div>
            {o.description && <div className="text-xs text-muted-foreground">{o.description}</div>}
            {o.real_example && (
              <div className="text-xs italic bg-muted/50 p-2 rounded">"{o.real_example}"</div>
            )}
            {o.improved_response && (
              <div className="text-xs bg-primary/5 p-2 rounded border-l-2 border-primary">
                <div className="font-medium mb-0.5">Resposta recomendada:</div>
                {o.improved_response}
              </div>
            )}
            {o.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {o.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
