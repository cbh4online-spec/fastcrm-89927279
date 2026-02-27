

# Command Center — AI Revenue Command Hub

## Contexto

Existe já uma página `/dashboard/ask` com `AskFastCRMInline` — uma interface de query simples (input texto + chips sugeridos + resultados). O PRD pede um **Command Center** premium: hub central com slash commands (`/resumir pipeline`, `/prioridades`), input de texto e voz, upload, e visual dark+gold. A página actual será **substituída** pelo Command Center, mantendo a funcionalidade Ask existente como parte do hub.

## Arquitectura

### Página `/dashboard/command-center` (nova rota principal)

Layout premium full-page com 3 zonas:

```text
┌─────────────────────────────────────────────┐
│  ⚡ Revenue Command Center                  │
│  "Your Sales AI Agent"                      │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 💬 Input Zone (texto + voice + /)   │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌── Quick Commands ──────────────────┐    │
│  │ /resumir pipeline  /prioridades    │    │
│  │ /analisar lead     /prever receita │    │
│  │ /criar follow-up   /gerar proposta │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌── Output Zone ─────────────────────┐    │
│  │ Resultados Ask / Respostas AI       │    │
│  │ Cards, métricas, ações             │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌── Recent ──────────────────────────┐    │
│  │ Últimas queries                     │    │
│  └────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Funcionalidades

1. **Slash Commands** — Menu dropdown ao digitar `/`:
   - `/resumir pipeline` → chama `summarizeConversation` ou edge function dedicada
   - `/prioridades` → chama `suggestNextActions` com dados do workspace
   - `/analisar lead [nome]` → busca lead e classifica
   - `/prever receita` → navega para forecast ou mostra inline
   - `/criar follow-up` → cria tarefa rápida
   - `/gerar proposta` → navega para propostas

2. **Voice Input** — Botão microfone que usa Web Speech API (browser nativo) para transcrever e submeter como texto

3. **Text Input** — Reutiliza `useAskFastCRM` para queries normais, com slash command detection adicional

4. **Quick Command Cards** — Grid de atalhos visuais clicáveis

5. **Output Zone** — Reutiliza `AskFastCRMResultPanel` para resultados estruturados + área de resposta de slash commands

## Ficheiros

| Ficheiro | Acção |
|----------|-------|
| `src/pages/CommandCenterPage.tsx` | Nova página premium com layout Command Center |
| `src/components/command-center/CommandInput.tsx` | Input com detecção de `/`, voice button, submit |
| `src/components/command-center/SlashCommandMenu.tsx` | Dropdown de slash commands ao digitar `/` |
| `src/components/command-center/QuickCommandGrid.tsx` | Grid de atalhos visuais |
| `src/components/command-center/CommandOutput.tsx` | Zona de output (Ask results + slash command responses) |
| `src/hooks/useSlashCommands.ts` | Lógica de parsing e execução de slash commands |
| `src/config/nav.v1.ts` | Renomear "Coach IA" → "Command Center" com ícone `Terminal` |
| `src/App.tsx` | Adicionar rota `/dashboard/command-center`, redirect `/dashboard/ask` |

## Notas Técnicas

- Voice input usa `webkitSpeechRecognition` / `SpeechRecognition` (API nativa do browser, sem dependências)
- Slash commands executam hooks existentes (`useAskFastCRM`, `useAskAI`, `useIntelligencePanel`)
- O visual premium usa `glass-premium`, `glow-gold`, gradientes dourados do design system existente
- A rota `/dashboard/ask` faz redirect para `/dashboard/command-center` para não quebrar links existentes

