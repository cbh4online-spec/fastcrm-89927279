

# Plano: Adicionar Pesquisa por Texto na Selecção de Contactos

## Objectivo

Substituir o select básico por um componente de pesquisa com autocomplete na tab "Ligar Contacto" do diálogo "Adicionar Perfil" no módulo Student Journey.

## Situação Actual

O select actual (linha 70 do CreateProfileDialog.tsx) usa um Select simples:

```text
┌─────────────────────────────────────────┐
│ Selecione...                          ▼ │
└─────────────────────────────────────────┘
       │
       └── Lista todos os contactos sem filtro
           (difícil encontrar quando há muitos)
```

## Solução Proposta

Implementar um Popover + Command com campo de pesquisa, seguindo o padrão já existente no projecto (ClientSearchSelect.tsx):

```text
┌─────────────────────────────────────────┐
│ 🔍 Pesquisar contacto...                │
├─────────────────────────────────────────┤
│ ✓ João Silva (joao@email.com)           │
│   Maria Santos (maria@email.com)        │
│   Pedro Costa (pedro@email.com)         │
│   ...                                   │
└─────────────────────────────────────────┘
```

## Alterações Detalhadas

### Ficheiro: src/components/student-journey/CreateProfileDialog.tsx

| Alteração | Descrição |
|-----------|-----------|
| Novos imports | Adicionar Command, Popover, Check, ChevronsUpDown, Search, User |
| Novo estado | Adicionar `contactSearch` e `contactPopoverOpen` |
| Novo useMemo | Filtrar contactos baseado no texto de pesquisa |
| Substituir Select | Usar Popover + Command em vez do Select simples |

### Novo Código para a Tab "Ligar Contacto"

```typescript
// Estados adicionais
const [contactSearch, setContactSearch] = useState("");
const [contactPopoverOpen, setContactPopoverOpen] = useState(false);

// Filtro de contactos
const filteredContacts = useMemo(() => {
  if (!contactSearch.trim()) return contacts;
  const searchLower = contactSearch.toLowerCase();
  return contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchLower) ||
      c.email?.toLowerCase().includes(searchLower) ||
      c.phone?.includes(searchLower)
  );
}, [contacts, contactSearch]);

// Contacto seleccionado
const selectedContact = contacts.find((c) => c.id === selectedContactId);
```

### Interface de Pesquisa

```typescript
<TabsContent value="link" className="space-y-4 mt-4">
  <p className="text-sm text-muted-foreground">
    Selecione um contacto existente do CRM.
  </p>
  
  <Popover open={contactPopoverOpen} onOpenChange={setContactPopoverOpen}>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={contactPopoverOpen}
        className="w-full justify-between"
      >
        <div className="flex items-center gap-2 truncate">
          <User className="h-4 w-4 text-muted-foreground" />
          {selectedContact ? (
            <span className="truncate">{selectedContact.name}</span>
          ) : (
            <span className="text-muted-foreground">Pesquisar contacto...</span>
          )}
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    
    <PopoverContent className="w-[350px] p-0" align="start">
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Pesquisar por nome, email ou telefone..."
          value={contactSearch}
          onValueChange={setContactSearch}
        />
        <CommandList>
          {filteredContacts.length === 0 ? (
            <CommandEmpty>
              <div className="text-center py-4">
                <Search className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum contacto encontrado
                </p>
              </div>
            </CommandEmpty>
          ) : (
            <CommandGroup>
              {filteredContacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={contact.id}
                  onSelect={() => {
                    setSelectedContactId(contact.id);
                    setContactPopoverOpen(false);
                    setContactSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 mr-2",
                      selectedContactId === contact.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{contact.name}</div>
                    {contact.email && (
                      <div className="text-xs text-muted-foreground truncate">
                        {contact.email}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</TabsContent>
```

## Imports Necessários

```typescript
import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Search, User, Link2, UserPlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
```

## Reset do Formulário

Actualizar a função `resetForm` para incluir os novos estados:

```typescript
const resetForm = () => {
  setFullName("");
  setEmail("");
  setPhone("");
  setStage("lead");
  setPrimaryInterest("");
  setSelectedContactId("");
  setContactSearch("");       // NOVO
  setContactPopoverOpen(false); // NOVO
  setTab("new");
};
```

## Benefícios

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Encontrar contacto | Scroll manual na lista | Pesquisa instantânea |
| Pesquisa por | Apenas nome visível | Nome, email, telefone |
| UX com muitos contactos | Difícil de usar | Rápido e eficiente |
| Consistência | Select básico | Mesmo padrão do resto da app |

## Dependências

Não são necessárias novas dependências - todos os componentes já existem no projecto:
- `@/components/ui/command` (cmdk)
- `@/components/ui/popover` (@radix-ui/react-popover)

