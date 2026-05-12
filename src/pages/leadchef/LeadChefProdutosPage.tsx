import { useMemo, useState } from "react";
import { Search, Hash, Package, Plus, Pencil, Trash2, EyeOff } from "lucide-react";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { LeadChefProductDialog } from "@/components/leadchef/LeadChefProductDialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  useLeadChefProducts,
  useDeleteLeadChefProduct,
  type LeadChefProductRow,
} from "@/hooks/leadchef/useLeadChefProducts";

const formatEUR = (v: number) =>
  v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

export default function LeadChefProdutosPage() {
  const { currentWorkspace, isSuperAdmin } = useWorkspace();
  const role = currentWorkspace?.role;
  const canManage = isSuperAdmin || role === "owner" || role === "admin";

  const { data: products = [], isLoading } = useLeadChefProducts(currentWorkspace?.id);
  const del = useDeleteLeadChefProduct(currentWorkspace?.id);

  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<LeadChefProductRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<LeadChefProductRow | null>(null);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    const visible = canManage ? products : products.filter((p) => p.is_active);
    if (!s) return visible;
    return visible.filter((p) => p.name.toLowerCase().includes(s));
  }, [q, products, canManage]);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (p: LeadChefProductRow) => {
    setEditing(p);
    setDialogOpen(true);
  };

  return (
    <LeadChefMobileShell
      title="Produtos"
      subtitle="Catálogo de referência — pontos e preços para consulta rápida."
      showFab={false}
    >
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar produto…"
            className="pl-9 bg-white"
          />
        </div>
        {canManage && (
          <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center text-sm text-slate-500">
          A carregar…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white border border-dashed border-slate-200 p-10 text-center">
          <Package className="h-8 w-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">
            {canManage ? "Sem produtos. Cria o primeiro." : "Nenhum produto disponível."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li
              key={p.id}
              className="rounded-2xl bg-white border border-slate-200 shadow-sm p-3 flex items-center gap-3"
            >
              <div className="h-16 w-16 shrink-0 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                <Package className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-slate-900 truncate flex-1 min-w-0">
                    {p.name}
                  </h3>
                  {p.promo && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100 text-[10px] uppercase tracking-wide">
                      Promoção
                    </Badge>
                  )}
                  {!p.is_active && (
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      <EyeOff className="h-3 w-3 mr-1" /> Inativo
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                    <Hash className="h-3 w-3" />
                    {p.points} pts
                  </span>
                  <span className="text-slate-500">{formatEUR(Number(p.price))}</span>
                  {p.category && (
                    <span className="text-slate-400">· {p.category}</span>
                  )}
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => openEdit(p)}
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-600 hover:text-red-700"
                    onClick={() => setToDelete(p)}
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-slate-400 text-center pt-2">
        {items.length} produtos · valores e pontos sujeitos a atualização
      </p>

      <LeadChefProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workspaceId={currentWorkspace?.id}
        product={editing}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove permanentemente <strong>{toDelete?.name}</strong> do catálogo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (toDelete) await del.mutateAsync(toDelete.id);
                setToDelete(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LeadChefMobileShell>
  );
}
