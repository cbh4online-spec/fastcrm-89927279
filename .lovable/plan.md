

# Corrigir página de contactos e slogan no eBook

## Problema

A página de contactos existe no código mas tem dois problemas:

1. **Dados não guardam correctamente**: Cada tecla no campo dispara um `updateEbook.mutate()` separado, criando race conditions — as mutações sobrepõem-se e o valor final pode ser parcial ou vazio. O `contact_page` é reconstruído a cada tecla com spread do valor actual (que pode já estar desactualizado).

2. **Estado local inexistente**: Os campos de contacto lêem directamente de `(ebook as any).contact_page` (dados do servidor) em vez de estado local, causando lag e perda de dados durante edição.

## Solução

### `EbookEditor.tsx`

1. **Adicionar estado local** para `headerText`, `footerText` e `contactPage` (inicializados a partir do ebook carregado)
2. **Debounce o save**: Usar `useEffect` com timeout de 800ms para guardar automaticamente após o utilizador parar de escrever — em vez de mutação por tecla
3. **Inputs controlados**: Os campos lêem do estado local, não do servidor
4. **Sincronizar ao carregar**: Quando `ebook` muda (query refresh), actualizar estado local se não houver edição em curso

### Garantir visibilidade

5. Mover a secção "Página de Contactos" para uma posição mais visível — colocá-la num separador/accordion expandido por defeito na sidebar direita, com um label mais descritivo

| Ficheiro | Alteração |
|---|---|
| `EbookEditor.tsx` | Estado local + debounce para campos de branding e contacto, UI mais visível |

