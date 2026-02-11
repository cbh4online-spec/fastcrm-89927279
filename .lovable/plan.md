

# Personalizar o Link da Loja

## Problema atual
O URL da loja usa o UUID do workspace (ex: `/store/4922cf61-d03b-4ac9-...`), que e impossivel de memorizar ou partilhar de forma profissional.

## Solucao
Permitir que cada workspace defina um slug personalizado para a sua loja (ex: `/store/minha-loja`). O slug e editavel nas configuracoes da loja.

## Como vai funcionar
- Nas configuracoes da loja, aparece um campo "Link da Loja" onde o utilizador escreve o slug desejado (ex: `minha-loja-online`)
- O URL final fica: `https://fastcrm.lovable.app/store/minha-loja-online`
- O QR Code e os links de partilha usam automaticamente o novo slug
- Links antigos com UUID continuam a funcionar (retrocompatibilidade)

## Seccao Tecnica

### Migracao SQL
Adicionar coluna `store_slug` a tabela `store_settings` com indice unico:

```sql
ALTER TABLE public.store_settings 
  ADD COLUMN store_slug TEXT;

CREATE UNIQUE INDEX idx_store_settings_slug 
  ON public.store_settings(store_slug) 
  WHERE store_slug IS NOT NULL;
```

### Novo hook -- `useResolveStoreWorkspace`
Cria um hook que recebe o parametro da URL e resolve para `workspace_id`:
1. Se o valor parece um UUID, usa diretamente
2. Senao, procura na tabela `store_settings` por `store_slug`
3. Fallback: procura na tabela `workspaces` por `slug`

### Ficheiros a modificar

| Ficheiro | Alteracao |
|---|---|
| `src/hooks/useStoreSettings.ts` | Adicionar hook `useResolveStoreWorkspace` e incluir `store_slug` no form |
| `src/pages/StoreSettingsPage.tsx` | Adicionar campo editavel para o slug da loja com preview do URL |
| `src/pages/store/StorePage.tsx` | Usar `useResolveStoreWorkspace` para resolver slug para workspace_id |
| `src/pages/store/StoreProductPage.tsx` | Idem |
| `src/pages/store/StoreCheckoutPage.tsx` | Idem |
| `src/pages/store/StoreSuccessPage.tsx` | Idem |
| Restantes paginas `/store/*` | Idem -- resolver slug |
| `src/components/store-settings/StoreShareCard.tsx` | Usar o slug personalizado no URL exibido |

### Logica de resolucao (pseudo-codigo)
```text
URL param = "minha-loja"
  -> e UUID? Nao
  -> procurar store_settings WHERE store_slug = "minha-loja"
  -> encontrou? Sim -> workspace_id = resultado.workspace_id
  -> usar workspace_id para todas as queries
```

### Validacao do slug
- Apenas letras minusculas, numeros e hifens
- Minimo 3 caracteres
- Verificar unicidade antes de guardar
- Slugs reservados bloqueados (ex: "admin", "api", "checkout")

