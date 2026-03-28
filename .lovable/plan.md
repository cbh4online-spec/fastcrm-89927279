

# Consumo de créditos nas ações IA do eBook

## Resumo
Integrar o sistema de créditos existente (`useCreditWallet`) no editor de eBooks para que cada ação de IA consuma créditos antes de executar.

## Ações IA e custos propostos

| Action Key | Label | Custo | Descrição |
|---|---|---|---|
| `ebook_generate_chapter` | Gerar Capítulo | 3 créditos | Gerar conteúdo de um capítulo com IA |
| `ebook_improve_content` | Melhorar Conteúdo | 2 créditos | Reescrever/melhorar texto existente |
| `ebook_generate_cover` | Gerar Capa IA | 5 créditos | Gerar imagem de capa com IA |
| `ebook_generate_chapter_image` | Imagem Capítulo IA | 4 créditos | Gerar imagem de capítulo com IA |

## Alterações

### 1. Migration SQL — Inserir pricing rules
- `INSERT INTO credit_pricing_rules` com as 4 action keys acima

### 2. `EbookEditor.tsx` — Integrar créditos
- Importar `useCreditWallet` e `triggerNoCreditsDialog`
- Em cada função AI (`generateCoverAI`, `generateChapterImageAI`, `generateChapterContent`, `improveContent`):
  - Verificar `canAfford(actionKey)` antes de chamar a edge function
  - Se não pode pagar → `triggerNoCreditsDialog()` e return
  - Se pode → `consumeCredits.mutateAsync({ actionKey })` antes da chamada
- Nos botões de IA, mostrar badge com custo em créditos (usando `CreditActionButton` ou badge manual)

### Ficheiros alterados
- Nova migration SQL (pricing rules)
- `src/components/ebooks/EbookEditor.tsx` (integrar credit checks)

