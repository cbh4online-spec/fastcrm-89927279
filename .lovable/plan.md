
# Plano: Pesquisa de Contactos e Auto-Matching no Diálogo "Ligar ao CRM"

## Problema Identificado

O diálogo actual para ligar um perfil Student Journey a um contacto CRM tem limitações:

1. Usa um `<Select>` simples que não permite **pesquisar por texto**
2. Com muitos contactos, é difícil encontrar o correcto
3. Quando há **match automático** de nome/email, o utilizador tem que localizar manualmente

## Solução Proposta

Substituir o Select simples por um **Combobox com pesquisa** (padrão Command + Popover) e:
1. Permitir pesquisa por texto (nome, email, telefone)
2. Manter contactos sugeridos em destaque
3. Auto-seleccionar automaticamente se houver match exacto de email

## Alterações Técnicas

### 1. Substituir Select por Command + Popover

Usar o mesmo padrão de `SendEmailFromTemplateDialog.tsx`:

```typescript
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

### 2. Adicionar Estado para Controlar o Popover

```typescript
const [searchOpen, setSearchOpen] = useState(false);
```

### 3. Auto-Matching ao Abrir o Diálogo

Quando o diálogo abre, se houver um contacto com **email exacto** ou **nome exacto**, auto-seleccionar:

```typescript
useEffect(() => {
  if (open && !selectedContactId) {
    // Tentar match automático por email
    const emailMatch = contacts.find(
      c => profile.email && c.email?.toLowerCase() === profile.email.toLowerCase()
    );
    if (emailMatch) {
      setSelectedContactId(emailMatch.id);
      setTab("link");
      return;
    }
    
    // Tentar match por nome exacto
    const nameMatch = contacts.find(
      c => c.name.toLowerCase() === profile.full_name.toLowerCase()
    );
    if (nameMatch) {
      setSelectedContactId(nameMatch.id);
      setTab("link");
    }
  }
}, [open, contacts, profile]);
```

### 4. Interface com Pesquisa

```typescript
<div className="grid gap-2">
  <Label>Selecionar Contacto</Label>
  <Popover open={searchOpen} onOpenChange={setSearchOpen}>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={searchOpen}
        className="w-full justify-between"
      >
        {selectedContact ? (
          <span className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {selectedContact.name}
            {selectedContact.email && (
              <span className="text-muted-foreground text-xs">
                ({selectedContact.email})
              </span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">Pesquisar contacto...</span>
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-[350px] p-0" align="start">
      <Command>
        <CommandInput placeholder="Pesquisar por nome, email ou telefone..." />
        <CommandList>
          <CommandEmpty>Nenhum contacto encontrado</CommandEmpty>
          
          {/* Grupo: Sugeridos */}
          {suggestedContacts.length > 0 && (
            <CommandGroup heading="Correspondências Encontradas">
              {suggestedContacts.map(contact => (
                <CommandItem
                  key={contact.id}
                  value={`${contact.name} ${contact.email || ""} ${contact.phone || ""}`}
                  onSelect={() => {
                    setSelectedContactId(contact.id);
                    setSearchOpen(false);
                  }}
                >
                  <Check className={cn(
                    "h-4 w-4 mr-2",
                    selectedContactId === contact.id ? "opacity-100" : "opacity-0"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{contact.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {contact.email || contact.phone}
                    </div>
                  </div>
                  <Badge variant="secondary" className="ml-2">Match</Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          
          {/* Grupo: Outros contactos */}
          <CommandGroup heading="Todos os Contactos">
            {otherContacts.map(contact => (
              <CommandItem
                key={contact.id}
                value={`${contact.name} ${contact.email || ""} ${contact.phone || ""}`}
                onSelect={() => {
                  setSelectedContactId(contact.id);
                  setSearchOpen(false);
                }}
              >
                <Check className={cn(
                  "h-4 w-4 mr-2",
                  selectedContactId === contact.id ? "opacity-100" : "opacity-0"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{contact.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {contact.email || contact.phone || "—"}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</div>
```

### 5. Feedback Visual de Auto-Match

Quando há auto-match, mostrar um alerta informativo:

```typescript
{selectedContactId && suggestedContacts.some(c => c.id === selectedContactId) && (
  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
    <CheckCircle className="h-4 w-4" />
    Contacto encontrado automaticamente por correspondência de dados
  </div>
)}
```

## Fluxo de Utilizador Melhorado

```text
1. Utilizador abre "Ligar ao CRM" para perfil "João Silva" (joao@email.pt)
   ↓
2. Sistema detecta que existe contacto "João Silva" com mesmo email
   ↓
3. Auto-selecciona o contacto e muda para tab "Ligar Existente"
   ↓
4. Mostra mensagem: "Contacto encontrado automaticamente"
   ↓
5. Utilizador pode:
   - Confirmar clicando "Ligar ao Contacto"
   - Pesquisar outro contacto na caixa de pesquisa
   - Mudar para tab "Criar Contacto" se preferir
```

## Ficheiro a Modificar

| Ficheiro | Alterações |
|----------|------------|
| `src/components/student-journey/LinkContactDialog.tsx` | Substituir Select por Command/Popover, adicionar auto-match, adicionar pesquisa |

## Resultado Esperado

1. Caixa de pesquisa permite encontrar contactos rapidamente por texto
2. Auto-matching selecciona contactos com email/nome coincidente
3. Contactos sugeridos aparecem em destaque com badge "Match"
4. Feedback visual claro quando há correspondência automática
5. Experiência mais rápida e intuitiva para ligar perfis a contactos
