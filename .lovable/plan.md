

# Hero Block -- Icon da industria maior e mais destacado

## O que muda
Tornar o icon do hero block muito mais proeminente e visualmente impactante, inspirado na referencia onde a imagem/avatar domina o topo do card. O icon actual tem 48px -- vamos aumentar significativamente e adicionar mais destaque visual.

## Alteracoes

### 1. Icon proeminente no Hero (BioBlockPreviewCard.tsx)

Redesenhar o icon no topo do hero block:
- Aumentar o circulo de `h-12 w-12` (48px) para `h-20 w-20` (80px)
- Aumentar o icon interno de `h-6 w-6` para `h-10 w-10`
- Adicionar sombra e borda ao circulo para criar profundidade (ex: `shadow-xl`, ring/border sutil)
- Adicionar um efeito de gradiente subtil no fundo do circulo em vez de cor plana
- Posicionar o circulo com margin negativo no topo (`-mt-4`) para "sair" do card e criar separacao visual
- Adicionar um anel decorativo (ring) a volta do circulo do icon

Layout actualizado:
```text
        ╭──────╮
        │ ICON │  <-- 80px, sombra, destaque
        ╰──────╯
  ┌─────────────────┐
  │                 │
  │  Titulo (dor)   │
  │  Subtitulo      │
  │                 │
  │   [ CTA ]       │
  └─────────────────┘
```

### 2. Mais icons na biblioteca (icons.ts)

Adicionar icons relevantes para industrias comuns:
- `Heart`, `Briefcase`, `ShoppingBag`, `Utensils`, `Scissors`, `Camera`, `Dumbbell`, `GraduationCap`, `Stethoscope`, `Wrench`, `Palette`, `Music`

Isto permite ao utilizador escolher um icon que represente a sua industria.

### 3. Sugestoes de icons por industria no editor (BioBlockEditor.tsx)

Melhorar o campo de seleccao do icon no editor do hero:
- Mostrar uma grelha visual de icons clickaveis em vez de apenas um campo de texto
- Agrupar por categoria (negocio, saude, beleza, educacao, etc.)
- Ao clicar num icon, preenche o campo automaticamente

## Ficheiros a alterar
- `src/components/bio/BioBlockPreviewCard.tsx` -- redesenhar o hero icon
- `src/lib/icons.ts` -- adicionar mais icons de industria
- `src/components/bio/BioBlockEditor.tsx` -- grelha visual de seleccao de icons
