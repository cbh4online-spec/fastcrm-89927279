

# Simplificar Criação de Fluxos para Utilizadores Não-Técnicos

## Problema

O diálogo atual de criação de fluxos assume conhecimento técnico: pede nome, descrição, objetivo, persona, bases de conhecimento, e canais — tudo de uma vez. Os templates existentes são específicos (Pharliss, Dr. Kraut) e não servem para casos genéricos. Não há opção de descrever o que se quer em linguagem natural.

## Solução — 3 Melhorias

### 1. Wizard Guiado (Step-by-Step)

Substituir o formulário único por um wizard de 4 passos com progresso visual:

| Passo | Conteúdo | Ajuda |
|-------|----------|-------|
| **1. O que quer fazer?** | Escolher categoria visual (Vendas, Suporte, Onboarding, FAQ, Agendamento, Personalizado) | Cards grandes com ícone e descrição |
| **2. Detalhes** | Nome (pré-preenchido pela categoria), descrição opcional | Sugestão automática de nome |
| **3. Configuração** | Persona + Knowledge Bases (com explicação do que cada um faz) | Tooltips explicativos |
| **4. Canais** | Checkboxes com ícones visuais dos canais | Recomendação automática baseada na categoria |

Barra de progresso no topo. Botões "Anterior" / "Seguinte" / "Criar". Pode saltar passos opcionais.

### 2. Templates Genéricos

Adicionar 4 templates universais ao `FLOW_TEMPLATES`:

- **Suporte ao Cliente** — Triagem, recolha de problema, encaminhamento para agente
- **Onboarding** — Boas-vindas, recolha de dados, tour guiado
- **FAQ Interativo** — Menu de perguntas frequentes com respostas automáticas
- **Agendamento** — Recolha de data/hora preferida, confirmação, lembrete

Cada template com passos pré-configurados, variáveis, e canais recomendados.

### 3. Geração por IA

Novo tab no wizard: **"Descrever com IA"** — o utilizador escreve em linguagem natural o que quer (ex: "quero um fluxo que qualifique leads de imobiliário") e a IA gera automaticamente nome, passos, variáveis e conexões.

- Textarea com placeholder exemplificativo
- Botão "Gerar Fluxo" que chama edge function com prompt
- Preview do resultado antes de confirmar
- Usa o modelo Lovable AI (sem API key necessária)

## Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/flow-builder/CreateFlowDialog.tsx` | Reescrever como wizard multi-step com 3 modos (wizard, template, IA) |
| `src/components/flow-builder/FlowTemplates.tsx` | Adicionar 4 templates genéricos |
| `src/components/flow-builder/FlowWizardSteps.tsx` | **Novo** — componentes dos 4 passos do wizard |
| `src/components/flow-builder/GenerateFlowAI.tsx` | **Novo** — textarea + chamada IA para gerar fluxo |

## UX Final

O diálogo abre com 3 opções visuais grandes:
1. 🧙 **Assistente Guiado** — "Responda algumas perguntas e criamos o fluxo"
2. 📋 **Usar Template** — "Comece com um modelo pronto"  
3. ✨ **Descrever com IA** — "Diga o que precisa e a IA cria por si"

Cada opção leva a um percurso diferente, todos terminando na criação do fluxo.

