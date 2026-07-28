# SAF-T: parser em streaming (fim dos timeouts em ficheiros grandes)

## Diagnóstico

O log confirma onde morre: o download (350 ms) e a descodificação (483 ms) correm bem, e o processo pára em `parse_xml_start`. Nesse passo o `fast-xml-parser` constrói a árvore XML inteira em memória — para um ficheiro de 15 MB com ~14.000 linhas de fatura, isso gera centenas de MB de objetos JavaScript e a função é morta por limite de recursos antes de emitir o passo seguinte. O watchdog só vê "sem progresso" e marca `failed`.

Correr em background não resolve, porque o problema é memória, não tempo.

## Solução

Substituir a leitura "tudo de uma vez" por leitura incremental: percorrer o XML por blocos, extrair cada `<Customer>`, `<Product>`, `<Invoice>` e `<Payment>` assim que fecha, converter para o formato atual e descartar imediatamente o texto já lido. A memória passa a ser proporcional a um documento, não ao ficheiro inteiro.

Além disso, o processamento passa a escrever progresso real a cada bloco (ex.: "1.200 de 1.644 faturas"), o que evita falsos timeouts e dá feedback honesto no ecrã.

## O que muda

1. **Novo parser incremental partilhado**
   - `supabase/functions/_shared/saft-stream-parser.ts`: leitor por blocos que emite `header`, `customer`, `product`, `invoice` e `payment` via callback, sem construir a árvore completa. Só o XML de um documento de cada vez é entregue ao `fast-xml-parser`.
   - Mantém exatamente os mesmos tipos (`SaftCustomer`, `SaftInvoice`, ...) já usados, para não tocar na lógica de mapeamento a jusante.
   - `saft-parser.ts` mantém-se para compatibilidade, mas passa a ser um wrapper sobre o streaming.

2. **Análise (`saft-analyze`)**
   - Deixa de acumular tudo: calcula as estatísticas (contagens e totais) durante a passagem, guardando apenas os agregados e os conjuntos de chaves necessários à deduplicação.
   - Regista `last_step_at` a cada 500 documentos.

3. **Importação (`saft-import`)**
   - Passa a importar em lotes à medida que lê: acumula 250 faturas, grava, liberta e continua. Clientes e produtos são resolvidos primeiro, numa passagem leve.
   - Ganha retoma: em caso de falha, reinicia a partir do último lote confirmado em vez de repetir tudo.
   - Buffers do XML já processado são libertados explicitamente.

4. **Descodificação sem duplicar o ficheiro em memória**
   - A descodificação `windows-1252` / `ISO-8859-1` passa a ser feita por bloco durante o streaming, em vez de gerar uma segunda cópia completa da string.

5. **Watchdog mais tolerante**
   - Migração para só marcar `failed` quando não há progresso em `last_step_at` há mais de 10 minutos (hoje penaliza jobs longos mas saudáveis).

6. **UI (`SafTImportPage`)**
   - Barra de progresso com contagens reais vindas do `debug_log` / `stats`.
   - Botão "Repetir processamento" que reaproveita o ficheiro já carregado, sem novo upload.

## Critérios de aceitação

- O ficheiro de 15 MB (1.644 faturas, 14.000 linhas) conclui análise e importação sem `WORKER_RESOURCE_LIMIT` nem timeout.
- Totais importados batem certo com os do relatório (líquido, IVA, bruto).
- Nenhuma fatura duplicada em reimportação do mesmo ficheiro (dedupe por `file_hash` e `saft_invoice_no` mantém-se).
- Progresso visível e crescente durante todo o processo.
- A importação `bd8207ab` pode ser repetida a partir do ficheiro já em storage.

## Riscos

- O leitor incremental tem de lidar com CDATA e com `>` dentro de atributos; será validado contra o ficheiro real "Com erros" antes de fechar.
- Ficheiros SAF-T de contabilidade (não faturação) usam estruturas diferentes; mantém-se o comportamento atual para esses.
- Se mesmo assim um ficheiro muito maior (>50 MB) falhar, o caminho seguinte é mover para um serviço Node dedicado — fica documentado, mas fora deste âmbito.
