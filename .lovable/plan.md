

# Fix: Conteúdo do editor não carrega na montagem inicial

## Diagnóstico

O bug está no `EbookRichEditor.tsx`. O `lastValueRef` é inicializado com o valor da prop `value` (linha 70):

```
const lastValueRef = useRef(value);
```

O `useEffect` de sincronização (linhas 142-150) usa a condição:

```
if (lastValueRef.current !== value && editorRef.current.innerHTML !== htmlValue)
```

Na **montagem inicial**, `lastValueRef.current === value` (ambos são o conteúdo do capítulo), logo a condição é `false` e o `innerHTML` do `contentEditable` **nunca é preenchido**. O editor monta sempre vazio.

## Correcção

Alterar a inicialização de `lastValueRef` para um valor sentinela que nunca coincida com conteúdo real, garantindo que o primeiro `useEffect` preencha o editor:

**`src/components/ebooks/EbookRichEditor.tsx`** — 1 linha:

- Linha 70: mudar `useRef(value)` para `useRef<string>("")` (ou um sentinela como `__INIT__`)
- Isto garante que na primeira execução do `useEffect`, `lastValueRef.current !== value` é `true`, e o `innerHTML` é preenchido com o conteúdo convertido

Alternativamente, simplificar a condição do `useEffect` para:

```typescript
if (editorRef.current && !isFocusedRef.current) {
  const htmlValue = markdownToHtml(value);
  if (editorRef.current.innerHTML !== htmlValue) {
    editorRef.current.innerHTML = htmlValue || '';
    lastValueRef.current = value;
  }
}
```

Esta segunda opção é mais robusta porque sincroniza sempre que o conteúdo difere, independentemente do `lastValueRef`.

## Ficheiros

| Ficheiro | Acção |
|---|---|
| `src/components/ebooks/EbookRichEditor.tsx` | Fix na inicialização do `lastValueRef` e/ou condição do `useEffect` |

## Critérios de aceitação

- Ao seleccionar um capítulo com conteúdo, o texto aparece imediatamente no editor
- Editar texto funciona normalmente (sem resets, sem perda de conteúdo)
- Trocar entre capítulos carrega o conteúdo correcto de cada um

