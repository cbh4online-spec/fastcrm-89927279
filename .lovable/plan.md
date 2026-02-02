
# Plano: Tornar o Documento da Proposta Responsivo e com Margens A4

## Problema Identificado

O documento actual tem problemas de layout:

| Problema | Causa |
|----------|-------|
| Texto cortado | Células da tabela sem `overflow` / `text-wrap` |
| Sidebar muito larga | `w-64` (256px) fixo não escala |
| Largura excessiva | `max-w-4xl` (896px) > A4 (794px) |
| Não responsivo | Layout side-by-side não adapta a mobile |

---

## Solução

### 1. Corrigir Largura para Padrão A4

```typescript
// Trocar max-w-4xl por largura A4 (210mm = ~794px ≈ max-w-[210mm])
<div className="max-w-[210mm] mx-auto">
```

### 2. Layout Responsivo para Header

Tornar o layout do header (logo + info empresa) responsivo:

```typescript
// De: flex horizontal fixo
<div className="flex">
  <div className="w-64 bg-primary ...">  {/* Sidebar fixa */}
  <div className="flex-1 p-8">           {/* Conteúdo */}

// Para: responsivo com stack em mobile
<div className="flex flex-col md:flex-row">
  <div className="w-full md:w-56 bg-primary ...">  {/* Sidebar adapta */}
  <div className="flex-1 p-4 md:p-8">               {/* Padding adapta */}
```

### 3. Corrigir Overflow na Tabela

Adicionar estilos para evitar corte de texto:

```typescript
// Células de descrição com word-wrap
<TableCell className="max-w-[200px] break-words">
  <p className="font-medium text-gray-900 line-clamp-2">
    {item.name}
  </p>
  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
    {item.description}
  </p>
</TableCell>
```

### 4. Footer Responsivo

```typescript
// Grid 2 colunas → stack em mobile
<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
```

### 5. Adicionar Estilos de Print para A4

```css
@media print {
  @page {
    size: A4;
    margin: 10mm;
  }
  
  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
```

---

## Ficheiros a Modificar

### `src/components/proposals/ProposalClientDocument.tsx`

| Alteração | Descrição |
|-----------|-----------|
| Container principal | `max-w-4xl` → `max-w-[210mm]` |
| Header sidebar | `w-64` → `w-full md:w-56` + `flex flex-col md:flex-row` |
| Padding | `p-8` → `p-4 md:p-8` |
| Células tabela | Adicionar `max-w-[200px] break-words` e `line-clamp-2` |
| Footer grid | `grid-cols-2` → `grid-cols-1 md:grid-cols-2` |

### `src/components/proposals/ProposalDocumentPreviewDialog.tsx`

| Alteração | Descrição |
|-----------|-----------|
| Container interno | `max-w-4xl` → `max-w-[210mm]` para consistência |

### `src/App.css` (ou novo ficheiro de print styles)

| Alteração | Descrição |
|-----------|-----------|
| Print media query | Adicionar `@page { size: A4; margin: 10mm }` |
| Print colors | Forçar cores com `-webkit-print-color-adjust: exact` |

---

## Resultado Esperado

### Antes vs Depois

```text
ANTES:
┌──────────────────────────────────────────────────────────────────┐
│ [Sidebar 256px]  │  Conteúdo a transbordar para fora do ecrã... │
│                  │  Texto cortado sem wrap, impossível ler...   │
└──────────────────────────────────────────────────────────────────┘

DEPOIS (Desktop):
┌────────────────────────────────────────────────────┐
│ [Sidebar 224px] │ Conteúdo bem enquadrado         │
│                 │ Texto com wrap adequado          │
│                 │ Margens A4 respeitadas           │
└────────────────────────────────────────────────────┘

DEPOIS (Mobile):
┌─────────────────────────────┐
│ [Sidebar - Full Width]      │
│ Logo + Info Empresa         │
├─────────────────────────────┤
│ Proposta                    │
│ Cliente Info                │
├─────────────────────────────┤
│ Itens (scroll horizontal)   │
└─────────────────────────────┘
```

---

## Dimensões A4 de Referência

| Formato | mm | px (96 DPI) |
|---------|-----|-------------|
| A4 Width | 210mm | 794px |
| A4 Height | 297mm | 1123px |
| Margens típicas | 10-20mm | 38-76px |

Usar `max-w-[210mm]` garante que o documento respeita a largura A4.

---

## Estimativa

| Ficheiro | Linhas alteradas |
|----------|------------------|
| ProposalClientDocument.tsx | ~20 linhas |
| ProposalDocumentPreviewDialog.tsx | ~2 linhas |
| App.css (print styles) | ~15 linhas |
| **Total** | ~37 linhas |
