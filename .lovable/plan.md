# Plano: Motor Conversacional da IA

## ✅ CONCLUÍDO

### 1. RLS Policies para Knowledge Base
- [x] Adicionadas 12 políticas Super Admin (SELECT, INSERT, UPDATE, DELETE) para:
  - `knowledge_bases`
  - `knowledge_sources`
  - `knowledge_entries`
- [x] Corrigidas políticas existentes com `WITH CHECK` clauses

### 2. UI do Motor Conversacional

#### Componentes Criados
- [x] `ConversationalEngineModule` - Módulo principal com tabs
- [x] `VibeProfilesTab` - Gestão de perfis de vibe/estilo
- [x] `VibeProfileForm` - Formulário para criar/editar vibes
- [x] `ConversationRulesTab` - Gestão de regras DO/DONT/STOP/REDIRECT
- [x] `ConversationRuleForm` - Formulário para criar/editar regras
- [x] `AutopilotConfigTab` - Configuração do Auto-Pilot

#### Hooks Criados
- [x] `useVibeProfiles` - CRUD de perfis de vibe
- [x] `useConversationRules` - CRUD de regras de conversa
- [x] `useAutopilotConfig` - Gestão de configuração do autopilot

#### Tipos Criados
- [x] `src/types/conversational-engine.ts` - Tipos e constantes

#### Rota Adicionada
- [x] `/dashboard/conversational-engine` - Nova página

#### Sidebar
- [x] Link "Motor Conversacional" adicionado à secção Utilitários

---

## Funcionalidades Implementadas

### Perfis de Vibe
- Gestão de tom (calmo, energético, etc.)
- Configuração de formalidade (informal, neutro, formal)
- Controlo de emojis, exclamações, contrações
- Limite de frases por resposta
- Abordagem comercial (não comercial, soft sell, valor)
- Definir perfil padrão

### Regras de Conversa
- **DO**: Ações que a IA DEVE executar
- **DONT**: Ações PROIBIDAS (com mensagem de recusa)
- **STOP**: Condições que terminam a conversa
- **REDIRECT**: Redireciona para outro fluxo/persona
- Condições por palavra-chave, regex, intenção, sentimento
- Prioridade configurável
- Âmbito (workspace, persona, canal, fluxo)

### Auto-Pilot
- Toggle master de ativação
- Delays de resposta simulando humano (8-12s)
- Indicador "A escrever..."
- Limites de mensagens por conversa
- Pausar quando humano intervém
- Reativação automática
- Horário de funcionamento
- Fuso horário
- Capacidades (imagens, áudio, ficheiros)

---

## Próximos Passos (Futuro)

1. **Integração com Edge Functions**
   - Conectar `ai-inbox-reply` para usar estas configurações

2. **Dashboard de Métricas**
   - Visualizar compliance, latência, conversões

3. **Replay Conversacional**
   - Interface para reproduzir conversas no CRM

4. **A/B Testing de Personas**
   - Comparar performance entre perfis
