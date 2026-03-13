import { useState } from "react";
import { useCheckoutFunnels } from "@/hooks/useCheckoutFunnels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ExternalLink, Pencil, Trash2, Loader2, GitBranch } from "lucide-react";
import { toast } from "sonner";

export default function CheckoutFunnelsPage() {
  const { funnels, createFunnel, deleteFunnel } = useCheckoutFunnels();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  function handleCreate() {
    if (!name || !slug) { toast.error("Preencha nome e slug"); return; }
    createFunnel.mutate({ name, slug: slug.toLowerCase().replace(/\s+/g, "-") }, {
      onSuccess: () => { setOpen(false); setName(""); setSlug(""); },
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Funis de Checkout</h1>
          <p className="text-muted-foreground">Gere os seus funis de venda com upsells e downsells</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo Funil</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Funil</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-")); }} placeholder="Black Friday Oferta" />
              </div>
              <div className="space-y-2">
                <Label>Slug (URL)</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="black-friday" />
                <p className="text-xs text-muted-foreground">/checkout/{slug || "slug"}</p>
              </div>
              <Button onClick={handleCreate} disabled={createFunnel.isPending} className="w-full">
                {createFunnel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {funnels.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : !funnels.data?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <GitBranch className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum funil criado</p>
            <Button variant="outline" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Criar primeiro funil</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {funnels.data.map((f: any) => (
            <Card key={f.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{f.name}</CardTitle>
                  <Badge variant={f.is_active ? "default" : "secondary"}>
                    {f.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">/checkout/{f.slug}</p>
                {f.description && <p className="text-sm text-muted-foreground">{f.description}</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/checkout/${f.slug}`} target="_blank" rel="noopener">
                      <ExternalLink className="mr-1 h-3 w-3" /> Preview
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteFunnel.mutate(f.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
