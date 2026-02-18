
# Corrigir Landing Pages Públicas de Verticais (Mobile)

## Problemas identificados nas screenshots

### 1. VerticalStickyHeader — Overflow do botão CTA em mobile
Na imagem, o botão "Agendar Diagnóstico Estratégico" sobrepõe-se ao logo "FastCRM" porque em mobile o header tem:
- Logo (FastCRM + texto "para Empresas")
- Botão CTA com texto longo (sem truncate)
- Botão Menu (hamburger)

Todos no mesmo `flex items-center justify-between` de altura 16. O botão CTA com texto longo ultrapassa o espaço disponível.

**Solução**: Esconder o botão CTA no header em mobile (mover para dentro do Sheet), mantendo apenas o botão hamburger visível. Em desktop o botão fica visível.

### 2. VerticalHero — Texto cortado horizontalmente
O título enorme (`text-4xl` a `text-6xl`) com break point `<br />` rígido causa overflow em mobile quando `{config.nome}` é longo. A orb de `w-[600px]` (posição absoluta) em mobile pode causar scroll horizontal.

**Solução**: 
- Remover o `<br />` hardcoded do `VerticalHero` e usar `flex flex-col` ou deixar o texto fluir naturalmente
- As orbs absolutas já devem estar contidas pelo `overflow-hidden` mas confirmar
- Reduzir padding em mobile: `px-4` em vez de `px-6`

### 3. VerticalCTAForm — Botão de submit com texto longo
Na imagem, o botão "Quero Modernizar a Minha Empresas →" é longo. Em mobile com `w-full` está OK, mas o texto pode ser demasiado longo para caber.

**Solução**: Adicionar `text-sm sm:text-base` no botão e garantir que `gap-2` não force overflow.

### 4. Secções com `max-w` e `px-6` — consistência de padding
Em mobile, `px-6` (24px) em ambos os lados deixa pouco espaço. Algumas secções usam `max-w-7xl`, outras `max-w-5xl` ou `max-w-2xl` — quando o padding interno das sections é insuficiente, o texto pode sair.

**Solução**: Usar `px-4 sm:px-6` nas secções internas para mais espaço em mobile.

## Ficheiros a alterar

| Ficheiro | Alteração |
|----------|-----------|
| `VerticalStickyHeader.tsx` | Esconder botão CTA no header em mobile; garantir `min-w-0` no logo |
| `VerticalHero.tsx` | Remover `<br />` hardcoded; `px-4 sm:px-6`; `text-3xl sm:text-5xl lg:text-6xl` |
| `VerticalCTAForm.tsx` | `text-sm sm:text-base` no botão; `px-4 sm:px-6` |
| `VerticalProblems.tsx` | `px-4 sm:px-6` para mais espaço em mobile |
| `VerticalSolution.tsx` | Verificar e corrigir padding |
| `VerticalLandingTemplate.tsx` | Confirmar `overflow-x-hidden` no wrapper |

## Detalhes técnicos

### VerticalStickyHeader.tsx — Correção principal

**Antes:**
```tsx
<div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
  <Link to="/" className="flex items-center gap-2.5">
    ...logo...
    <span className="text-xs text-[hsl(215,20%,65%)] hidden sm:inline">para {config.nome}</span>
  </Link>
  <div className="flex items-center gap-3">
    <Button size="sm" onClick={scrollToForm} className="...">
      {config.cta_principal}  {/* TEXTO LONGO EM MOBILE */}
    </Button>
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden ...">
          <Menu />
        </Button>
      </SheetTrigger>
    </Sheet>
  </div>
</div>
```

**Depois:**
```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
  <Link to="/" className="flex items-center gap-2 shrink-0">
    ...logo...
    <span className="text-xs text-[hsl(215,20%,65%)] hidden sm:inline">para {config.nome}</span>
  </Link>
  <div className="flex items-center gap-2">
    {/* CTA só visível em sm+ */}
    <Button size="sm" onClick={scrollToForm} className="... hidden sm:inline-flex">
      {config.cta_principal}
    </Button>
    <Sheet>
      <SheetTrigger>hamburger (md:hidden)</SheetTrigger>
      <SheetContent>
        {/* CTA aqui para mobile */}
        <Button onClick={scrollToForm} className="w-full ...">
          {config.cta_principal}
        </Button>
      </SheetContent>
    </Sheet>
  </div>
</div>
```

### VerticalHero.tsx — Título responsivo

**Antes:**
```tsx
<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
  O Sistema Operacional com IA para{" "}
  <span>...{config.nome}...</span>
  <br />           {/* BREAK HARDCODED */}
  que querem {config.resultado_prometido}
</h1>
```

**Depois:**
```tsx
<h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-[1.15] tracking-tight">
  O Sistema Operacional com IA para{" "}
  <span>...{config.nome}...</span>{" "}
  que querem {config.resultado_prometido}   {/* sem <br />, flui naturalmente */}
</h1>
```
