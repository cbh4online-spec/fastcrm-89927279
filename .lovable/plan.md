

# Plano: Tornar o módulo Figma MCP acessível

## Diagnóstico

O módulo Figma MCP está implementado mas **inacessível** por dois motivos:

1. **A rota `/dashboard/landing-pages` faz redirect para `/dashboard/funnels`** (em `src/routes/sales/MarketingRoutes.tsx`, linha 25) — a página `LandingPagesList` com o botão "Gerar via Figma MCP" nunca é renderizada
2. **A página Funnels usa o `MCPGenerateDialog` antigo** (sem o fluxo Figma com mapeamento de secções), não o novo `FigmaMCPGenerateDialog`
3. **"Landing Pages" não está no Route Manifest** — logo não aparece na sidebar

## Solução

Integrar o fluxo Figma MCP na página de **Funis** (que é onde o utilizador já trabalha) e restaurar o acesso à página Landing Pages para quem precise.

### Alterações

| Ficheiro | Acção |
|---|---|
| `src/routes/sales/MarketingRoutes.tsx` | Restaurar rota `/dashboard/landing-pages` → componente `LandingPages` (remover redirect) |
| `src/config/routeManifest.ts` | Adicionar entrada "Landing Pages" no grupo `marketing` |
| `src/components/funnels/FunnelsList.tsx` | Substituir `MCPGenerateDialog` por `FigmaMCPGenerateDialog` (o novo com fluxo Figma + mapeamento de secções) |

### Detalhe

**1. MarketingRoutes.tsx** — Substituir:
```tsx
<Route path="/dashboard/landing-pages" element={<Navigate to="/dashboard/funnels" replace />} />
```
Por:
```tsx
<Route path="/dashboard/landing-pages" element={<LandingPages />} />
```

**2. routeManifest.ts** — Adicionar no bloco MARKETING:
```tsx
e("landing-pages", "Landing Pages", "/dashboard/landing-pages", Globe, "marketing"),
```

**3. FunnelsList.tsx** — Substituir o import e uso de `MCPGenerateDialog` pelo `FigmaMCPGenerateDialog` para que o fluxo Figma completo (seleccionar provider → importar → pré-visualizar secções → gerar página) fique disponível também a partir da página de Funis.

## Critérios de Aceitação

1. Landing Pages aparece na sidebar do grupo Marketing
2. `/dashboard/landing-pages` mostra a lista de landing pages com botão "Gerar via Figma MCP"
3. Na página Funis, o botão MCP abre o fluxo Figma completo (não o diálogo antigo)
4. O fluxo Figma MCP funciona end-to-end: seleccionar provider → importar → pré-visualizar secções → gerar página → abrir no builder

