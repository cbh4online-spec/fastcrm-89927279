

# Plano: Melhorar ícones e badges de estado nos Providers MCP

## Alteração

Enriquecer visualmente a tabela de providers MCP com:
1. **Ícones por tipo de provider** na coluna "Tipo" (Figma, Git, Custom)
2. **Indicadores visuais coloridos** na coluna "Estado" (dot colorido + texto)
3. **Ícone na coluna "Nome"** para identificação rápida

## Ficheiro a Alterar

| Ficheiro | Acção |
|---|---|
| `src/components/marketing/mcp/MCPProvidersPanel.tsx` | Adicionar ícones por tipo e melhorar badges de estado |

## Detalhe Técnico

1. Importar ícones `Figma`, `GitBranch`, `Blocks`, `CircleCheck`, `CircleX`, `CircleDot` do `lucide-react`
2. Criar mapa `PROVIDER_ICONS` associando cada `provider_key` a um ícone e cor:
   - `figma` → `Figma` (roxo)
   - `git` → `GitBranch` (laranja)
   - `custom` → `Blocks` (azul)
3. Atualizar `STATUS_MAP` para incluir ícone e cor de dot:
   - `connected` → `CircleCheck` verde
   - `error` → `CircleX` vermelho
   - `unknown` → `CircleDot` cinzento
4. Na coluna "Nome", prefixar com o ícone do provider
5. Na coluna "Estado", renderizar ícone colorido + texto em vez de apenas Badge

## Impacto

- Puramente visual, sem alteração de lógica ou dados
- O componente é partilhado entre Marketing e Settings — ambas as vistas beneficiam

