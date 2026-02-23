

# Melhorar Formatacao dos PDFs do Feature Registry

## Problemas Actuais

Os PDFs actuais usam apenas texto simples com `jsPDF`, sem cores, sem fundos, sem bordas, sem tabelas formatadas. O resultado e um documento pouco profissional e dificil de ler.

## Melhorias a Implementar

### PDF Tecnico

1. **Capa profissional**
   - Fundo azul escuro (#1a1a2e) no topo com titulo em branco
   - Linha decorativa separadora
   - Stats em cards lado-a-lado com fundo cinza claro

2. **Headers de categoria**
   - Barra de fundo colorida com texto branco por cada categoria
   - Cores distintas por categoria (CRM azul, IA roxo, Marketing verde, etc.)

3. **Cards de modulo**
   - Fundo cinza claro (#f5f5f5) em rectángulo arredondado
   - Nome do modulo em bold, badge de plano alinhado a direita
   - Seccoes (Pages, Hooks, Edge Functions, Tables, Features) com icones textuais e indentacao clara

4. **Features**
   - Tag "[IA]" com fundo roxo claro e texto roxo
   - Status com cor (active = verde, beta = amarelo, planned = cinza)

5. **Separadores visuais**
   - Linhas com gradiente ou cor por categoria entre modulos

6. **Footer**
   - Numero de pagina centrado em todas as paginas
   - "FastCRM - Technical Architecture" no rodape

7. **Appendix**
   - Edge functions e tabelas em colunas duplas para melhor uso do espaco

### PDF Comercial

1. **Capa premium**
   - Fundo gradient azul escuro para azul
   - "FastCRM" grande em branco, subtitulo elegante
   - Stats em 4 boxes com icones textuais e numeros grandes
   - Data formatada por extenso

2. **Headers de categoria**
   - Barra colorida com label e contagem de modulos

3. **Modulos**
   - Card com borda esquerda colorida (accent da categoria)
   - Nome em bold, plano como badge com fundo colorido
   - Descricao em italico
   - Features com bullet colorido, tag "IA" destacada com estrela dourada

4. **Tabela resumo final**
   - Tabela com linhas alternadas (zebra striping)
   - Header com fundo escuro e texto branco
   - Linha de totais em bold com fundo destacado

5. **Footer**
   - Numero de pagina + "Confidencial" no rodape

## Detalhes Tecnicos

### Ficheiro a editar: `src/utils/featureRegistryExport.ts`

Usar exclusivamente APIs do `jsPDF`:
- `doc.setFillColor(r, g, b)` + `doc.rect(x, y, w, h, 'F')` para fundos coloridos
- `doc.setTextColor(r, g, b)` para texto colorido
- `doc.setFont(undefined, 'bold')` / `doc.setFont(undefined, 'normal')` para bold
- `doc.setDrawColor()` + `doc.line()` para linhas decorativas
- `doc.setPage()` + loop final para adicionar footers a todas as paginas

### Cores por categoria
```text
Core:         #3b82f6 (azul)
CRM:          #2563eb (azul escuro)
Comunicacao:  #0891b2 (cyan)
Vendas:       #059669 (verde)
Marketing:    #d97706 (amber)
Loja Online:  #7c3aed (roxo)
Portal B2B:   #0d9488 (teal)
Comunidade:   #e11d48 (rosa)
IA:           #8b5cf6 (violeta)
Estrategia:   #4f46e5 (indigo)
Vertical:     #ca8a04 (amarelo)
Admin:        #64748b (slate)
```

### Helpers adicionais
- `drawColoredHeader(doc, text, color, y)` -- barra colorida com texto
- `drawStatBox(doc, label, value, x, y)` -- box de estatistica
- `drawModuleCard(doc, mod, y, accentColor)` -- card de modulo com borda
- `addFooters(doc, title)` -- loop final para numeros de pagina

### Resultado
- PDFs visualmente profissionais, prontos para apresentacao a clientes
- Hierarquia visual clara com cores, espacamento e tipografia
- Consistencia de branding FastCRM em ambos os formatos
