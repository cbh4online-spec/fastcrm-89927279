
# Plano: Adicionar Botão "Convidar para B2B" na Página de Contacto

## Objectivo

Adicionar um botão na página de detalhe do contacto que permite enviar um convite para o Portal B2B, pré-preenchendo os dados do cliente com base no contacto actual.

## Análise da Situação Actual

O sistema já possui:
- **`InviteClientDialog`** - Diálogo completo para criar clientes B2B
- **`InviteLinkDialog`** - Diálogo para partilhar o link de convite (URL, QR Code, Email)
- Suporte para associar um `contact_id` ao cliente B2B

## Solução Proposta

### Opção Escolhida: Criar um botão que abre o InviteClientDialog pré-preenchido

Adicionar um novo botão "Convidar para Portal B2B" no header da página de contacto, que abre o diálogo de convite com os dados do contacto já preenchidos.

## Alterações de Código

### 1. Modificar `InviteClientDialog.tsx`

Adicionar props opcionais para receber dados de pré-preenchimento:

```typescript
interface InviteClientDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  // NOVAS PROPS para pré-preenchimento
  prefillData?: {
    contactId: string;
    name: string;
    email: string;
    phone?: string;
    taxId?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
}
```

Modificar o `useEffect` para preencher o formulário quando `prefillData` é fornecido:

```typescript
useEffect(() => {
  if (prefillData && open) {
    form.setValue("contact_id", prefillData.contactId);
    form.setValue("name", prefillData.name);
    form.setValue("email", prefillData.email);
    if (prefillData.phone) form.setValue("phone", prefillData.phone);
    if (prefillData.taxId) form.setValue("tax_id", prefillData.taxId);
    // ... preencher morada de facturação
  }
}, [prefillData, open]);
```

### 2. Modificar `ENIContactDetailWithSidebar.tsx`

Adicionar o botão de convite B2B no header:

```typescript
// Imports
import { InviteClientDialog } from "@/components/client-users/InviteClientDialog";
import { UserPlus } from "lucide-react";

// No header, junto aos outros botões de acção
{contact.email && (
  <InviteClientDialog
    trigger={
      <Button variant="outline" className="gap-2">
        <UserPlus className="w-4 h-4" />
        Convidar B2B
      </Button>
    }
    prefillData={{
      contactId: id!,
      name: contact.name,
      email: contact.email,
      phone: contact.phone || undefined,
      taxId: contact.tax_id || undefined,
      address: contact.address || undefined,
      city: contact.city || undefined,
      postalCode: contact.postal_code || undefined,
      country: contact.country || undefined,
    }}
  />
)}
```

## Fluxo do Utilizador

```text
┌─────────────────────────────────────────────────────────────┐
│  Página de Detalhe do Contacto                              │
│                                                             │
│  [← Voltar]  João Silva                                     │
│                                                             │
│  [ Enviar Email ] [ Nova Fatura ] [ Convidar B2B ] [...]    │
│                        ↓                                    │
│                  Clique aqui                                │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Dialog: Convidar Novo Cliente B2B                          │
│                                                             │
│  Contacto CRM: [João Silva] (pré-seleccionado)              │
│                                                             │
│  Nome: [João Silva]        ← Pré-preenchido                 │
│  Email: [joao@empresa.pt]  ← Pré-preenchido                 │
│  Telefone: [+351 912 345 678]                               │
│  NIF: [123456789]                                           │
│                                                             │
│                    [ Cancelar ] [ Criar e Gerar Convite ]   │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Dialog: Cliente Criado com Sucesso                         │
│                                                             │
│  [ Link ] [ QR Code ] [ Email ]                             │
│                                                             │
│  ┌─────────────────────────────┐                            │
│  │ Link de Convite: https://...│ [ Copiar ]                 │
│  └─────────────────────────────┘                            │
│                                                             │
│  [ Palavra-passe: abc123... ]  [ Copiar ]                   │
│                                                             │
│                                      [ Fechar ]             │
└─────────────────────────────────────────────────────────────┘
```

## Verificação de Email Obrigatório

O botão só aparece se o contacto tiver email, pois o email é obrigatório para criar um cliente B2B.

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/client-users/InviteClientDialog.tsx` | Adicionar props `prefillData` e lógica de pré-preenchimento |
| `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx` | Adicionar botão "Convidar B2B" no header |

## Benefícios

1. **Fluxo rápido** - Dados pré-preenchidos reduzem entrada manual
2. **Associação automática** - O `contact_id` é automaticamente associado ao cliente B2B
3. **Reutilização de código** - Usa os componentes existentes (`InviteClientDialog`, `InviteLinkDialog`)
4. **Consistência** - Mesmo fluxo de criação que na página de Clientes B2B
