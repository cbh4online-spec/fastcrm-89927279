

# Módulo Seguimentos — O que falta para ser funcional

## Estado Atual
O módulo já tem uma base sólida:
- ✅ CRUD de sequências (nome, descrição, tags, condições de saída)
- ✅ Gestão de etapas (ordem, template/conteúdo custom, delay dias/horas, canal email/whatsapp)
- ✅ Tracking de inscrições (contact_id, status, etapa atual)
- ✅ Hook de inscrição (`useEnrollContact`)
- ✅ Integração com templates de comunicação

## O que falta (por prioridade)

### 1. Inscrição de Contactos via UI
**Problema**: O hook `useEnrollContact` existe mas não há forma de inscrever contactos na interface.

- Botão "Inscrever Contactos" no detail dialog
- Pesquisa de contactos/leads com autocomplete
- Inscrição em bulk a partir de segmentos ou filtros do CRM
- Preview de quantos contactos serão inscritos antes de confirmar

### 2. Gestão de Inscrições
**Problema**: A tab "Inscritos" mostra dados mas sem ações.

- Botões de Pausar/Retomar/Remover por inscrição
- Filtros por status (Ativo, Pausado, Concluído, Saiu)
- Mostrar nome do contacto em vez de UUID truncado
- Indicador visual de em que etapa cada contacto está (progress bar)

### 3. Log de Atividade por Inscrição
**Problema**: Não se sabe o que aconteceu com cada contacto.

- Timeline de eventos: "Email enviado", "Aguardando X dias", "Resposta recebida → saiu"
- Estado de cada envio (enviado, aberto, clicado, respondeu, bounce)
- Expandir inscrição para ver histórico completo

### 4. Analytics por Sequência e por Etapa
**Problema**: Sem métricas de performance.

- **Por sequência**: taxa de conclusão, taxa de saída, tempo médio para completar
- **Por etapa**: taxa de abertura, taxa de clique, taxa de resposta
- Gráfico de funil (quantos chegam a cada etapa)
- Comparação entre sequências

### 5. Flow Builder Visual
**Problema**: As etapas são uma lista simples sem visualização do fluxo.

- Vista de fluxo vertical com nós conectados (etapa → delay → etapa)
- Drag & drop para reordenar
- Visualização clara dos delays e condições entre etapas
- Mini-preview do conteúdo de cada etapa no nó

---

## Ficheiros a Criar/Modificar

| Ficheiro | Ação |
|---|---|
| `src/components/sequences/EnrollContactsDialog.tsx` | **Novo** — Pesquisa e inscrição de contactos |
| `src/components/sequences/EnrollmentCard.tsx` | **Novo** — Card de inscrição com ações e progress |
| `src/components/sequences/SequenceFlowView.tsx` | **Novo** — Visualização de fluxo vertical |
| `src/components/sequences/SequenceAnalytics.tsx` | **Novo** — Dashboard de métricas por sequência |
| `src/components/sequences/EnrollmentTimeline.tsx` | **Novo** — Timeline de atividade por inscrição |
| `src/components/sequences/SequenceDetailDialog.tsx` | **Modificar** — Integrar enrollment UI, analytics tab, flow view |
| `src/hooks/useEmailSequences.ts` | **Modificar** — Adicionar mutations para pause/resume/remove enrollment, fetch com nome do contacto |

## Ordem de Implementação
1. **Enrollment UI** — sem isto o módulo é literalmente inutilizável
2. **Gestão de inscrições** — ações básicas sobre contactos inscritos
3. **Log de atividade** — visibilidade do que acontece
4. **Analytics** — métricas de performance
5. **Flow builder** — diferenciação visual

