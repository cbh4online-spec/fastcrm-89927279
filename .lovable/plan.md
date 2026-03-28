

# Auditoria e Melhorias das Personas IA

## Estado Atual

As Personas têm **duas camadas desconectadas**:

1. **Camada simples** (`PersonasTab.tsx` + `useKnowledgeBase`): CRUD básico com apenas nome, descrição, tipo e tom de voz. É o que aparece na UI (screenshot).
2. **Camada avançada** (`useAIPersonas.ts` + `ai-persona-chat` edge function): Suporta vibe profiles, backstory, expertise domain, system prompt compilado, RAG com knowledge bases, temperature, max tokens, fallback message — mas **nada disto está exposto na UI**.

Existem também **componentes prontos mas não usados**:
- `PersonaTestChat.tsx` — chat de teste funcional, nunca importado na tab
- `GeneratePersonaDialog.tsx` — geração de persona por IA, nunca importado na tab

## O Que Falta

### 1. Integrar componentes existentes na PersonasTab
- Adicionar botão **"Gerar com IA"** que abre o `GeneratePersonaDialog`
- Adicionar botão **"Testar"** em cada card que abre o `PersonaTestChat`

### 2. Expandir o formulário de criação/edição
O formulário atual só tem 4 campos. Adicionar:
- **Vibe Profile** — dropdown para associar um perfil de vibe existente
- **System Prompt** — textarea para prompt personalizado
- **Backstory** — textarea para personalidade/história
- **Expertise Domain** — campo de texto
- **Fallback Message** — mensagem quando não sabe responder
- **Temperature** — slider (0-1)
- **Max Tokens** — input numérico
- **Knowledge Bases** — multi-select para associar bases de conhecimento

### 3. Melhorar os cards de persona
- Badge de **status** (ativo/draft/arquivado) com toggle
- Indicador de **persona padrão** (estrela) com ação para definir
- Tags mostrando onde está ativa: Inbox, Copilot, Portal B2B
- Contagem de bases de conhecimento associadas

### 4. Conectar personas aos agentes
- No formulário de agente (`AIAgentForm`), adicionar dropdown para selecionar persona
- O agente herda o comportamento da persona quando em execução

## Ficheiros a Editar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/ai-assistants/PersonasTab.tsx` | Reescrever — usar `useAIPersonas` em vez de `useKnowledgeBase`, integrar TestChat e GenerateDialog, expandir formulário |
| `src/components/ai-assistants/PersonaTestChat.tsx` | Sem alterações (já funcional) |
| `src/components/ai-assistants/GeneratePersonaDialog.tsx` | Sem alterações (já funcional) |
| `src/components/ai-agents/AIAgentForm.tsx` | Adicionar selector de persona |

## Resultado

Personas passam de CRUD simples a sistema completo: criação manual ou por IA, configuração rica (vibe, prompt, RAG, temperature), teste em tempo real, e integração com agentes.

