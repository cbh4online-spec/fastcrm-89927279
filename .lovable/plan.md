

# Fix: Smart Link nao preenche os campos do formulario

## Problema
O `DebouncedInput` usa `useEffect(() => { setLocal(value); }, [blockId])` para sincronizar o estado local. Quando o Smart Link gera conteudo para o **mesmo bloco**, o `blockId` nao muda, por isso o `useEffect` nao dispara e os inputs continuam a mostrar os valores antigos (defaults como "Fatcrm Clics", "Subtitulo descritivo").

O preview mostra os valores correctos porque le directamente do servidor, mas os campos do formulario ficam dessincronizados.

## Solucao
Alterar os componentes `DebouncedInput` e `DebouncedTextarea` para tambem sincronizar quando o `value` prop muda externamente (ex: via Smart Link), **sem** conflitar com a digitacao do utilizador.

## Detalhes Tecnicos

### Ficheiro: `src/components/bio/BioBlockEditor.tsx`

**DebouncedInput (linhas 20-41) e DebouncedTextarea (linhas 43-71):**

Adicionar tracking para saber se o utilizador esta a escrever activamente. Quando o `value` prop muda E o utilizador **nao** esta a escrever, actualizar o estado local.

Logica:
1. Manter um `isTypingRef` que fica `true` enquanto ha um timer de debounce activo
2. Adicionar um `useEffect` com dependencia em `value` que actualiza `setLocal(value)` apenas quando `isTypingRef.current === false`
3. No `setTimeout` callback, apos chamar `onDebouncedChange`, marcar `isTypingRef.current = false`

Isto garante que:
- Quando o utilizador escreve: o estado local e controlado pelo input, ignorando updates do servidor
- Quando o Smart Link actualiza: `isTypingRef` esta `false`, entao o `useEffect` sincroniza o valor novo
- Quando se muda de bloco: o `blockId` continua a forcar reset (fallback)

