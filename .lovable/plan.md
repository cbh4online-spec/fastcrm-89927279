

## Problemas Identificados

1. **Excesso de grupos** — A sidebar tem ~12 secções colapsáveis (role sections + module groups), criando um menu extremamente longo e confuso
2. **Duplicação** — CRM, Pipeline, Faturas aparecem tanto nas secções hardcoded do cargo como nos módulos dinâmicos
3. **Branding fraco** — Não há logo, cor de marca, ou identidade visual na sidebar (apenas texto)
4. **Hierarquia visual plana** — Todos os grupos têm o mesmo peso visual, sem distinção entre funcionalidades core e extensões
5. **Navegação fragmentada** — Quick Actions, Gamification, Quota, Alertas ocupam espaço antes do menu real

---

## Nova Arquitectura Proposta

```text
┌─────────────────────────────┐
│  🏢 Logo + Workspace Name   │  ← Brand header com logo/cor
│  Jorge Cardoso · CEO        │
├─────────────────────────────┤
│  🔍 Pesquisar... (⌘K)      │  ← Command palette trigger
├─────────────────────────────┤
│  CORE (sempre visível)      │
│   📊 Dashboard              │
│   👥 CRM (colapsável)       │
│      Leads · Contactos      │
│      Empresas · Pipeline    │
│   📅 Atividades             │
│   📈 Performance            │
├─────────────────────────────┤
│  MÓDULOS ATIVOS             │  ← Apenas 1 secção dinâmica
│   (agrupados por ícone,     │
│    max 2 níveis)            │
│   🔎 Lead Enricher          │
│   📄 Propostas              │
│   🧾 Faturas                │
│   💬 WhatsApp               │
│   ... (scroll se necessário)│
├─────────────────────────────┤
│  ⚙️ Definições              │
│  ◀ Recolher                 │
└─────────────────────────────┘
```

---

## Plano de Implementação

### 1. Brand Header melhorado
- Integrar o `logo_url` do workspace (já existe em `store_settings`) no topo da sidebar
- Mostrar nome do workspace com tipografia premium e cor de marca (`primary_color`)
- User info compacto: avatar real (da tabela `profiles`) + nome + cargo numa linha

### 2. Unificar navegação em 3 blocos
- **Core** — Dashboard, CRM, Atividades, Performance (hardcoded, sempre visível, sem duplicação com módulos)
- **Módulos** — Lista flat dos módulos ativos do marketplace, sem sub-categorias (remover os headers "Inteligência", "Prospecção", etc.). Cada item é um link directo com ícone
- **Footer** — Definições + Recolher

### 3. Eliminar duplicação
- Remover das secções de cargo (`nav.adaptive.ts`) todos os items que já existem como módulos no registry (Propostas, Faturas, etc.)
- O CRM fica como bloco core obrigatório (já é), mas items como "Account Brief" vêm apenas dos módulos

### 4. Simplificar categorias de módulos
- Em vez de 11 headers colapsáveis, mostrar os módulos numa lista flat ordenada por categoria (sem header de categoria)
- Opcionalmente, um separador fino entre categorias diferentes (sem texto)

### 5. Mover elementos secundários
- Quick Actions → mover para a TopBar ou Command Palette
- Gamification Strip → mover para o Dashboard ou perfil
- Quota Progress → mover para o Dashboard
- Critical Alerts → mover para TopBar notification bell
- Isto liberta ~120px de espaço vertical na sidebar

### 6. Pesquisa inline
- Adicionar um campo de pesquisa no topo que filtra os items do menu (ou trigger para o Command Palette existente)

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|---|---|
| `src/config/nav.adaptive.ts` | Reduzir para 3 secções core (Dashboard, CRM, Atividades/Performance), remover items duplicados com módulos |
| `src/config/moduleNavRegistry.ts` | Remover `categoryLabels`/headers, simplificar para lista flat |
| `src/components/layout/AdaptiveSidebar.tsx` | Redesign completo: brand header, 3 blocos, remover gamification/quota/alerts inline |
| `src/components/layout/TopBar.tsx` | Absorver quick actions e alertas críticos |

