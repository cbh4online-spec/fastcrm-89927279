
# Sugestoes IA para Oferta baseadas na Profissao

## Problema

O dialog "Configurar Oferta" obriga o utilizador a escrever manualmente o que oferece e que dores resolve. Isso e lento e muitos utilizadores nao sabem o que escrever. A IA deveria sugerir opcoes automaticamente com base na profissao-alvo.

## Solucao

Quando o utilizador escreve ou seleciona uma profissao no dialog "Configurar Oferta", a IA gera 3-4 sugestoes de oferta + dores para essa profissao. O utilizador escolhe uma com um clique ou personaliza.

## Alteracoes

### 1. Nova Edge Function `generate-offer-suggestions`

Recebe a profissao e devolve 3-4 sugestoes, cada uma com:
- `offer`: o que oferecer (ex: "Gestao de redes sociais para clinicas de fisioterapia")
- `painPoints`: dores que resolve (ex: "Poucos pacientes novos, perfil sem conteudo, sem presenca digital")
- `label`: nome curto da sugestao (ex: "Marketing Digital")

Usa o metodo AIDA para enquadrar as dores de forma persuasiva.

### 2. Actualizar dialog "Configurar Oferta" em `ProfessionalProspecting.tsx`

- Adicionar campo "Profissao-alvo" no topo do dialog
- Botao "Gerar sugestoes" ao lado do campo
- Mostrar 3-4 cards clicaveis com as sugestoes da IA
- Ao clicar numa sugestao, preenche automaticamente os campos "O que ofereces?" e "Que dores resolves?"
- O utilizador pode editar antes de guardar
- Loading state enquanto a IA gera

### 3. Layout do dialog actualizado

```text
+-----------------------------------+
| Configurar Oferta                 |
|                                   |
| Profissao-alvo:                   |
| [Fisioterapeuta    ] [Sugerir IA] |
|                                   |
| --- Sugestoes IA ----             |
| [Marketing Digital]  [Websites]   |
| [Conteudo Video]     [SEO Local]  |
|                                   |
| O que ofereces?                   |
| [preenchido pela sugestao]        |
|                                   |
| Que dores resolves?               |
| [preenchido pela sugestao]        |
|                                   |
|          [Cancelar] [Guardar]     |
+-----------------------------------+
```

## Detalhes tecnicos

### Edge Function `generate-offer-suggestions`

- Modelo: `google/gemini-3-flash-preview`
- Input: `{ profession: string }`
- Output via tool calling: `{ suggestions: Array<{ label, offer, painPoints }> }`
- Prompt instrui a IA a pensar em AIDA: que dores tem esta profissao, que solucoes se pode oferecer, como criar desejo

### Ficheiros a criar/modificar

- `supabase/functions/generate-offer-suggestions/index.ts` (novo)
- `supabase/config.toml` (adicionar funcao)
- `src/pages/ProfessionalProspecting.tsx` (actualizar dialog com campo profissao + sugestoes IA)
