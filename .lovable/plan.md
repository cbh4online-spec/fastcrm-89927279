

# Redesign Inbox — Layout Multi-Coluna tipo SalesInbox

## O que muda
Transformar a lista de conversas de uma coluna única para um layout multi-coluna que agrupa conversas por relação CRM, idêntico ao print:

```text
┌──────────────┬──────────────────────┬──────────────────┬──────────────┐
│  SIDEBAR     │  NEGÓCIOS            │  CONTACTOS &     │  NÃO EXISTE  │
│  (existente) │  (lead com opport.)  │  OPORTUNIDADES   │  NO CRM      │
│              │                      │  DE NEGÓCIO      │              │
│  Pastas      │  Nome, assunto       │  Nome, assunto   │  Nome, hora  │
│  Vistas      │  Data, valor €       │  Data, ícone     │  Preview     │
│  Etiquetas   │                      │                  │              │
└──────────────┴──────────────────────┴──────────────────┴──────────────┘
```

## Colunas (categorização automática)

1. **NEGÓCIOS** — conversas com `lead_id` que tem oportunidades (`opportunities.length > 0`). Mostra badge de valor (€) da oportunidade.
2. **CONTACTOS & OPORTUNIDADES DE NEGÓCIO** — conversas com `contact_id` ou `lead_id` (sem oportunidade activa).
3. **NÃO EXISTE NO CRM** — conversas sem `lead_id`, `contact_id` nem `company_id`. Ponto azul para unread.
4. **COLEGAS** — conversas com `assigned_to` igual ao user actual (ou internas). Mostra ponto azul/verde para unread.

## Alterações

### 1. `ConversationList.tsx` — Refactorizar para multi-coluna
- Substituir a lista vertical única por um layout `flex` horizontal com 4 colunas scrolláveis
- Cada coluna tem header bold (título + contagem) e lista de itens
- Cada item mostra: nome (bold se unread), preview truncada, data (formato existente `formatSmartTime`), badge de valor para negócios, ícone de attachment (clip), ponto unread
- Manter: pesquisa global (filtra em todas as colunas), tabs simplificadas, seleção, realtime
- Remover avatar circular — usar apenas texto como no print

### 2. `InboxView.tsx` — Ajustar layout
- Quando em modo multi-coluna, a `ConversationList` ocupa mais largura (flex-1 em vez de w-80)
- Adicionar toggle no header para alternar entre vista lista única e multi-coluna (ícones grid/list)
- `ConversationDetail` abre como overlay ou ocupa o espaço ao clicar numa conversa

### 3. `InboxSidebar.tsx` — Estilização dark + secções
- Fundo escuro (dark sidebar como no print)
- Secções: PASTAS (Meu, Caixa de entrada, Rascunhos, Agendado, Enviado, Spam, Reciclagem, A fechar este mês, Clientes)
- Secção VISTAS (Marcar como não lido, Por abrir, Sem resposta, Não respondido, Positivo, Negativo, Todas as mensagens)
- Secção ETIQUETAS com botão +
- Botão "Escrever" no topo com estilo primário
- Barra de pesquisa no topo

### 4. Visual polish
- Items sem avatar — apenas nome em texto, data alinhada à direita
- Valores de oportunidade como badges verdes (€ 1.076,00)
- Attachment icon (clip) quando tem anexos
- Ponto azul/verde para unread
- Tipografia mais limpa: nome 13px semibold, preview 12px muted, data 11px

## Detalhes técnicos
- A categorização usa campos já existentes: `lead_id`, `contact_id`, `company_id`, `opportunities[]`
- Ficheiros alterados: `ConversationList.tsx`, `InboxView.tsx`, `InboxSidebar.tsx`
- Lógica de agrupamento no `useMemo` existente — sem queries adicionais
- Toggle de vista guardado em `localStorage` para persistir preferência

