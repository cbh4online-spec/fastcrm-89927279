
# Plano: Redesenho Completo do Editor de Propostas

## Visão Geral

Transformar o dialog de edição de propostas numa experiência imersiva estilo wizard/stepper com secções dedicadas e navegação intuitiva. O objectivo é criar uma interface premium, responsiva e fácil de usar.

## Nova Arquitectura de Secções

| # | Secção | Descrição | Ícone |
|---|--------|-----------|-------|
| 1 | **Itens** | Interface POS para selecção de produtos | ShoppingCart |
| 2 | **Âmbito** | Descrição do projecto, objectivos e entregáveis | Target |
| 3 | **Cronograma** | Timeline de entregas e marcos | CalendarDays |
| 4 | **Condições** | Pagamento, validade e termos | FileCheck |
| 5 | **Referências** | Casos de sucesso e testemunhos | Award |
| 6 | **Cliente** | Dados de facturação e contacto | Users |

---

## Componentes a Criar

### 1. ProposalScopeSection.tsx (Novo)
Secção para definir o âmbito do projecto:
- Objectivos principais (texto rico)
- Entregáveis esperados (lista editável)
- Exclusões (o que não está incluído)
- Pressupostos do projecto

```text
┌─────────────────────────────────────────────────────────┐
│ ÂMBITO DO PROJECTO                                      │
├─────────────────────────────────────────────────────────┤
│ Objectivos                                              │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [Textarea expandível com os objectivos...]        │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Entregáveis        ┌────────────────────────────────┐   │
│ + Adicionar        │ • Design do website           │   │
│                    │ • 5 páginas responsivas       │   │
│                    │ • Integração com CRM          │   │
│                    └────────────────────────────────┘   │
│                                                         │
│ Exclusões          ┌────────────────────────────────┐   │
│ + Adicionar        │ • Hospedagem                  │   │
│                    │ • Conteúdo fotográfico        │   │
│                    └────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 2. ProposalTimelineSection.tsx (Novo)
Cronograma visual com marcos e datas:
- Visualização tipo timeline vertical
- Fases do projecto com datas
- Marcos (milestones) importantes
- Duração estimada total

```text
┌─────────────────────────────────────────────────────────┐
│ CRONOGRAMA                              Duração: 45 dias│
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ○─────── Fase 1: Descoberta ─────────── 7 dias       │
│   │        Levantamento de requisitos                   │
│   │                                                     │
│   ○─────── Fase 2: Design ─────────────── 14 dias      │
│   │        Wireframes e protótipos                      │
│   │                                                     │
│   ●─────── Marco: Aprovação Design ────── Semana 3     │
│   │                                                     │
│   ○─────── Fase 3: Desenvolvimento ────── 21 dias      │
│   │        Implementação e testes                       │
│   │                                                     │
│   ●─────── Entrega Final ──────────────── Semana 6     │
│                                                         │
│   [+ Adicionar Fase]   [+ Adicionar Marco]              │
└─────────────────────────────────────────────────────────┘
```

### 3. ProposalReferencesSection.tsx (Novo)
Casos de sucesso e credibilidade:
- Selecção de projectos anteriores
- Testemunhos de clientes
- Certificações e prémios
- Logos de clientes

```text
┌─────────────────────────────────────────────────────────┐
│ REFERÊNCIAS E CASOS DE SUCESSO                          │
├─────────────────────────────────────────────────────────┤
│ Projectos Similares                                     │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│ │ Imagem   │ │ Imagem   │ │ Imagem   │                 │
│ │ Projeto1 │ │ Projeto2 │ │ Projeto3 │                 │
│ └──────────┘ └──────────┘ └──────────┘                 │
│                                                         │
│ Testemunho                                              │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ "Excelente trabalho..."                             │ │
│ │ — João Silva, CEO da Empresa X                      │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Certificações                                           │
│ [Google Partner] [Meta Business] [ISO 9001]             │
└─────────────────────────────────────────────────────────┘
```

---

## Layout Responsivo - Navegação por Steps

### Desktop (lg+)
```text
┌──────────────────────────────────────────────────────────────────────┐
│ Header: Título da Proposta + Status + Acções                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─ Steps Horizontais ────────────────────────────────────────────┐  │
│  │ ① Itens  ② Âmbito  ③ Cronograma  ④ Condições  ⑤ Refs  ⑥ Cliente │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │                     Conteúdo da Secção                         │  │
│  │                     (altura flexível)                          │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ [Anterior]                                           [Próximo] │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Mobile (sm)
```text
┌────────────────────────┐
│ Header Compacto        │
├────────────────────────┤
│ ┌────────────────────┐ │
│ │ Step 2/6: Âmbito   │ │
│ │ [●●○○○○]           │ │
│ └────────────────────┘ │
│                        │
│ ┌────────────────────┐ │
│ │                    │ │
│ │    Conteúdo        │ │
│ │    (scroll)        │ │
│ │                    │ │
│ └────────────────────┘ │
│                        │
│ [←]              [→]   │
└────────────────────────┘
```

---

## Alterações aos Componentes Existentes

### POSProposalItemsEditor.tsx
- Melhorar responsividade: stack vertical em mobile
- Grelha 6 colunas (selector) + 6 colunas (cart) em desktop
- Stack completo em mobile com cart no topo

### ProposalConditionsSection.tsx
- Já existe, apenas reorganizar layout
- Manter funcionalidade actual

### ProposalClientSection.tsx
- Já existe, manter como está

---

## Migração de Base de Dados

Adicionar colunas JSONB para os novos dados:

```sql
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS scope_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS timeline_data JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS references_data JSONB DEFAULT '{}';
```

Estrutura dos dados:
```json
// scope_data
{
  "objectives": "Texto dos objectivos...",
  "deliverables": ["Item 1", "Item 2"],
  "exclusions": ["Item 1", "Item 2"],
  "assumptions": "Pressupostos..."
}

// timeline_data
[
  { "type": "phase", "title": "Descoberta", "duration": 7, "description": "..." },
  { "type": "milestone", "title": "Aprovação", "week": 3 }
]

// references_data
{
  "projects": [{ "title": "...", "image": "...", "description": "..." }],
  "testimonial": { "quote": "...", "author": "...", "company": "..." },
  "certifications": ["Google Partner", "ISO 9001"]
}
```

---

## Ficheiros a Criar/Modificar

| Ficheiro | Acção | Descrição |
|----------|-------|-----------|
| `ProposalScopeSection.tsx` | Criar | Nova secção de âmbito |
| `ProposalTimelineSection.tsx` | Criar | Nova secção de cronograma |
| `ProposalReferencesSection.tsx` | Criar | Nova secção de referências |
| `ProposalStepNavigation.tsx` | Criar | Navegação por steps responsiva |
| `ProposalDetailDialog.tsx` | Modificar | Integrar nova navegação e secções |
| `POSProposalItemsEditor.tsx` | Modificar | Melhorar responsividade |
| `useProposals.ts` | Modificar | Suporte para novos campos |
| `src/types/proposal.ts` | Modificar | Novos tipos para dados |
| Migração SQL | Criar | Adicionar colunas scope_data, timeline_data, references_data |

---

## Detalhes Técnicos

### Gestão de Estado
O dialog principal mantém o estado de todas as secções:
```typescript
const [scopeData, setScopeData] = useState<ScopeData>({ ... });
const [timelineData, setTimelineData] = useState<TimelinePhase[]>([]);
const [referencesData, setReferencesData] = useState<ReferencesData>({ ... });
```

### Navegação Fluida
- Indicador de progresso visual (dots ou barra)
- Navegação por teclado (setas esquerda/direita)
- Swipe em mobile
- Botões Anterior/Próximo contextua

### Validação por Secção
- Validação antes de avançar
- Indicador visual de secções completas/incompletas
- Guardar rascunho automático

---

## Estimativa de Esforço

| Componente | Linhas estimadas |
|------------|------------------|
| ProposalScopeSection.tsx | ~200 |
| ProposalTimelineSection.tsx | ~280 |
| ProposalReferencesSection.tsx | ~220 |
| ProposalStepNavigation.tsx | ~150 |
| Modificações ProposalDetailDialog.tsx | ~200 |
| Modificações POSProposalItemsEditor.tsx | ~80 |
| Modificações types/hooks | ~60 |
| Migração SQL | ~20 |
| **Total** | ~1200 linhas |
