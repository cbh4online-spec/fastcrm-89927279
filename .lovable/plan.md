
# Plano: Integrar Bases de Conhecimento Completas nos Assistentes IA

## Problema Atual

O sistema tem **dois módulos separados** que criam fragmentação:

```text
SITUAÇÃO ATUAL (Duplicada)
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  [Assistentes IA]              [Bases Conhecimento]                │
│  /dashboard/ai-assistants      /dashboard/knowledge-base           │
│  ├── Agentes                   ├── Bases (gestão completa)         │
│  ├── Personas                  ├── Fluxos                          │
│  ├── Bases (acesso rápido)  ←──┤ Widget                            │
│  └── Definições                └── Testar IA                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

PROBLEMA:
- Tab "Bases" nos Assistentes IA é apenas link para outro módulo
- Utilizador tem de navegar entre 2 páginas para configurar IA
- Sidebar tem 2 entradas quando deveria ter 1
```

---

## Solução: Módulo Único "Assistentes IA"

```text
ARQUITETURA PROPOSTA (Unificada)
┌─────────────────────────────────────────────────────────────────────┐
│  [Assistentes IA] - /dashboard/ai-assistants                       │
│                                                                     │
│  TABS:                                                              │
│  ├── Agentes      → Bots por canal (WhatsApp, Widget, etc.)       │
│  ├── Personas     → Biblioteca de personalidades                   │
│  ├── Bases        → Gestão COMPLETA de bases de conhecimento       │
│  │   └── Entradas, Fontes, Adicionar conteúdo                     │
│  ├── Fluxos       → Flow Builder (conversas estruturadas)         │
│  ├── Widget       → Configuração do chat widget                    │
│  ├── Testar IA    → Chat de teste com métricas                    │
│  └── Definições   → Configurações globais                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Mudanças Propostas

### 1. Expandir AIAssistantsModule

Adicionar as tabs que existem no KnowledgeBaseModule:
- **Bases** → Gestão completa (criar, adicionar fontes, entradas)
- **Fluxos** → FlowBuilderModule integrado
- **Widget** → WidgetConfigPanel integrado
- **Testar IA** → AIQueryPanel + métricas

### 2. Atualizar Navegação

| Ação | Detalhes |
|------|----------|
| Remover | Link "Bases Conhecimento" do Sidebar |
| Manter | Link "Assistentes IA" como entrada única |
| Opcional | Manter rota `/dashboard/knowledge-base` como redirect |

### 3. Nova Estrutura de Tabs

```text
Assistentes IA (7 tabs)
├── Agentes     → Lista de bots por canal
├── Personas    → Biblioteca de personalidades  
├── Bases       → Gestão completa de KBs (expandido)
├── Fluxos      → Flow Builder
├── Widget      → Configuração do widget
├── Testar IA   → Chat de teste + métricas
└── Definições  → Configurações globais
```

---

## Implementação Técnica

### Fase 1: Expandir AIAssistantsModule

- Adicionar tabs: `flows`, `widget`, `query`
- Importar componentes do KnowledgeBaseModule:
  - `FlowBuilderModule`
  - `WidgetConfigPanel`
  - `AIQueryPanel`
  - `KnowledgeMetricsCard`
- Transformar `KnowledgeBasesTab` de "acesso rápido" para gestão completa

### Fase 2: Criar KnowledgeBasesFullTab

Nova tab com funcionalidade completa:
- Lista de bases (sidebar)
- Painel de detalhes (entradas, fontes)
- Adicionar conteúdo (URL, manual, documento)
- Criar/editar bases
- Criar/editar personas (mover lógica existente)

### Fase 3: Atualizar Sidebar

- Remover entrada "Bases Conhecimento"
- Atualizar tooltip de "Assistentes IA" para incluir todas as funcionalidades

### Fase 4: Redirect (Opcional)

Manter compatibilidade:
```typescript
// Em App.tsx
<Route path="/dashboard/knowledge-base" element={<Navigate to="/dashboard/ai-assistants?tab=bases" replace />} />
```

---

## Ficheiros a Criar/Modificar

### Novos Ficheiros
- `src/components/ai-assistants/KnowledgeBasesFullTab.tsx` - Gestão completa de KBs
- `src/components/ai-assistants/FlowsTab.tsx` - Wrapper para FlowBuilderModule
- `src/components/ai-assistants/WidgetTab.tsx` - Wrapper para WidgetConfigPanel  
- `src/components/ai-assistants/TestAITab.tsx` - Chat de teste + métricas

### Ficheiros a Modificar
- `src/components/ai-assistants/AIAssistantsModule.tsx` - Adicionar novas tabs
- `src/components/layout/Sidebar.tsx` - Remover link "Bases Conhecimento"
- `src/App.tsx` - Adicionar redirect de compatibilidade

### Ficheiros a Deprecar
- `src/pages/KnowledgeBase.tsx` - Substituído por redirect
- `src/components/knowledge-base/KnowledgeBaseModule.tsx` - Funcionalidade movida

---

## Benefícios

| Antes | Depois |
|-------|--------|
| 2 páginas separadas | 1 página unificada |
| 2 entradas no Sidebar | 1 entrada centralizada |
| Tab "Bases" era apenas link | Tab "Bases" com gestão completa |
| Navegar entre módulos | Tudo acessível via tabs |

---

## Estimativa

- Novos componentes (tabs wrapper): ~200 linhas
- Refactoring AIAssistantsModule: ~150 linhas
- Atualização Sidebar: ~10 linhas
- Redirect e cleanup: ~20 linhas
- **Total: ~380 linhas de código**

---

## Resultado Final

O utilizador terá:
1. **Uma única página** para toda a gestão de IA
2. **Navegação simplificada** no Sidebar (menos clutter)
3. **Todas as funcionalidades acessíveis** via tabs no mesmo módulo
4. **Zero duplicação** de conceitos
5. **Fluxo intuitivo**: Agentes → Personas → Bases → Fluxos → Widget → Testar
