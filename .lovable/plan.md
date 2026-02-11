

# Isolar "Visto Recentemente" por workspace

## Problema
O hook `useRecentlyViewed` guarda todos os produtos visitados numa unica chave `localStorage` (`store-recently-viewed`), sem separacao por loja/workspace. Isso faz com que produtos de uma loja aparecam na seccao "Visto recentemente" de outra loja (como os "FASTCRM AGENCY/PRO/BASIC" que aparecem na loja de equipamentos).

## Solucao
Separar o `localStorage` por `workspaceId`, de forma que cada loja tenha o seu proprio historico de produtos visitados.

## Seccao Tecnica

### Ficheiros a alterar

**1. `src/hooks/useRecentlyViewed.ts`**
- Aceitar `workspaceId` como parametro obrigatorio
- Usar chave `localStorage` com namespace: `store-recently-viewed-{workspaceId}`
- Ler e gravar apenas no namespace do workspace atual

**2. `src/pages/store/StoreProductPage.tsx`**
- Passar o `workspaceId` ao chamar `useRecentlyViewed(workspaceId)`

**3. `src/pages/store/StorePage.tsx`**
- Passar o `workspaceId` ao chamar `useRecentlyViewed(workspaceId)`

### Exemplo da alteracao principal

```typescript
// useRecentlyViewed.ts
const STORAGE_KEY_PREFIX = "store-recently-viewed-";

export function useRecentlyViewed(workspaceId: string) {
  const storageKey = `${STORAGE_KEY_PREFIX}${workspaceId}`;
  
  const [items, setItems] = useState<RecentlyViewedItem[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addItem = useCallback((item: Omit<RecentlyViewedItem, "viewedAt">) => {
    setItems((prev) => {
      const filtered = prev.filter((p) => p.id !== item.id);
      const updated = [{ ...item, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
      try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [storageKey]);

  return { items, addItem };
}
```

Sem alteracoes na base de dados. Apenas 3 ficheiros de frontend a modificar.
