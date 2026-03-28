

# Construtor de Modelos de Proposta — Upgrade Completo

## Situação Atual

O construtor de templates é um **dialog modal de 3 tabs** (`ProposalTemplateFormDialog.tsx`) com capacidades mínimas:
- Tab Info: nome, descrição, CTA text/color
- Tab Blocos: 7 tipos básicos (texto, imagem, oferta, depoimentos, FAQ, divisor, CTA) editados com inputs simples
- Tab Preview: renderização básica sem estilização real
- Sem drag-and-drop, sem rich text, sem variáveis visuais, sem IA, sem controlo de estilos

Para um módulo onde **o cliente aceita o negócio**, isto é insuficiente.

## Plano

### 1. Construtor Full-Page (substitui o dialog)

Criar `src/components/proposals/ProposalTemplateBuilder.tsx` — página completa com layout de 3 painéis:

```text
┌──────────────┬────────────────────────┬──────────────────┐
│  SIDEBAR     │   EDITOR CENTRAL       │  LIVE PREVIEW    │
│              │                        │                  │
│ Block Palette│  Blocos editáveis      │  Preview real    │
│ (drag types) │  com rich text         │  atualizado em   │
│              │  e inline toolbar      │  tempo real      │
│ Settings     │                        │                  │
│ - Fontes     │  Cada bloco com:       │  Simula página   │
│ - Cores      │  - Drag handle         │  do cliente      │
│ - Logo       │  - Expand/collapse     │                  │
│ - Spacing    │  - Duplicate/delete    │                  │
│              │  - AI generate btn     │                  │
│ Variables    │                        │                  │
│ {{lead.name}}│                        │                  │
│ {{value}}    │                        │                  │
└──────────────┴────────────────────────┴──────────────────┘
```

### 2. Novos Tipos de Bloco (além dos 7 existentes)

| Bloco | Descrição |
|---|---|
| **Tabela de Preços** | Linhas com item, qty, preço unitário, total — com subtotal/IVA/total |
| **Equipa** | Cards de membros da equipa com foto, nome, cargo |
| **Garantia** | Ícone + texto de garantia/SLA |
| **Vídeo** | Embed YouTube/Vimeo ou URL direto |
| **Métricas/KPIs** | Grid de números destacados (ex: "500+ clientes", "98% satisfação") |
| **Assinatura** | Bloco com espaço para assinatura digital e data |

### 3. Painel de Estilos do Template

- **Cores**: primária, secundária, fundo, texto — com presets (Profissional, Moderno, Minimalista)
- **Tipografia**: font-family do título e corpo (sistema de fontes web-safe)
- **Logo**: upload de logo da empresa para o cabeçalho
- **Espaçamento**: compacto / normal / espaçoso

Estes estilos são guardados no campo `styles` (JSON) que já existe na tabela.

### 4. Geração IA por Bloco

Cada bloco ganha um botão "✨ Gerar com IA" que:
- Usa o contexto do template (nome, descrição, tipo de negócio)
- Gera conteúdo apropriado ao tipo de bloco (texto persuasivo, FAQs relevantes, features da oferta)
- Reutiliza o `AIProposalGenerator` e `useGenerateProposalCopy` já existentes

### 5. Variáveis Visuais

Sidebar com lista clicável de variáveis disponíveis:
- `{{lead.name}}`, `{{lead.email}}`, `{{company.name}}`
- `{{opportunity.title}}`, `{{opportunity.value}}`
- `{{proposal.date}}`, `{{proposal.expiry}}`

Click insere no campo ativo. Preview mostra com valores de exemplo.

### 6. Routing

- Na tab "Modelos", clicar "Novo Modelo" ou editar um modelo navega para `/dashboard/proposals/templates/new` ou `/dashboard/proposals/templates/:id`
- Full-page builder com botão "Voltar" que retorna à lista

## Ficheiros

| Ficheiro | Ação |
|---|---|
| `src/components/proposals/ProposalTemplateBuilder.tsx` | **Criar** — construtor full-page com 3 painéis |
| `src/components/proposals/template-builder/BlockPalette.tsx` | **Criar** — sidebar com blocos arrastáveis |
| `src/components/proposals/template-builder/StyleSettings.tsx` | **Criar** — painel de estilos (cores, fontes, logo) |
| `src/components/proposals/template-builder/VariablesPicker.tsx` | **Criar** — lista de variáveis clicáveis |
| `src/components/proposals/template-builder/BlockAIButton.tsx` | **Criar** — botão IA por bloco |
| `src/components/proposals/ProposalContentBlocks.tsx` | **Modificar** — adicionar novos tipos de bloco e melhorar editores |
| `src/components/proposals/ProposalTemplateFormDialog.tsx` | **Manter** — para quick edits, mas principal fluxo vai para builder |
| `src/components/proposals/ProposalTemplatesList.tsx` | **Modificar** — navegar para builder em vez de abrir dialog |
| `src/pages/ProposalTemplateBuilderPage.tsx` | **Criar** — página wrapper com DashboardLayout |
| `src/App.tsx` | **Modificar** — adicionar rota `/dashboard/proposals/templates/:id` |

## Detalhe Técnico

- Reutiliza o `RichTextEditor` do email-builder (`src/components/email-builder/RichTextEditor.tsx`) para edição de texto rica
- Estilos guardados no campo `styles` (JSONB) existente em `proposal_templates`
- Novos block types adicionados ao union type `ContentBlock['type']` em `src/types/proposal.ts`
- Preview usa o `ProposalPreview` existente, envolvido num iframe-like container com escala

