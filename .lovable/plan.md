

## Corrigir War Room Briefing PDF — Formatação e Dados do Workspace

### Problemas identificados

1. **Emojis corrompidos** — jsPDF usa Helvetica (Type 1) que nao suporta Unicode emojis. Resultado: "Ø=UE", "Ø=Y4", "&b" em vez de icons
2. **Espaçamento estranho nos headings** — letras separadas por espaços nos titulos de secção
3. **Sem dados do workspace** — nao mostra nome da empresa, logo, ou informação contextual
4. **Layout pobre** — sem cores, sem separadores visuais, sem tabelas; tudo em texto corrido
5. **Pagina 2 quase vazia** — so tem acoes prioritarias sem estrutura visual

### Solução

Reescrever `WarRoomBriefingExport.tsx` com as seguintes correcções:

#### 1. Remover todos os emojis Unicode
Substituir por prefixos textuais ASCII:
- `📊` → `[SITUACAO]` ou simplesmente nada (o heading bold ja e suficiente)
- `📈` → remover
- `🎯` → `>>` 
- `✅` → `[OK]`
- `⚠️` → `[!]`
- `🔴` → `[X]`
- `🔥` → `[HOT]`
- `🧠` → remover
- `🚀` → remover

#### 2. Adicionar dados do workspace no header
- Receber `workspaceName` e `workspaceLogoUrl` como props (vindos de `currentWorkspace` no `WeeklyDashboard`)
- Mostrar nome do workspace no header do PDF como subtitulo
- Se logo_url existir, carregar imagem e adicionar no topo (jsPDF suporta `addImage`)

#### 3. Melhorar layout visual com jsPDF
- **Header colorido**: barra de cor primaria no topo com nome do workspace
- **Secções com fundo**: usar `doc.setFillColor()` + `doc.rect()` para backgrounds subtis nas secções
- **KPIs em tabela**: usar `doc.autoTable` (jspdf-autotable) ou desenhar tabela manual com linhas/colunas para os KPIs
- **Status indicators**: usar circulos coloridos (`doc.circle()` com fill verde/amarelo/vermelho) em vez de emojis
- **Separadores**: linhas horizontais entre secções

#### 4. Passar dados do workspace desde WeeklyDashboard
- No `WeeklyDashboard.tsx`, adicionar `workspaceName={currentWorkspace?.name}` e `workspaceLogoUrl={currentWorkspace?.logo_url}` ao componente `WarRoomBriefingExport`

### Ficheiros a editar

| Ação | Ficheiro |
|------|---------|
| Editar | `src/components/weekly-dashboard/WarRoomBriefingExport.tsx` |
| Editar | `src/pages/WeeklyDashboard.tsx` |

### Detalhe tecnico

- Instalar `jspdf-autotable` para tabelas formatadas nos KPIs (alternativa: desenhar linhas manuais)
- Carregar logo via `fetch` + `canvas` para converter em base64 antes de `addImage`
- Usar `doc.setFillColor(r,g,b)` + `doc.rect(x,y,w,h,'F')` para backgrounds de secção
- Status circles: `doc.setFillColor(0,180,0)` + `doc.circle(x,y,1.5,'F')` para verde, etc.
- Footer: manter "FastCRM War Room Briefing" mas adicionar nome do workspace

