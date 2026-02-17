

# Hero Icon -- Mais chamativo com efeitos visuais

## Resumo
Adicionar efeitos visuais ao icon circular do hero block para o tornar mais impactante e premium: glow animado, anel decorativo pulsante e sombra mais dramatica.

## Alteracoes

### Ficheiro: `src/components/bio/BioBlockPreviewCard.tsx` (linhas 82-92)

Redesenhar o container do icon com:

1. **Tamanho maior**: de `h-20 w-20` para `h-24 w-24` (96px), icon interno de `h-10 w-10` para `h-12 w-12`
2. **Anel decorativo exterior**: um div extra a volta do icon com borda semi-transparente e animacao de pulse (usando CSS `animate-pulse` ou keyframe custom)
3. **Glow animado**: `box-shadow` com spread maior e animacao `pulse-glow` (ja existe no tailwind config)
4. **Backdrop blur**: adicionar um efeito de `backdrop-blur` subtil ao anel exterior
5. **Duplo anel**: dois circulos concentricos -- um exterior fino (4px ring com opacidade 20%) e o circulo principal com gradiente

Layout visual:
```text
       ╭─ anel exterior (pulse, blur) ─╮
       │    ╭── icon principal ──╮     │
       │    │     ★ 48px         │     │
       │    ╰────────────────────╯     │
       ╰───────────────────────────────╯
```

### CSS/Estilo aplicado:
- Container exterior: `h-28 w-28` com `border: 3px solid primaryColor/15`, `animate-pulse-glow`, `rounded-full`, `backdrop-blur-sm`
- Container interior (icon): `h-20 w-20` com gradiente actual, `shadow-2xl`
- Glow: sombra com 3 camadas -- inner shadow, spread shadow, e glow difuso
- O efeito `animate-pulse-glow` ja existe no tailwind config do projecto

### Sem alteracoes noutros ficheiros
A biblioteca de icons e o editor ja estao correctos. Apenas o render visual do icon no preview precisa de ser melhorado.

