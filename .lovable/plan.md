

# Plano: Adicionar secção MCP/Figma na página Settings → Integrações & API

## Problema

O módulo MCP (Figma e outros providers) só está acessível em **Marketing → Integrações MCP**. O utilizador espera encontrá-lo também em **Settings → Integrações & API** (`/settings/integrations`).

## Solução

Adicionar uma nova secção "Integrações MCP" no componente `IntegrationsSettings.tsx`, reutilizando o `MCPProvidersPanel` já existente.

## Ficheiros a Alterar

| Ficheiro | Acção |
|---|---|
| `src/components/settings/sections/IntegrationsSettings.tsx` | Adicionar secção MCP com `MCPProvidersPanel` |

## Detalhe

1. Importar `MCPProvidersPanel` de `@/components/marketing/mcp/MCPProvidersPanel`
2. Importar `useWorkspace` de `@/contexts/WorkspaceContext`
3. Importar ícone `Blocks` do lucide-react
4. Adicionar entrada `integrations-mcp` ao array `visibleSections`
5. Adicionar nova `SettingsSection` com:
   - Título: "Integrações MCP"
   - Descrição: "Gerir providers MCP (Figma, etc.) para importar design systems e componentes"
   - Ícone: `Blocks`
   - Conteúdo: `<MCPProvidersPanel workspaceId={currentWorkspace?.id} />` (com guard se não há workspace)
6. Posicionar após "Videoconferência" e antes de "API & Webhooks"

