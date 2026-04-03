

# Expandir Suporte a Múltiplas Imagens na Importação de Produtos

## Diagnóstico

O sistema **já suporta** importação de múltiplas imagens:
- Auto-mapeamento de colunas `image_1` a `image_5`
- URLs separadas por `;` ou `,` numa única coluna
- Múltiplas colunas podem ser mapeadas manualmente para "URL da Imagem"
- Imagens são inseridas na tabela `product_images` com posição sequencial

**Lacuna identificada**: O auto-mapeamento só reconhece até `image_5`. Ficheiros de catálogo típicos podem ter 10, 15 ou até 20 colunas de imagem. Colunas como `image_6`, `image_7`, etc. ficam como "ignorar" e requerem mapeamento manual — propenso a erro.

## Alterações

| Ficheiro | Acção |
|---|---|
| `src/components/products/BatchSKUImportDialog.tsx` | Expandir padrões de auto-mapeamento para reconhecer até `image_20` dinamicamente; melhorar label no dropdown para indicar que aceita múltiplas colunas |

### Detalhe técnico

1. **Substituir os 5 padrões estáticos** (`image_2` a `image_5`) por um **único padrão regex genérico** que captura `image_N` para qualquer N:
   ```typescript
   [/^(image|img|imagem|foto|photo|url.?image|image.?url)[\s._-]?(\d+)?$/i, "image_url"]
   ```
   Isto cobre automaticamente `image_1` até `image_99`, `foto_1`, `img2`, etc.

2. **Actualizar label** no `AVAILABLE_FIELDS` de `"URL da Imagem"` para `"URL da Imagem (múltiplas)"` para tornar claro que várias colunas podem usar este campo.

3. **Sem alterações** no hook `useProducts.ts` nem na tabela `product_images` — a lógica de persistência já está completa.

