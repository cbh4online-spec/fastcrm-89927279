

# Plano: Atualizar texto de orientação no diálogo Figma MCP

## Problema

O diálogo "Gerar Landing Page via Figma MCP" indica "Configure um provider Figma em **Marketing → Integrações MCP**", mas agora a secção MCP também está disponível em **Settings → Integrações & API**. O texto deve refletir ambos os caminhos.

## Ficheiro a Alterar

| Ficheiro | Acção |
|---|---|
| `src/components/landing-pages/FigmaMCPGenerateDialog.tsx` | Atualizar texto na linha 275 |

## Detalhe

Substituir:
> Configure um provider Figma em Marketing → Integrações MCP.

Por:
> Configure um provider Figma em Marketing → Integrações MCP ou em Settings → Integrações & API.

