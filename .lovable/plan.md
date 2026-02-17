

# Hero Bio Block -- Design mais fino, icon destacado e copy orientado a dor

## Resumo
Melhorar o bloco "Hero" no preview das paginas Bio para ter um design mais compacto, um icon/emoji visual destacado, e garantir que os titulos gerados pela IA toquem directamente nas dores do utilizador.

## Alteracoes

### 1. Preview do Hero mais fino com icon destacado
**Ficheiro:** `src/components/bio/BioBlockPreviewCard.tsx` (linhas 77-96)

Redesenhar o case "hero":
- Reduzir padding de `p-8` para `p-5`
- Reduzir titulo de `text-2xl` para `text-xl`
- Adicionar um icon circular destacado no topo (usando um campo `icon` do content, com fallback para um icon default como `Sparkles`)
- O icon fica num circulo com fundo semi-transparente, separado visualmente do texto
- Layout: icon centrado no topo, titulo, subtitulo e CTA abaixo

### 2. Adicionar campo "icon" ao hero block
**Ficheiro:** `src/components/bio/BioBlockEditor.tsx` (linha 81)

Adicionar `icon: "sparkles"` ao `defaultContent` do hero e adicionar um campo de seleccao/input no editor para o icon.

### 3. Copy da IA orientado a dor
**Ficheiro:** `supabase/functions/bio-smart-link/index.ts` (linhas 54-72)

Ajustar o prompt de geracao de copy para:
- O `title` deve identificar uma dor ou problema do visitante (ex: "Cansado de perder clientes?") em vez de ser apenas chamativo
- O `subtitle` deve apresentar a solucao/beneficio directo
- Instruir a IA a usar a framework PAS (Problema-Agitacao-Solucao) em vez de AIDA para os titulos

Prompt actual:
```
- "title": titulo curto e chamativo (max 6 palavras), usa tecnicas AIDA
```

Novo:
```
- "title": identifica a dor principal do publico-alvo (max 8 palavras), usa a framework PAS -- comeca pelo problema
- "subtitle": apresenta a solucao e o beneficio concreto (max 15 palavras)
```

## Detalhes Tecnicos

### BioBlockPreviewCard.tsx -- Novo layout do hero:

```text
+----------------------------------+
|         [ Icon Circle ]          |
|                                  |
|     Titulo orientado a dor       |
|   Subtitulo com a solucao        |
|                                  |
|       [ Botao CTA ]              |
+----------------------------------+
```

- Icon: circulo de 48px com fundo `primaryColor/20`, icon branco/escuro de 24px
- Padding reduzido para `p-5 pt-6`
- Titulo: `text-xl font-extrabold` (era `text-2xl`)
- Texto centrado para um look mais limpo

### bio-smart-link -- Prompt PAS:
O prompt sera ajustado para instruir a IA a comecar pelo problema real do visitante, criando identificacao imediata, seguido da solucao no subtitulo.

