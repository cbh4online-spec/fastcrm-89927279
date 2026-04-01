

# Plano: Adicionar tooltip ao botão de Health Check MCP

## Alteração

Substituir o `title="Health Check"` do botão RefreshCw em `MCPProvidersPanel.tsx` (linha 153-165) por um componente `Tooltip` do shadcn/ui com texto explicativo: **"Verificar saúde — Testa a ligação ao servidor MCP e actualiza o estado da conexão"**.

## Ficheiro

| Ficheiro | Acção |
|---|---|
| `src/components/marketing/mcp/MCPProvidersPanel.tsx` | Adicionar import de `Tooltip, TooltipContent, TooltipProvider, TooltipTrigger` e envolver o botão de health check com tooltip |

## Detalhe

- Importar `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` de `@/components/ui/tooltip`
- Envolver o `Button` (linhas 153-165) com `TooltipProvider > Tooltip > TooltipTrigger` + `TooltipContent`
- Remover o atributo `title` nativo
- Texto do tooltip: "Verificar saúde — Testa a ligação ao servidor MCP e actualiza o estado da conexão"

