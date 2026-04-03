

# Dinamizar Criação de Vagas com Assistência de IA

## Objectivo

Transformar o formulário de criação de vagas num fluxo assistido por IA que gera automaticamente descrições profissionais, sugere faixas salariais e condições, com base no título da vaga, localização e tipo de contrato.

## Alterações

| Ficheiro | Acção |
|---|---|
| `src/components/hr/recruitment/JobPostingAIAssist.tsx` | **Criar** — componente com botões de assistência IA para cada campo |
| `src/pages/dashboard/hr/recruitment/JobOpeningsPage.tsx` | **Editar** — integrar assistência IA no formulário de criação |
| `supabase/functions/hr-job-ai-assist/index.ts` | **Criar** — edge function que gera conteúdo para vagas via ai-router |

## Detalhe técnico

### Edge Function `hr-job-ai-assist`

Acções suportadas:
- **`generate_description`** — recebe título, tipo de contrato, modalidade, localização → devolve descrição profissional completa da vaga
- **`suggest_salary`** — recebe título, localização, tipo de contrato → devolve faixa salarial sugerida (min/max) com base no mercado
- **`generate_requirements`** — recebe título, descrição → devolve lista de requisitos obrigatórios e nice-to-have

Usa o `ai-router` existente (Lovable AI, modelo `google/gemini-3-flash-preview`). Prompts em português de Portugal, contextualizados para o mercado laboral.

### Componente `JobPostingAIAssist`

Botões com ícone ✨ (Sparkles) ao lado de cada campo relevante:
- **Junto à descrição**: "Gerar descrição com IA" — preenche o campo `description` com texto gerado
- **Junto ao salário**: "Sugerir salário" — preenche `salary_min` e `salary_max`
- **Junto aos requisitos**: "Gerar requisitos com IA" — preenche `requirements_text` e `nice_to_have_text`

Cada botão:
1. Valida que o título está preenchido (obrigatório para contexto)
2. Chama a edge function com os dados já preenchidos no formulário
3. Mostra estado de loading no botão
4. Preenche os campos via `form.setValue()` do react-hook-form
5. Utilizador pode editar livremente após geração

### Integração no formulário

O formulário existente no `JobOpeningsPage.tsx` será reorganizado para:
1. Pedir primeiro os dados base (título, localização, tipo, modalidade) — estes alimentam o contexto da IA
2. Após esses campos, mostrar os campos de texto (descrição, requisitos, nice-to-have) com botões IA ao lado dos labels
3. Campos de salário com botão "Sugerir" que preenche ambos os valores
4. Botão "Gerar tudo com IA" no topo que preenche descrição + requisitos + salário de uma só vez

### Fluxo do utilizador

```text
1. Utilizador preenche: Título + Localização + Tipo + Modalidade
2. Clica "✨ Gerar tudo com IA" (ou botões individuais)
3. IA gera: descrição, requisitos, nice-to-have, faixa salarial
4. Campos são preenchidos automaticamente
5. Utilizador revê, edita e submete
```

### Segurança

- Edge function valida JWT + workspace membership
- CORS headers em todas as respostas
- Rate limiting via `aiGate` existente

