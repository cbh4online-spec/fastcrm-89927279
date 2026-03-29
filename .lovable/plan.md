

# Tornar Links Clicáveis na Página de Contactos do eBook

## Diagnóstico

A página de contacto no final do eBook exibe email, telefone, website e links sociais como texto simples (`<span>`) — sem tags `<a>`. Mesmo que fossem links, a camada de protecção (`user-select: none`, `onContextMenu` bloqueado) dificultaria a interacção.

## Solução

### `FlipbookPage.tsx` — Converter texto em links clicáveis

Substituir os `<span>` por tags `<a>` com os atributos correctos:

- **Email**: `<a href="mailto:{email}">` 
- **Telefone**: `<a href="tel:{phone}">`
- **Website**: `<a href="{website}" target="_blank" rel="noopener noreferrer">`
- **Social links**: `<a href="{link.url}" target="_blank" rel="noopener noreferrer">`

Adicionar estilo visual (underline on hover, `pointer-events: auto`) para garantir que os links funcionam mesmo com a protecção activa.

### Ficheiro a alterar

| Ficheiro | Acção |
|---|---|
| `src/components/ebooks/FlipbookPage.tsx` | Converter contactos de `<span>`/`<div>` para `<a>` clicáveis com `pointer-events: auto` |

### Critérios de Aceitação

- Email abre cliente de email ao clicar
- Telefone inicia chamada (mobile) ou copia número
- Website abre em nova tab
- Links sociais abrem em nova tab
- Links funcionam mesmo com protecção de documento activa
- Estilo visual indica que são clicáveis (hover underline, cursor pointer)

