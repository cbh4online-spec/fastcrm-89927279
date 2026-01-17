# FastCRM Design System

## Organização

Este design system segue a metodologia **Figma-to-Code** onde cada componente representa:
- Um componente reutilizável
- Uma intenção funcional
- Um comportamento esperado

---

## 00 — Foundations (Tokens)

### Cores
| Token | Uso |
|-------|-----|
| `primary` | Ações principais, links |
| `secondary` | Elementos secundários |
| `success` | Estados de sucesso, ganho |
| `warning` | Alertas, atenção |
| `destructive` | Erros, ações destrutivas |
| `info` | Informações neutras |
| `muted` | Texto secundário, placeholders |

### Tipografia
- **Font Family**: Inter
- **Heading**: text-2xl font-semibold
- **Body**: text-sm
- **Caption**: text-xs text-muted-foreground

### Espaçamentos (spacing scale)
- 4px (1)
- 8px (2)
- 16px (4)
- 24px (6)
- 32px (8)
- 48px (12)

### Border Radius
- `sm`: 4px
- `md`: 6px
- `lg`: 8px
- `full`: 9999px

---

## 01 — Componentes Base

### Buttons
- `Button` (default = primary)
- `Button variant="secondary"`
- `Button variant="outline"`
- `Button variant="ghost"`
- `Button variant="destructive"`

### Cards
- `Card` - Container base
- `Card.Entity` - Cards de Lead/Contact/Company
- `Card.KPI` - Cards de métricas
- `Card.Opportunity` - Cards do Kanban

### Badges (Status)
- `StatusBadge.Lead` - new, in_progress, completed
- `StatusBadge.Opportunity` - pipeline stages
- `StatusBadge.Temperature` - hot, warm, cold

### Inputs
- `Input` - Text input padrão
- `Textarea` - Multiline
- `Select` - Dropdown
- `Checkbox` / `Switch`

---

## 02 — Layouts (Shells)

### AppShell.Dashboard
Layout para dashboards com sidebar + header + content area

### AppShell.List
Layout para listas (Leads, Contacts, etc.) com filtros + tabela

### AppShell.Detail
Layout para detalhe de entidade com menu lateral + conteúdo

---

## 03 — Componentes de Domínio

### Entity Cards
- `EntityCard.Lead`
- `EntityCard.Contact`
- `EntityCard.Company`
- `EntityCard.Opportunity`

### Tables
- `DataTable` - Tabela genérica com sorting/filtering
- `EntityRow.Lead`
- `EntityRow.Contact`

### Dialogs
- `Dialog.Create` - Criar entidade
- `Dialog.Edit` - Editar entidade
- `Dialog.Confirm` - Confirmação de ação

---

## 04 — Estados Obrigatórios

Todo componente de lista/detalhe deve ter:
- `Empty` - Estado vazio
- `Loading` - Skeleton/Spinner
- `Error` - Mensagem de erro
- `Success` - Feedback de sucesso

---

## Convenções de Nomenclatura

### ✅ BOM (Semântico)
- `StatusBadge.Won`
- `EntityCard.Lead`
- `Button.Primary`
- `Dialog.CreateLead`

### ❌ MAU (Visual)
- `BlueButton`
- `Card1`
- `Rectangle42`

---

## Importação

```tsx
// Componentes base (shadcn)
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Componentes de domínio
import { StatusBadge } from "@/components/design-system/StatusBadge";
import { EntityCard } from "@/components/design-system/EntityCard";
import { EmptyState } from "@/components/design-system/EmptyState";
import { LoadingState } from "@/components/design-system/LoadingState";
```
