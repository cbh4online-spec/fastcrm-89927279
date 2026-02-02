
# Plano: Adicionar Links Úteis e Funcionalidades ao Detalhe de Proposta

## Situação Actual

O `ProposalDetailDialog` e `ProposalInternalView` mostram informações do cliente, mas **não têm links clicáveis** para:
- Abrir a ficha CRM do contacto/empresa
- Navegar para a oportunidade associada
- Acções rápidas relevantes (email, chamada, WhatsApp)

Os dados já existem na proposta:
- `proposal.contact` → Contacto associado
- `proposal.company` → Empresa associada  
- `proposal.opportunity` → Oportunidade associada
- `proposal.opportunity.lead` → Lead da oportunidade

## Objectivo

Adicionar **links de navegação rápida** e **acções contextuais** para:
1. Abrir ficha CRM do cliente (contacto ou empresa)
2. Navegar para a oportunidade associada
3. Abrir ficha do lead (se existir)
4. Acções rápidas: enviar email, fazer chamada, enviar WhatsApp
5. Duplicar proposta
6. Criar tarefa relacionada

## Implementação

### 1. ProposalDetailDialog - Header Melhorado

Adicionar tooltips e links clicáveis no header:

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 📄 Proposta Website Redesign                              [Publicada]            │
│                                                                                  │
│ 🎯 Website Development [→]  👤 Empresa ABC [→]  € 5.000  📊 45% margem          │
│     ↑ clicável                 ↑ clicável                                        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

Transformar os elementos info em links:
- **Oportunidade** → Link para `/dashboard/opportunities/:id`
- **Cliente** → Link para `/dashboard/contacts/:id` ou `/dashboard/companies/:id`

### 2. ProposalInternalView - Cards com Links

Adicionar botões de navegação nos cards de informação:

```text
┌─────────────────────────────────────────┐
│ Cliente                                 │
│                                         │
│ 🏢 Empresa ABC                          │
│ info@empresaabc.pt                      │
│ NIF: 123456789                          │
│                                         │
│ [📧 Email] [📞 Ligar] [💬 WhatsApp]     │
│ [↗ Abrir Ficha CRM]                     │
└─────────────────────────────────────────┘
```

### 3. Novo Componente: ProposalQuickLinks

Criar um componente reutilizável para os links de navegação:

```typescript
interface ProposalQuickLinksProps {
  proposal: Proposal;
  variant?: "compact" | "full";
}
```

Este componente renderiza:
- Link para oportunidade (se existir)
- Link para contacto (se existir)
- Link para empresa (se existir)
- Link para lead (se existir via oportunidade)

### 4. Acções Rápidas

Adicionar menu dropdown com acções:

| Acção | Funcionalidade |
|-------|----------------|
| 📧 Enviar Email | `mailto:` com email do cliente |
| 📞 Ligar | `tel:` se tiver telefone |
| 💬 WhatsApp | Link wa.me se tiver telemóvel |
| ↗ Ver Ficha CRM | Navega para contacto/empresa |
| 📋 Duplicar | Cria nova proposta com mesmos dados |
| ✅ Criar Tarefa | Abre dialog de criar tarefa |

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/ProposalDetailDialog.tsx` | Adicionar links clicáveis no header |
| `src/components/proposals/ProposalInternalView.tsx` | Adicionar cards com acções e links CRM |
| `src/components/proposals/ProposalQuickLinks.tsx` | **CRIAR** - Componente de links rápidos |

## Detalhes de Implementação

### Header com Links (ProposalDetailDialog)

Modificar as linhas ~654-661 para ter links clicáveis:

```typescript
<span 
  className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
  onClick={() => proposal.opportunity?.id && navigate(`/dashboard/opportunities/${proposal.opportunity.id}`)}
>
  <Building2 className="h-3 w-3" />
  {proposal.opportunity?.title || "-"}
  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
</span>

<span 
  className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
  onClick={() => handleNavigateToClient()}
>
  <User className="h-3 w-3" />
  {clientName || "-"}
  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
</span>
```

### Cards de Cliente com Acções (ProposalInternalView)

Substituir os botões genéricos por acções funcionais:

```typescript
// Funções de navegação e acções
const handleOpenCRM = () => {
  if (proposal.company?.id) {
    navigate(`/dashboard/companies/${proposal.company.id}`);
  } else if (proposal.contact?.id) {
    navigate(`/dashboard/contacts/${proposal.contact.id}`);
  }
};

const handleSendEmail = () => {
  if (clientEmail) {
    window.open(`mailto:${clientEmail}?subject=${encodeURIComponent(`Re: ${proposal.title}`)}`);
  }
};
```

### Dropdown de Mais Acções

Adicionar um `DropdownMenu` com acções adicionais:

```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={handleOpenCRM}>
      <ExternalLink className="h-4 w-4 mr-2" />
      Ver Ficha CRM
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleViewOpportunity}>
      <TrendingUp className="h-4 w-4 mr-2" />
      Ver Oportunidade
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleDuplicate}>
      <Copy className="h-4 w-4 mr-2" />
      Duplicar Proposta
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleCreateTask}>
      <CheckSquare className="h-4 w-4 mr-2" />
      Criar Tarefa
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## Fluxo de Navegação

```text
Proposta
├── [Oportunidade] → /dashboard/opportunities/:opportunityId
├── [Contacto] → /dashboard/contacts/:contactId
├── [Empresa] → /dashboard/companies/:companyId
└── [Lead] → /dashboard/crm/leads/:leadId
```

## Resultado Esperado

1. **Links no Header** - Clicar no nome do cliente ou oportunidade abre a ficha respectiva
2. **Acções Funcionais** - Botões "Agendar Chamada" e "Mensagem" abrem modais/links reais
3. **Dropdown de Acções** - Mais opções como duplicar, criar tarefa
4. **Cards Melhorados** - Link "Ver Ficha CRM" em cada card de cliente

## Complexidade

Baixa-Média - Modificar 2 ficheiros existentes + criar 1 componente pequeno. Utiliza `useNavigate` do React Router.
