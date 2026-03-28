

# Formulário Funcional para Criação de Verticais

## Problema

O formulário atual de criação de verticais tem apenas 4 campos básicos (Nome, Slug, Descrição, Cor). Uma vertical é um conceito estratégico de mercado que precisa de muito mais dados para ser operacional — público-alvo, keywords, ícone, configurações de funil default, etc.

## Campos Atuais na BD
`name`, `slug`, `description`, `color_theme`, `status`

## Nova Estrutura

### 1. Migração DB — Novos Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `icon` | text | Nome do ícone Lucide |
| `target_audience` | text | Descrição do público-alvo |
| `keywords` | text[] | Keywords SEO / pesquisa |
| `pain_points` | text[] | Dores do público |
| `value_proposition` | text | Proposta de valor principal |
| `avg_ticket` | numeric | Ticket médio estimado |
| `market_size` | text | Tamanho do mercado (pequeno/médio/grande) |
| `priority` | integer | Prioridade 1-5 |
| `logo_url` | text | Logo/imagem da vertical |
| `default_cta` | text | CTA padrão dos funis |
| `notes` | text | Notas internas |

### 2. Formulário com Tabs (Dialog max-w-2xl)

**Tab "Identidade"**:
- Nome, Slug (auto-gerado), Descrição
- Seletor de ícone (grid de ícones Lucide populares)
- Color picker, Logo upload

**Tab "Mercado"**:
- Público-alvo (textarea)
- Dores do público (tag input)
- Proposta de valor
- Ticket médio, Tamanho do mercado (select)
- Prioridade (estrelas 1-5)

**Tab "SEO & Funis"**:
- Keywords (tag input)
- CTA padrão
- Notas internas
- Status (ativo/inativo)

### 3. Componente Separado

Extrair o formulário para `src/components/funnels/CreateVerticalDialog.tsx` — componente reutilizável com suporte a criação e edição.

### Ficheiros

- **Migração SQL**: ALTER TABLE verticals ADD COLUMN para cada novo campo
- **Novo**: `src/components/funnels/CreateVerticalDialog.tsx`
- **Editado**: `src/components/funnels/FunnelsList.tsx` — substituir dialog inline pelo novo componente
- **Editado**: `src/hooks/useVerticals.ts` — suportar novos campos no create/update

