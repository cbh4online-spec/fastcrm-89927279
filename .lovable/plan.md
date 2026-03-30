

# Instalar livrarias críticas em falta

## Estado actual
Já instalados: `@tailwindcss/typography` (configurado), `remark-gfm`, `react-markdown`, `cmdk`, `@xyflow/react`, `recharts`

## Livrarias a instalar

### 1. `@tanstack/react-table` (v8)
Tabelas avançadas com sorting, filtering, paginação e row selection. Impacta Contactos, Leads, Facturas, Produtos, Audit Logs e praticamente todas as listagens.

### 2. `@tanstack/react-virtual` (v3)
Virtualização de listas longas — só renderiza o que está visível. Essencial para performance em Contactos, Inbox, Audit Logs com milhares de registos.

### 3. `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`
Drag-and-drop moderno e acessível para Pipeline/Kanban, Automações Builder, Vision Board e reordenação de blocos.

## Alterações

| Ficheiro | Alteração |
|---|---|
| `package.json` | Adicionar 5 dependências: `@tanstack/react-table`, `@tanstack/react-virtual`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |

## Nota
Esta fase é apenas instalação. As livrarias ficam disponíveis para uso nos módulos — a integração nos componentes existentes será feita separadamente conforme necessidade.

