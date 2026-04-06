

# Corrigir Pesquisa de Preços de Concorrentes

## Diagnóstico

O problema é claro no screenshot: um produto de **€449.50** mostra preços concorrentes de **€4.84** e **€28.11** — valores obviamente errados. A causa raiz está nas edge functions `compare-prices` e `auto-price-monitor`:

1. **Extração de preços naive**: A função `extractPrices()` usa regex para capturar QUALQUER preço no texto da página (markdown). Isto apanha preços de portes, acessórios, produtos não relacionados, breadcrumbs, etc.
2. **Sem filtro de preço mínimo**: Existe um `maxPrice` (5x o preço base), mas **não existe um `minPrice`**. Um produto de €449 aceita preços de €4.84 como válidos.
3. **Sem validação de relevância**: Não verifica se a página encontrada é realmente sobre o mesmo produto — pode ser uma página de categoria com dezenas de preços diferentes.
4. **Pega sempre o preço mais baixo**: `Math.min(...prices)` garante que apanha o pior valor possível (portes, desconto de cupão, preço de acessório).

## Solução

Aplicar a mesma abordagem inteligente que o `ai-market-price-research` já usa (AI para extrair preços com contexto), mas adaptada para o fluxo automático de comparação.

### Alterações em `compare-prices/index.ts` e `auto-price-monitor/index.ts`:

1. **Adicionar filtro de preço mínimo**: Rejeitar preços abaixo de 30% do preço base do produto (um concorrente legítimo não vende a 1% do preço).
2. **Usar AI para validação de relevância**: Enviar o texto de cada resultado ao Gemini Flash para confirmar se é o mesmo produto e extrair o preço correto (igual ao que `ai-market-price-research` já faz).
3. **Fallback para regex filtrado**: Se AI não estiver disponível, manter o regex mas com o filtro min/max robusto.
4. **Melhorar a query de pesquisa**: Incluir SKU/EAN na pesquisa quando disponível para resultados mais precisos.

### Detalhes técnicos

**Novo fluxo de extração (ambas as edge functions):**

```text
Firecrawl Search → Para cada resultado:
  1. AI valida: "Este resultado é sobre o produto X? Qual o preço de venda?"
     → Retorna { is_match: bool, price: number, store_name: string }
  2. Se AI indisponível: regex com filtro min (30% base_price) e max (3x base_price)
  3. Descartar resultados onde is_match = false
```

**Filtro minPrice**:
- `minPrice = product.base_price * 0.3` (nenhum concorrente vende a menos de 30% do preço)
- `maxPrice = product.base_price * 3` (reduzir de 5x para 3x para menos falsos positivos)

**Ficheiros a editar:**
| Ficheiro | Alteração |
|---|---|
| `supabase/functions/compare-prices/index.ts` | Adicionar minPrice, validação AI, melhorar query |
| `supabase/functions/auto-price-monitor/index.ts` | Mesmas correções de extração |

### Critérios de aceitação
- Preços abaixo de 30% do preço base são rejeitados automaticamente
- AI valida se o resultado é realmente o mesmo produto antes de aceitar o preço
- Fallback para regex filtrado quando AI não está disponível
- Logs claros de preços rejeitados para debugging
- Produto de €449.50 nunca mostra preços de €4.84 ou €28.11

