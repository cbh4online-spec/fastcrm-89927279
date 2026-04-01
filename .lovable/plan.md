

# Plano: Corrigir visibilidade do módulo Figma MCP

## Diagnóstico

Após revisão exaustiva do código, **todas as alterações estão correctamente implementadas**:

1. **Rota** (`src/routes/sales/MarketingRoutes.tsx` linha 26): `/dashboard/landing-pages` → `<LandingPages />` — sem redirect
2. **Manifest** (`src/config/routeManifest.ts` linha 188): entrada `landing-pages` no grupo `marketing`, sem `moduleSlug` (sempre visível), `visibleInSidebar: true`
3. **FunnelsList** (`src/components/funnels/FunnelsList.tsx` linha 52): importa e usa `FigmaMCPGenerateDialog`
4. **Sidebar** (`AdaptiveSidebar.tsx`): usa `buildSidebarSections` que lê o manifest — filtra apenas por `moduleSlug` e `menuKey`, nenhum dos quais está definido para `landing-pages`

## Problema Real

O preview está a retornar **HTTP 412** (precondition failed) — o que indica um **erro de build** que impede o carregamento de toda a aplicação. Isto não é específico do Figma MCP — nenhuma página funciona.

## Solução

Verificar e corrigir o erro de build que está a bloquear o preview. As causas mais prováveis:

1. **Import circular ou ficheiro ausente** — algum dos ficheiros recém-criados (`SectionBlockEditor.tsx`, `useLandingPageSections.ts`, `figmaSectionMapper.ts`) pode ter um problema de importação
2. **Tipo TypeScript incompatível** — o `as unknown as BuilderBlock[]` em `useLandingPageSections.ts` pode não ser suficiente se o Supabase types não reflectirem a tabela correctamente

### Alterações necessárias

| Ficheiro | Acção |
|---|---|
| `src/hooks/useLandingPageSections.ts` | Verificar e corrigir cast de tipos — usar type assertion segura com os campos da tabela `landing_page_sections` definidos no types.ts |
| Build logs | Verificar erros de compilação Vite no dev-server log |

### Detalhe

O hook `useLandingPageSections.ts` faz `as unknown as BuilderBlock[]` — mas como a tabela `landing_page_sections` já está nas types do Supabase (confirmado), o cast deveria funcionar. No entanto, se o campo `mapping_confidence` no tipo Supabase é `string | null` mas o `BuilderBlock` espera `"high" | "medium" | "low" | null`, isto pode gerar um erro silencioso em modo strict.

**Fix**: Alterar o tipo `mapping_confidence` em `BuilderBlock` para `string | null` em vez de union literal, ou manter o `as unknown as` que já está presente.

Se o build error é noutro ficheiro, será necessário inspecionar o log do dev-server (`/tmp/dev-server-logs/dev-server.log`) para identificar a causa exacta.

## Critérios de Aceitação

1. Preview carrega sem HTTP 412
2. Sidebar mostra "Landing Pages" no grupo Marketing
3. `/dashboard/landing-pages` renderiza a lista com botão "Gerar via Figma MCP"
4. Em `/dashboard/funnels`, o dropdown "Novo" mostra "Gerar via MCP"

