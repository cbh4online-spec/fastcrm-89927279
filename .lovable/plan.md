
# Corrigir Responsividade Mobile do Hero Principal (LandingHeroSection)

## Problema identificado

O ficheiro `src/components/landing-fastcrm/LandingHeroSection.tsx` tem vários problemas de responsividade na zona hero (primeira secção visível na rota `/`):

### 1. Tamanho do título excessivo em mobile
```tsx
// Atual — "text-4xl" em mobile é demasiado grande com 3 linhas
<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
```
Com `text-4xl` (36px) e 3 linhas de texto separadas por `<br />`, o título ocupa quase metade do ecrã em mobile.

**Solução:** `text-3xl sm:text-4xl lg:text-6xl` — reduz de 36px para 30px em mobile, mais proporcional.

### 2. Quebras de linha `<br />` rígidas
```tsx
Não é apenas um CRM.
<br />
É a Infraestrutura Digital    ← <br /> hardcoded
<br />
da Sua Empresa.               ← <br /> hardcoded
```
Em mobile, estes `<br />` forçam a estrutura de 3 linhas mesmo quando o texto poderia fluir de forma mais natural e compacta.

**Solução:** Remover os `<br />` e usar `leading-tight` + `space-y-1` para criar separação visual entre as 3 partes do título sem forçar quebras de linha artificiais. Cada parte fica num `<span className="block">` para controlo preciso.

### 3. Padding horizontal insuficiente
```tsx
// Atual
<div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
```
`px-6` (24px) em cada lado deixa apenas 342px de largura útil num ecrã de 390px. Combinado com o título grande, o texto fica muito espremido.

**Solução:** `px-4 sm:px-6` — em mobile usa 16px de padding (358px úteis), mais respiração para o texto.

### 4. Padding vertical excessivo em mobile
```tsx
py-24 lg:py-32
```
`py-24` (96px) em mobile somado ao `pt-16` da section resulta em mais de 112px de espaço acima do conteúdo, empurrando o título para baixo e cortando o CTA do viewport.

**Solução:** `py-12 sm:py-20 lg:py-32` — reduz o espaço vertical em mobile mantendo o impacto em desktop.

### 5. Gap do grid excessivo em mobile
```tsx
<div className="grid lg:grid-cols-2 gap-16 items-center">
```
Embora o mockup do dashboard seja `hidden lg:block`, o `gap-16` (64px) ainda aplica-se ao elemento único em mobile, adicionando espaço desnecessário.

**Solução:** `gap-8 lg:gap-16`

## Ficheiro a alterar

| Ficheiro | Linha | Alteração |
|----------|-------|-----------|
| `src/components/landing-fastcrm/LandingHeroSection.tsx` | 28 | `px-4 sm:px-6` + `py-12 sm:py-20 lg:py-32` |
| `src/components/landing-fastcrm/LandingHeroSection.tsx` | 29 | `gap-8 lg:gap-16` |
| `src/components/landing-fastcrm/LandingHeroSection.tsx` | 42-50 | Título: `text-3xl sm:text-4xl lg:text-6xl` + substituir `<br />` por `<span className="block">` |

## Resultado esperado

**Antes (mobile 390px):**
- Título ocupa ~50% da altura do ecrã
- Texto cortado ou demasiado comprimido
- CTA fora do viewport inicial

**Depois (mobile 390px):**
- Título mais compacto, lê-se de uma vez
- Badge + título + parágrafo + CTAs todos visíveis no primeiro scroll
- Proporções mais equilibradas

## Detalhe técnico — Título corrigido

```tsx
// Antes:
<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
  Não é apenas um CRM.
  <br />
  <span className="bg-gradient-to-r ...">
    É a Infraestrutura Digital
  </span>
  <br />
  da Sua Empresa.
</h1>

// Depois:
<h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold leading-[1.15] tracking-tight">
  <span className="block">Não é apenas um CRM.</span>
  <span className="block bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
    É a Infraestrutura Digital
  </span>
  <span className="block">da Sua Empresa.</span>
</h1>
```

Usando `<span className="block">` em vez de `<br />`, o comportamento é idêntico visualmente mas evita problemas de reflow em viewports estreitos. O `leading-[1.15]` (ligeiramente maior que `1.1`) dá mais respiração entre linhas em mobile.
