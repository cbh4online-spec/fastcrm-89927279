# Corrigir aplicação de blueprints com campos já existentes

## Diagnóstico

- Os campos **Empresa**, **Cargo** e **Website** já existem para a entidade `lead` no workspace **myMYA Hub**.
- A base de dados protege corretamente a unicidade por workspace, entidade e nome através de `custom_fields_workspace_id_entity_type_name_key`.
- O fluxo atual deteta duplicados a partir dos dados carregados no cliente, mas quando essa lista está desatualizada ou a decisão fica implícita, assume `create` e tenta inserir o campo novamente.
- O conflito de unicidade é depois apresentado como erro técnico, apesar de o estado final pretendido já existir.

## Decisões de produto/UX

- Reaplicar o mesmo blueprint deve ser uma operação **idempotente**: campos exatos já existentes contam como ignorados/reutilizados, não como erros.
- Conflitos reais continuam visíveis; apenas a violação de unicidade correspondente ao mesmo campo é convertida num resultado normal de duplicado.
- O resumo final deve distinguir claramente **criados**, **fundidos/reutilizados**, **ignorados** e **erros reais**, sem expor mensagens SQL ao utilizador.

## Estrutura técnica

- Reforçar `useBlueprintApply` com uma verificação fresca dos campos do workspace imediatamente antes da aplicação.
- Normalizar a comparação de nomes e usar a chave efetiva `(workspace_id, entity_type, name)` para decidir entre criar, reutilizar ou ignorar.
- Tratar defensivamente o código de conflito de unicidade no momento da inserção para cobrir concorrência entre pedidos.
- Invalidar/refazer a query de campos após a operação e manter o log de auditoria coerente com o resultado real.
- Ajustar o diálogo de resultado para apresentar avisos funcionais em português, sem detalhes internos da base de dados.

## Plano de implementação

1. Extrair uma resolução determinística dos campos existentes por entidade e nome normalizado.
2. Atualizar a aplicação de campos para:
   - respeitar decisões explícitas de `merge` e `skip`;
   - reutilizar/ignorar automaticamente duplicados exatos descobertos na verificação fresca;
   - converter apenas o conflito de unicidade esperado em duplicado ignorado;
   - manter outros erros como falhas reais.
3. Atualizar contadores, auditoria e feedback visual para refletirem o que foi criado e o que já existia.
4. Adicionar testes de regressão para primeira aplicação, reaplicação integral e conflito concorrente.
5. Validar no browser o fluxo “Aplicar Tudo” no myMYA Hub e confirmar ausência de erros de consola.

## Critérios de aceitação

- Reaplicar o blueprint não tenta recriar Empresa, Cargo ou Website.
- O diálogo deixa de mostrar `duplicate key value violates unique constraint`.
- Os três campos aparecem como reutilizados/ignorados, enquanto os restantes campos, etapas e automações continuam a ser criados normalmente.
- Uma segunda aplicação consecutiva produz o mesmo estado sem novos duplicados.
- O log de aplicação não classifica duplicados esperados como erro técnico.
- Erros de permissões, validação ou rede continuam a ser reportados.

## Riscos e pontos por validar

- Comparações semelhantes, mas não exatas, continuam dependentes da decisão do utilizador para evitar fusões indevidas.
- Não será removida nem enfraquecida a constraint de unicidade da base de dados.
- A validação final deve confirmar que os contadores e a opção de reverter não incluem campos que já existiam antes da aplicação.
