# Plano: SAF-T preso nos 95% durante reanálise

## Diagnóstico confirmado

- O import SAF-T actual `0525946b-2ed6-47c1-9704-34bfd9ac7322` está em `status = analyzing`.
- A última actualização real ficou em `parse_xml_progress` às 22:47:16, com `334` clientes e `665` artigos lidos.
- A análise não chegou a `parse_xml_done`, `dedupe_check` nem `preview_ready`.
- Os logs da função `saft-analyze` param em `parse_xml_start`; não há erro explícito registado.
- O registo mantém `completed_at` antigo de uma importação anterior, o que pode deixar o estado visual e operacional incoerente durante reimportações.
- O ficheiro está identificado como `self_billing`, e o parser streaming actual só trata `Invoice` e `Payment` como documentos principais; é necessário rever o tratamento de `WorkingDocuments / WorkDocument` para este tipo de SAF-T.

## Decisões de produto/UX

- A reanálise nunca deve ficar indefinidamente nos 95%.
- Se o worker morrer sem devolver erro, o sistema deve marcar a análise como falhada com mensagem accionável.
- Se o ficheiro já tinha sido importado, a reanálise deve limpar campos antigos de conclusão e mostrar estado limpo.
- Para SAF-T de autofacturação/self-billing, a pré-visualização deve contabilizar os documentos relevantes em vez de ficar sem faturas.
- O utilizador deve conseguir tentar novamente sem ficar bloqueado pelo duplicado.

## Estrutura técnica

1. **Parser SAF-T streaming**
   - Adicionar suporte a `WorkDocument` no parser incremental.
   - Mapear `WorkDocument` para a mesma estrutura interna usada por faturas, com tipo de documento, estado, data, cliente, totais e linhas.
   - Manter suporte a `Invoice` e `Payment` sem regressões.

2. **Função `saft-analyze`**
   - Limpar `completed_at` ao iniciar nova análise.
   - Guardar progresso final mesmo quando há zero faturas normais mas existem documentos de trabalho/self-billing.
   - Adicionar timeout/fail-safe interno por fase para evitar estado eterno `analyzing`.
   - Melhorar logs em `parse_xml_done`, `dedupe_check` e falhas não capturadas.

3. **Função `saft-import`**
   - Usar o mesmo parser corrigido para importar SAF-T self-billing.
   - Limpar `completed_at` ao iniciar nova importação.
   - Actualizar `last_step` com fases mais claras: download, parse, persistência, resumo.

4. **Base de dados / watchdog**
   - Garantir que o watchdog marca como falhadas análises/importações sem progresso.
   - Se necessário, disponibilizar uma forma segura de acionar o watchdog ou aplicar fallback na leitura UI quando `last_step_at` está demasiado antigo.

5. **UI da importação SAF-T**
   - Detectar análise sem progresso recente e mostrar estado de erro/recuperação em vez de barra presa.
   - Adicionar acção “Tentar novamente” quando o estado está preso ou falhado.
   - Evitar usar `completed_at` antigo para um processo actualmente em análise.

## Plano de implementação

1. Corrigir o parser streaming para reconhecer `WorkDocument` e validar a contagem em ficheiros `self_billing`.
2. Ajustar `saft-analyze` para limpar estado antigo, concluir a pré-visualização correctamente e falhar de forma explícita se a análise parar.
3. Ajustar `saft-import` para usar a mesma lógica e não herdar metadados antigos em reimportações.
4. Corrigir a UI para transformar processos sem progresso em estado recuperável.
5. Aplicar uma pequena correção de dados ao import actual, se necessário, para sair do estado preso depois do código estar corrigido.
6. Validar com o ficheiro de Junho 2026: reanálise deve passar de “A analisar” para “Pré-visualização” ou “Falhou” com erro claro, nunca ficar nos 95%.

## Critérios de aceitação

- Recarregar o SAF-T já importado não fica preso nos 95%.
- O estado muda para `preview_ready` quando a análise termina.
- SAF-T `self_billing` contabiliza os documentos relevantes na pré-visualização.
- `completed_at` antigo não aparece associado a uma análise em curso.
- Se o worker parar, o utilizador vê erro claro e pode tentar novamente.
- A importação com “Importar pagamentos” activo continua a deduplicar faturas existentes e importa apenas o que falta.

## Riscos e pontos por validar

- Confirmar no ficheiro real se os documentos de Junho estão em `WorkingDocuments / WorkDocument` e não em `SalesInvoices / Invoice`.
- Confirmar se os recibos/pagamentos vêm numa secção `Payments` separada ou se estão apenas referenciados nos documentos de trabalho.
- Validar se o watchdog está a ser chamado automaticamente; se não estiver, a UI precisa do fallback de “sem progresso”.
