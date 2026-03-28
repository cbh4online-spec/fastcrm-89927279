

# Expandir Definições Globais dos Assistentes IA

## Estado Atual

O tab de Definições Globais tem 3 secções estáticas (tempos de resposta, fallback, horário) mas está **tudo desativado** — os campos são `disabled`, o botão "Guardar" não funciona, e há uma mensagem a dizer "ainda em desenvolvimento". A tabela `ai_settings` já existe com muitos campos que não estão expostos.

## Novas Secções a Adicionar

### 1. Modelo IA Padrão
- Dropdown para selecionar modelo default (Gemini Flash, Gemini Pro, GPT-5, GPT-5 Mini, etc.)
- 3 sliders de temperatura: **Criativo**, **Analítico**, **Equilibrado** (já existem na tabela)
- Idioma de resposta padrão (dropdown: Português, English, Español, etc.)

### 2. Orçamento e Limites
- Budget mensal de tokens (input numérico)
- Alerta de threshold (slider % — ex: avisar aos 80%)
- Barra de progresso mostrando consumo atual vs budget
- Custo acumulado do mês (read-only)

### 3. Funcionalidades IA Ativas
- Toggle switches para cada módulo IA:
  - AI Copilot, Respostas Inbox, Sugestões de Campos, AI Agents, Sales Coach, IMO AI, AI Employees
- Cada toggle lê/escreve os campos `ai_*_enabled` da tabela `ai_settings`

### 4. Tokens por Tipo de Operação
- Max tokens para: respostas padrão, análises, geração de conteúdo, agentes
- 4 inputs numéricos (já existem na tabela: `max_tokens_default`, `max_tokens_analysis`, `max_tokens_generation`, `max_tokens_agents`)

### 5. Tornar Tudo Funcional
- Ligar ao hook `useAISettings` + `useUpdateAISettings` existentes
- Remover todos os `disabled` dos campos
- Botão "Guardar" funcional com upsert na tabela
- Toast de confirmação ao guardar

## Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/ai-assistants/GlobalSettingsTab.tsx` | Reescrever — adicionar todas as secções, ligar ao hook, tornar funcional |

## Resultado

Tab passa de placeholder estático a painel de controlo completo que governa o comportamento de todos os módulos IA do workspace.

