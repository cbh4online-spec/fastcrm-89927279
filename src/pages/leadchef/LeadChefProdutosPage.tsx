import { useMemo, useState } from "react";
import { Search, Hash, Package } from "lucide-react";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LEADCHEF_PRODUCTS, formatEUR } from "@/config/leadchef/products";

export default function LeadChefProdutosPage() {
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return LEADCHEF_PRODUCTS;
    return LEADCHEF_PRODUCTS.filter((p) => p.name.toLowerCase().includes(s));
  }, [q]);

  return (
    <LeadChefMobileShell
      title="Produtos"
      subtitle="Catálogo de referência — pontos e preços para consulta rápida."
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pesquisar produto…"
          className="pl-9 bg-white"
        />
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-white border border-dashed border-slate-200 p-10 text-center">
          <Package className="h-8 w-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">Nenhum produto encontrado.</p>
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
                <div className="flex items-start gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 truncate flex-1">
                    {p.name}
                  </h3>
                  {p.promo && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100 text-[10px] uppercase tracking-wide">
                      Promoção
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                    <Hash className="h-3 w-3" />
                    {p.points} pts
                  </span>
                  <span className="text-slate-500">{formatEUR(p.price)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-slate-400 text-center pt-2">
        {LEADCHEF_PRODUCTS.length} produtos · valores e pontos sujeitos a atualização
      </p>
    </LeadChefMobileShell>
  );
}
