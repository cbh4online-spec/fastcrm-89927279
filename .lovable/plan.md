
# Plano: Adicionar Drag-and-Drop para Reordenar Itens da Proposta

## Objetivo

Permitir que o utilizador arraste os itens da proposta para mudar a ordem, facilitando a organização e apresentação ao cliente.

## Abordagem Técnica

O projeto já utiliza **drag-and-drop nativo HTML5** no componente `EmailCanvas.tsx`. Vamos reutilizar o mesmo padrão - é leve, sem dependências externas, e já está comprovado no projeto.

---

## Implementação

### Adicionar ao ProposalItemsEditor.tsx

#### 1. Novos refs para tracking do drag

```typescript
const dragItemRef = useRef<number | null>(null);
const dragOverItemRef = useRef<number | null>(null);
const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
```

#### 2. Handlers de drag-and-drop

```typescript
const handleDragStart = (index: number) => {
  dragItemRef.current = index;
  setDraggedIndex(index);
};

const handleDragEnter = (index: number) => {
  dragOverItemRef.current = index;
};

const handleDragEnd = () => {
  if (
    dragItemRef.current !== null && 
    dragOverItemRef.current !== null &&
    dragItemRef.current !== dragOverItemRef.current
  ) {
    handleReorderItems(dragItemRef.current, dragOverItemRef.current);
  }
  dragItemRef.current = null;
  dragOverItemRef.current = null;
  setDraggedIndex(null);
};

const handleReorderItems = (fromIndex: number, toIndex: number) => {
  setItems((prev) => {
    const newItems = [...prev];
    const [removed] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, removed);
    // Atualizar posições
    return newItems.map((item, idx) => ({ ...item, position: idx }));
  });
  setHasChanges(true);
};
```

#### 3. Atributos no Card de cada item

```typescript
<Card 
  key={item.id || index} 
  className={cn(
    "p-4 transition-all duration-200",
    draggedIndex === index && "opacity-50 scale-95"
  )}
  draggable
  onDragStart={() => handleDragStart(index)}
  onDragEnter={() => handleDragEnter(index)}
  onDragEnd={handleDragEnd}
  onDragOver={(e) => e.preventDefault()}
>
```

#### 4. Melhorar feedback visual do GripVertical

```typescript
<div 
  className="flex items-center text-muted-foreground cursor-grab active:cursor-grabbing pt-2 hover:text-primary transition-colors"
  title="Arraste para reordenar"
>
  <GripVertical className="h-4 w-4" />
</div>
```

---

## Ficheiro a Modificar

### `src/components/proposals/ProposalItemsEditor.tsx`

| Alteração | Linhas |
|-----------|--------|
| Adicionar imports (`useRef`) | ~1 linha |
| Adicionar refs para drag tracking | ~3 linhas |
| Adicionar estado `draggedIndex` | ~1 linha |
| Adicionar handlers de drag | ~25 linhas |
| Atributos `draggable` no Card | ~6 linhas |
| Feedback visual no GripVertical | ~2 linhas |

**Total estimado: ~38 linhas adicionadas**

---

## Comportamento Final

1. **Cursor "grab"** - O ícone GripVertical mostra cursor de agarrar
2. **Arrastar** - O item fica semi-transparente enquanto é arrastado
3. **Soltar** - O item é inserido na nova posição
4. **Posições actualizadas** - Os campos `position` são recalculados
5. **Flag de alterações** - `hasChanges` fica `true` para indicar que precisa guardar

---

## Resultado Esperado

- Arrastar qualquer item sobre outro muda a ordem
- Feedback visual claro durante o drag
- A nova ordem é guardada quando clica "Guardar Itens"
- A ordem persiste na base de dados via campo `position`
