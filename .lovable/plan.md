

# Plano: Dropdown "Add Tab" com Opções de Record Tabs

## Analise do Screenshot

O screenshot mostra que ao clicar em **"+ Add tab"**, aparece um **dropdown menu** com opções de tabs relacionadas que podem ser adicionadas dinamicamente:

- Associated people
- Associated company
- Billing admin
- Workspace
- Key Contact
- Partner

Atualmente, o botão "+ Add tab" apenas mostra um toast "Em breve". A melhoria é transformá-lo num dropdown funcional com opções de tabs.

## Estado Atual vs Melhoria

| Funcionalidade | Estado Atual | Melhoria |
|---|---|---|
| "+ Add tab" | Toast "Em breve" | Dropdown com opções de record tabs |
| Tabs dinâmicas | Estáticas (hardcoded) | Tabs que podem ser adicionadas/removidas |
| Record tab options | Não existe | Lista de: Associated people, Associated company, Billing admin, Workspace, Key Contact, Partner |

## Componentes a Editar

### 1. `OpportunityDetailPage.tsx` -- **EDIT**
- Substituir o `Button` "+ Add tab" por um `DropdownMenu` com as opções do screenshot
- Manter state local `additionalTabs` para tabs adicionadas dinamicamente
- Quando o user seleciona uma opção, adicionar a tab correspondente à lista de tabs visíveis
- Tabs adicionadas dinamicamente aparecem na TabsList com dot colorido e badge
- Cada opção no dropdown tem ícone e label (ex: `Users` → "Associated people", `Building2` → "Associated company", etc.)
- Opções já adicionadas ficam desabilitadas no dropdown

### 2. `OpportunityDetailSidebar.tsx` -- **EDIT (minor)**
- Nenhuma alteração estrutural necessária, mas garantir que a sidebar tem um campo "Key Contact" disponível para quando essa tab for adicionada

### 3. i18n keys -- **EDIT**
- Adicionar ~6 novas keys para as opções do dropdown

## Detalhes Tecnicos

### Dropdown "+ Add tab"
```text
┌──────────────────────┐
│ 👥 Associated people │
│ 🏢 Associated company│
│ 💳 Billing admin     │
│ 🏠 Workspace         │
│ 👤 Key Contact       │
│ 🤝 Partner           │
└──────────────────────┘
```

### State de tabs dinâmicas
```typescript
const [additionalTabs, setAdditionalTabs] = useState<string[]>([]);

const ADD_TAB_OPTIONS = [
  { id: "people", label: "Associated people", icon: Users },
  { id: "company", label: "Associated company", icon: Building2 },
  { id: "billing", label: "Billing admin", icon: CreditCard },
  { id: "workspace", label: "Workspace", icon: LayoutGrid },
  { id: "keycontact", label: "Key Contact", icon: UserCheck },
  { id: "partner", label: "Partner", icon: Handshake },
];
```

- Tabs que já existem por defeito (people, company) ficam desabilitadas no dropdown
- Tabs novas (billing, workspace, keycontact, partner) são adicionadas ao `additionalTabs` state
- Cada tab adicionada dinamicamente renderiza um `TabsContent` com empty state genérico e botão para associar registos

### TabsContent para tabs dinâmicas
- Cada nova tab mostra um empty state com ícone + "No {type} associated" + botão "+ Associate"
- Clicar no botão mostra toast "Em breve" (funcionalidade futura)

## Ficheiros

| Ficheiro | Acao | Descricao |
|---|---|---|
| `src/components/opportunities/OpportunityDetailPage.tsx` | **EDIT** | Dropdown + tabs dinâmicas |
| `src/i18n/locales/pt/crm.json` | **EDIT** | ~6 novas keys |
| `src/i18n/locales/en/crm.json` | **EDIT** | ~6 novas keys |

## i18n Keys Novas (~6)
```
oppDetail_billingAdmin, oppDetail_workspace, oppDetail_keyContact,
oppDetail_partner, oppDetail_noRecordAssociated, oppDetail_associate
```

## Ordem de Implementacao

1. `OpportunityDetailPage.tsx` -- dropdown + tabs dinâmicas + empty states
2. i18n keys PT + EN

