## Diagnóstico

O erro acontece na análise do SAF-T, antes da importação efetiva.

Evidência confirmada:

- O ficheiro recente `SAF-T-PT_513875859_2024_1_12 - Com erros.XML` tem cerca de **15,1 MB**, 1.644 faturas e 14.000 linhas.
- A tabela `saft_imports` mostra este registo como `failed` com a mensagem: `Tempo limite excedido (sem progresso há mais de 10 minutos).`
- O `debug_log` parou em `parse_xml_start`; antes disso o ficheiro já tinha sido descarregado e descodificado com sucesso.
- Em `supabase/functions/saft-analyze/index.ts`, a análise usa `parseSaftXml(xml)` dentro da Edge Function.
- Em `supabase/functions/_shared/saft-parser.ts`, o parser atual usa `fast-xml-parser` para transformar o XML inteiro em objeto JS, o que cria picos de memória/CPU em ficheiros SAF-T anuais.
- A importação (`supabase/functions/saft-import/index.ts`) também volta a fazer download, decode e `parseSaftXml`, por isso mesmo que a análise passasse, ficheiros grandes continuariam em risco na fase seguinte.

Conclusão: o problema não parece ser permissões nem upload. O ponto crítico é o parsing completo do XML dentro da Edge Function, que não é adequado para SAF-T anuais de maior dimensão.

## Decisões de produto/UX

1. O utilizador deve conseguir importar SAF-T anuais como este, sem ser obrigado a dividir manualmente por mês.
2. A Edge Function deve deixar de fazer trabalho pesado; deve apenas validar acesso, marcar estado e enfileirar o processamento.
3. A página deve mostrar estado real: “em fila”, “a analisar”, “a importar”, “concluído” ou “falhado”, com último passo técnico visível apenas para diagnóstico.
4. O botão de repetir deve relançar o mesmo ficheiro já carregado, sem exigir novo upload.

## Estrutura técnica

### 1. Mover processamento pesado para background Node

Usar o serviço background existente (`trigger/`), alinhado com a regra do projeto de que jobs assíncronos devem correr fora das Edge Functions.

Criar um job SAF-T com duas fases:

- `saft-analyze-job`: descarrega o XML, faz parse, calcula estatísticas, verifica duplicados e grava `preview_ready`.
- `saft-import-job`: usa o mesmo ficheiro já carregado, cria/associa clientes, produtos, faturas, linhas e pagamentos, e grava `completed`.

### 2. Alterar Edge Functions para “enqueue only”

Manter as Edge Functions públicas para o frontend, mas reduzir a responsabilidade:

- `saft-analyze`: validar JWT, confirmar acesso ao workspace, limpar erro anterior, marcar `analyzing`, disparar job background e responder imediatamente com `{ ok: true, queued: true }`.
- `saft-import`: validar JWT, confirmar acesso, marcar `importing`, guardar opções, disparar job background e responder imediatamente.

### 3. Reutilizar lógica de importação com segurança

Extrair a lógica comum do importador para um módulo partilhado no serviço background ou duplicar minimamente a lógica necessária no job, evitando importar código de Edge Function diretamente.

Manter:

- Deduplicação por `saft_invoice_no`.
- Criação/associação de empresas, produtos, faturas, linhas e pagamentos.
- Recalculo de `amount_paid` e estado das faturas.
- Correção anti-IVA duplicado já existente.

### 4. Melhorar watchdog e progresso

O watchdog atual falha importações com base em `started_at`; para jobs longos, deve usar também `last_step_at`.

Alteração proposta:

- Considerar preso apenas quando `last_step_at` ou `updated_at` não muda há mais de 10 minutos.
- O job deve atualizar `last_step`/`last_step_at` em cada fase e, idealmente, a cada lote de inserções.

### 5. Ajustar UI para fila/background

Atualizar a página SAF-T para não mostrar “concluído” logo após chamar a função.

Alterações:

- `useRunSaftImport` deve mostrar “Importação iniciada” em vez de “Importação concluída”.
- O painel de progresso deve indicar que o processamento corre em background.
- Em falha por recursos/timeout, mostrar ação clara: “Repetir processamento”.

### 6. Recuperar o ficheiro falhado atual

Depois da correção, relançar o registo existente `bd8207ab-de73-426a-92a4-bc523bcbaccf` sem novo upload:

- Limpar `error_message`.
- Voltar a colocar `status = analyzing` ou acionar o botão “Repetir análise”.
- Confirmar que chega a `preview_ready` e depois importar.

## Plano de implementação

1. Criar job background SAF-T no serviço `trigger/`.
2. Migrar análise pesada de `saft-analyze` para o job.
3. Migrar importação pesada de `saft-import` para o job.
4. Manter Edge Functions apenas como camada de autenticação/autorização/enfileiramento.
5. Ajustar watchdog para usar `last_step_at` como referência de progresso.
6. Ajustar textos e estados do frontend para processamento assíncrono.
7. Testar com o registo falhado atual e confirmar transições:

```text
failed → analyzing → preview_ready → importing → completed
```

## Critérios de aceitação

- Um SAF-T anual de ~15 MB deixa de falhar em `parse_xml_start` por limite da Edge Function.
- A chamada do frontend à função responde rapidamente e não bloqueia a interface.
- O histórico mostra progresso real e último passo atualizado.
- O registo falhado pode ser repetido sem novo upload.
- O preview mostra tipo, período, faturas, clientes, produtos e totais.
- A importação cria faturas, linhas e pagamentos sem duplicar documentos já existentes.
- Em erro, o estado fica `failed` com mensagem compreensível e ação de repetição.

## Riscos e pontos por validar

- O parser atual continua a carregar o XML inteiro em memória; no Node background há mais margem, mas SAF-T muito maiores podem exigir parser streaming numa fase seguinte.
- É necessário confirmar que o serviço background tem as variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` configuradas no ambiente de execução.
- Se o ficheiro SAF-T tiver XML inválido, a correção não “repara” o ficheiro; apenas passa a devolver erro controlado e rastreável.
