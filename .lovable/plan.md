
# Adicionar editor para o bloco WhatsApp

## Problema
O bloco "whatsapp" nao tem case no switch do `renderBlockEditor`, caindo no `default` que mostra "Editor nao disponivel para este tipo de bloco."

## Solucao
Adicionar um case `"whatsapp"` na funcao `renderBlockEditor` em `src/components/bio/BioBlockEditor.tsx` com campos editaveis:

- **Texto** (campo `text`) -- o texto exibido no botao (ex: "WhatsApp")
- **Numero** (campo `phone`) -- o numero de telefone
- **Mensagem pre-definida** (campo `message`) -- mensagem que abre pre-preenchida no WhatsApp

### Ficheiro: `src/components/bio/BioBlockEditor.tsx`

Adicionar antes do case `"divider"` (linha ~470):

```typescript
case "whatsapp":
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium">Texto do Botao</label>
        <DebouncedInput blockId={block.id} value={content.text || ""} onDebouncedChange={(v) => onUpdate("text", v)} placeholder="WhatsApp" />
      </div>
      <div>
        <label className="text-xs font-medium">Numero de Telefone</label>
        <DebouncedInput blockId={block.id} value={content.phone || ""} onDebouncedChange={(v) => onUpdate("phone", v)} placeholder="+351 912 345 678" />
      </div>
      <div>
        <label className="text-xs font-medium">Mensagem Pre-definida</label>
        <DebouncedInput blockId={block.id} value={content.message || ""} onDebouncedChange={(v) => onUpdate("message", v)} placeholder="Ola, gostava de saber mais..." />
      </div>
    </div>
  );
```

Apenas 1 ficheiro alterado, sem dependencias novas.
