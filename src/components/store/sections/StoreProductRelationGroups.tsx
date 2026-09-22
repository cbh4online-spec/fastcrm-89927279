/**
 * Bloco unificado de relações comerciais aprovadas na ficha pública de produto.
 *
 * Fonte única: relações validadas no back-office. Preço, IVA, stock e imagens
 * vêm sempre do produto real. Agrupamento com intenção comercial explícita:
 * - Acessórios e complementos essenciais (cross-sell, adicionar em 1 clique)
 * - Gama superior (up-sell, com a diferença de investimento)
 * - Opções mais acessíveis / equivalentes (down-sell, para nunca perder a venda)
 */
import { Link } from "react-router-dom";
import { Package, Plus, ArrowUpRight, PiggyBank, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { StoreVatLabel } from "@/components/store/StoreVatLabel";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import type { StoreRelationItem } from "@/hooks/store/useStoreProductRelations";

const RELATION_LABEL: Record<string, string> = {
  required: "Necessário",
  accessory: "Acessório",
  bundle: "Compram juntos",
  compatible: "Compatível",
  upgrade: "Versão superior",
  alternative: "Alternativa",
  related: "Relacionado",
};

interface GroupProps {
  items: StoreRelationItem[];
  workspaceSlug: string;
  /** Mostra a diferença de preço face ao produto atual. */
  showDelta?: boolean;
  allowAddToCart?: boolean;
}

function RelationCard({
  item,
  workspaceSlug,
  showDelta,
  allowAddToCart,
}: {
  item: StoreRelationItem;
  workspaceSlug: string;
  showDelta?: boolean;
  allowAddToCart?: boolean;
}) {
  const { addItem } = useStoreCart();

  const handleAdd = () => {
    addItem({
      productId: item.id,
      name: item.name,
      price: item.price,
      currency: item.currency,
      image: item.image,
      sku: item.sku,
    });
    toast.success(`${item.name} adicionado ao carrinho`);
  };

  const delta = item.priceDelta;

  return (
    <div className="flex w-48 flex-shrink-0 flex-col rounded-xl border p-3">
      <Link
        to={`/store/${workspaceSlug}/product/${item.slug || item.id}`}
        className="group block"
      >
        <div className="h-32 w-full overflow-hidden rounded-lg bg-muted">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-6 w-6 text-muted-foreground/30" />
            </div>
          )}
        </div>
        <p className="mt-2 line-clamp-2 text-xs font-medium">{item.name}</p>
      </Link>

      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
          {RELATION_LABEL[item.relationType] || "Sugestão"}
        </Badge>
        {!item.available && (
          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
            Sob encomenda
          </Badge>
        )}
      </div>

      <div className="mt-1.5">
        <span className="text-sm font-semibold text-primary">€{formatMoney(item.price)}</span>{" "}
        <StoreVatLabel className="text-[10px]" />
      </div>

      {showDelta && typeof delta === "number" && delta !== 0 && (
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          {delta > 0 ? (
            <>
              <ArrowUpRight className="h-3 w-3" />+€{formatMoney(delta)} face a este produto
            </>
          ) : (
            <>
              <PiggyBank className="h-3 w-3" />
              Poupa €{formatMoney(Math.abs(delta))}
            </>
          )}
        </p>
      )}

      {item.reason && (
        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{item.reason}</p>
      )}

      {allowAddToCart && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 h-8 w-full text-xs"
          disabled={!item.available}
          onClick={handleAdd}
        >
          {item.available ? (
            <>
              <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
            </>
          ) : (
            "Indisponível"
          )}
        </Button>
      )}

      {!allowAddToCart && (
        <Button asChild variant="outline" size="sm" className="mt-2 h-8 w-full text-xs">
          <Link to={`/store/${workspaceSlug}/product/${item.slug || item.id}`}>Ver opção</Link>
        </Button>
      )}
    </div>
  );
}

function RelationRow({ items, workspaceSlug, showDelta, allowAddToCart }: GroupProps) {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4">
        {items.map((item) => (
          <RelationCard
            key={item.id}
            item={item}
            workspaceSlug={workspaceSlug}
            showDelta={showDelta}
            allowAddToCart={allowAddToCart}
          />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

interface StoreProductRelationGroupsProps {
  workspaceSlug: string;
  essentials: StoreRelationItem[];
  upgrades: StoreRelationItem[];
  alternatives: StoreRelationItem[];
  /** Produto principal indisponível → alternativas em primeiro lugar. */
  sourceAvailable?: boolean;
}

export function StoreProductRelationGroups({
  workspaceSlug,
  essentials,
  upgrades,
  alternatives,
  sourceAvailable = true,
}: StoreProductRelationGroupsProps) {
  if (essentials.length === 0 && upgrades.length === 0 && alternatives.length === 0) return null;

  const essentialsBlock = essentials.length > 0 && (
    <section className="mt-12" aria-labelledby="complementos-essenciais">
      <h2 id="complementos-essenciais" className="text-xl font-semibold">
        Acessórios e complementos essenciais
      </h2>
      <p className="mb-6 mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-primary" />
        Compatibilidade confirmada pela nossa equipa. Junte ao pedido em 1 clique.
      </p>
      <RelationRow items={essentials} workspaceSlug={workspaceSlug} allowAddToCart />
    </section>
  );

  const alternativesBlock = alternatives.length > 0 && (
    <section className="mt-12" aria-labelledby="alternativas-produto">
      <h2 id="alternativas-produto" className="text-xl font-semibold">
        {sourceAvailable ? "Opções mais acessíveis" : "Alternativas disponíveis agora"}
      </h2>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        {sourceAvailable
          ? "Equivalentes do mesmo segmento, caso queira reduzir o investimento."
          : "Este artigo não está disponível — estas opções equivalentes estão prontas a enviar."}
      </p>
      <RelationRow items={alternatives} workspaceSlug={workspaceSlug} showDelta />
    </section>
  );

  const upgradesBlock = upgrades.length > 0 && (
    <section className="mt-12" aria-labelledby="upgrades-produto">
      <h2 id="upgrades-produto" className="text-xl font-semibold">
        Gama superior
      </h2>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Mais desempenho por uma diferença clara de investimento.
      </p>
      <RelationRow items={upgrades} workspaceSlug={workspaceSlug} showDelta />
    </section>
  );

  return (
    <>
      {sourceAvailable ? (
        <>
          {essentialsBlock}
          {upgradesBlock}
          {alternativesBlock}
        </>
      ) : (
        <>
          {alternativesBlock}
          {essentialsBlock}
          {upgradesBlock}
        </>
      )}
    </>
  );
}
