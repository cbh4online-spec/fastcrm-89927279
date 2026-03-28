

# Fix: Texto invisível nas páginas de conteúdo do eBook

## Problema
As páginas de conteúdo (tipo "content") mostram texto quase invisível/muito claro. O screenshot confirma que o texto está renderizado mas com cor demasiado clara.

## Causa provável
As classes Tailwind `prose-p:text-slate-700` podem não estar a aplicar correctamente por especificidade CSS. Além disso, a cor `text-slate-700` em fundo `#fefcf9` pode ter contraste insuficiente dependendo do rendering.

## Solução

### `src/components/ebooks/FlipbookPage.tsx` — Content page (linhas 86-127)

Reforçar as cores do texto com classes mais explícitas e maior contraste:

- Mudar `prose-p:text-slate-700` para `prose-p:text-slate-800` (mais escuro)
- Adicionar `text-slate-800` diretamente no container div para garantir herança de cor
- Mudar `prose-strong:text-slate-800` para `prose-strong:text-slate-900`
- Mudar `prose-ul:text-slate-700 prose-ol:text-slate-700` para `text-slate-800`
- Mudar `prose-li:text-[13.5px]` para incluir cor `prose-li:text-slate-800`
- Adicionar `[&_*]:!text-slate-800` como fallback para garantir que nenhum elemento fica transparente (exceto headings e first-letter que têm cores próprias)

### Alteração concreta
No div do conteúdo (linha 97), adicionar `text-slate-800` e reforçar cores:
```
<div className="flex-1 overflow-y-auto prose prose-sm max-w-none font-serif text-slate-800
  prose-p:leading-[1.85] prose-p:text-slate-800 prose-p:mb-4 prose-p:text-[13.5px]
  prose-headings:text-slate-900 ...
  prose-strong:text-slate-900
  prose-ul:text-slate-800 prose-ol:text-slate-800 prose-li:text-[13.5px] prose-li:text-slate-800
  ...
```

### Ficheiro editado
- `src/components/ebooks/FlipbookPage.tsx` (linhas 97-106)

