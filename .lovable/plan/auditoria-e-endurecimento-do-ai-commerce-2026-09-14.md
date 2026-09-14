# Auditoria e endurecimento do AI Commerce

Auditoria feita ao código real (migrações 0017/0018, motor de readiness, feeds, API pública, tracking, hooks e ecrãs). Abaixo o que está confirmado como sólido, o que está confirmado como frágil, e o que vai ser corrigido.

## O que já está correto (verificado)

- Sem lógica fixa de myMIA/FastCRM: a pesquisa global não encontrou nenhuma referência a esses produtos no AI Commerce. Marca, tipo de produto e canal são dados, não código.
- O produto, o preço e o pagamento continuam a ser os do FastCRM: `create-store-checkout` resolve produtos e preços no servidor (`resolveStoreProducts`), valida cupões no servidor e nunca aceita o preço enviado pelo navegador.
- Tabelas novas com chaves estrangeiras, índices por workspace, `updated_at`, RLS e permissões explícitas; leitura pública limitada a produtos publicados com AI Commerce ativo.
- Feeds já seguem cadeia produto → mapeamento por canal → validação → serialização, com adaptadores separados por canal e histórico de execuções.
- Painéis lêem sempre da base de dados; não existem números de exemplo.

## Problemas confirmados que vão ser corrigidos

1. **Registo de eventos falsificável (bloqueador de produção).** Qualquer visitante pode inserir eventos de compra com o valor e o workspace que quiser, porque a regra pública só verifica que o valor não é negativo. Passa a existir um ponto de entrada no servidor que valida a loja, o produto e o tipo de evento; as compras deixam de ser aceites do navegador e passam a ser confirmadas a partir da encomenda real.
2. **Compras podem duplicar receita.** A página de sucesso registra a compra a cada visita/remontagem. Passa a existir chave única por encomenda, com registo idempotente.
3. **Pontuação de preparação fixa no código.** Os 22 critérios e respetivos pesos estão escritos em TypeScript. Passam a viver numa tabela de configuração por workspace, com valores iniciais iguais aos atuais, agrupados por categoria (identificação, comercial, conteúdo, publicação) e editáveis no ecrã.
4. **Variantes ignoradas.** A pontuação, os feeds e os dados estruturados usam só o preço base. Passam a considerar variantes (mensal, anual, taxa de ativação, físico/digital/serviço), com preço mínimo, intervalo de preços e uma entrada por variante nos feeds quando o canal o suporta.
5. **Atribuição incompleta.** Só é guardada a última origem. Passa a guardar primeira e última origem/campanha por sessão e a propagá-las até à encomenda, para a venda poder ser lida pelos dois modelos.
6. **Lista de eventos curta.** Faltam clique no produto, checkout concluído, lead criada e os três eventos de subscrição. A lista é alargada de forma aditiva, sem quebrar os eventos já gravados.
7. **API sem versão nem estados de erro coerentes.** É adicionado o prefixo de versão (mantendo os endereços atuais a funcionar), e os erros internos deixam de responder como sucesso. Também é corrigida a inconsistência entre as duas fontes de definições da loja usadas pela API e pelo site.
8. **Feed válido pode ser substituído por feed com erros.** Passa a haver versão de feed e regra de segurança: um feed com erros críticos não substitui a última versão válida; o problema é comunicado com contagem e motivo ("4 produtos sem preço").
9. **Integrações mostradas como ativas sem estarem.** Cada canal passa a ter estado real: não configurado, configurado, ativo, aviso, erro.
10. **Sem interruptores de funcionalidade.** Cada canal e a geração assistida de conteúdo passam a poder ser ligados/desligados por workspace, sem nova publicação.
11. **Escrita sem filtro de workspace.** As atualizações de produto e feed passam a filtrar explicitamente por workspace, além da proteção da base de dados.
12. **Testes e documentação insuficientes.** Só existem 3 testes. Passa a haver testes de pontuação (produto vazio, parcial, completo, sem pagamento, sem preço, sem disponibilidade), feeds e validação, atribuição, não duplicação de compras e dados estruturados, mais documentação técnica no projeto com exemplos.

## Sequência de trabalho

1. Migração aditiva: tabela de critérios de pontuação, interruptores por workspace, primeira/última origem, chave única de compra, novos tipos de evento, versão de feed, índices adicionais. Sem remoções nem alterações destrutivas.
2. Fechar a segurança do registo de eventos e criar o ponto de entrada validado no servidor.
3. Tornar a pontuação configurável e mostrar total, pontuação por categoria, erros críticos e ações de correção.
4. Suportar variantes e subscrições reutilizando a infraestrutura existente do FastCRM (nada de segunda lógica de subscrição).
5. Endurecer a API pública: versão, estados corretos, paginação, filtros, limites, campos internos nunca expostos.
6. Feeds: versão, proteção do último feed válido, mensagens de erro úteis, registos de diagnóstico.
7. Dados estruturados e endereços canónicos: validação automática dos tipos pedidos, sem avaliações nem preços inventados, um endereço canónico por produto e variantes a apontar para o produto principal.
8. Medição ponta a ponta e painéis com filtros por período, canal, campanha, produto, variante, país e marca.
9. Revisão da experiência: telemóvel e computador, estados de carregamento e vazio, confirmação em ações destrutivas.
10. Testes, verificação de tipos, compilação e teste completo do percurso (criar produto → ativar → API → feed → visita com origem ChatGPT → carrinho → pagamento de teste → atribuição → painel).
11. Documentação e quadro final com estado por área, problemas encontrados e correções feitas, mais a lista separada de bloqueadores, importante, melhorias e dependências externas.

## myMIA e FastCRM

Os dois produtos são validados apenas com a informação já existente no sistema. Nada é inventado: campos em falta ficam marcados como incompletos, com indicação do que falta. Planos comerciais que ainda não existam ficam como estrutura futura, nunca como produtos ativos.

## Notas técnicas

- Migrações aditivas com `IF NOT EXISTS`, valores por omissão coerentes e permissões por tabela; nada é apagado nem renomeado.
- Motores de pontuação, feeds e dados estruturados continuam puros e espelhados no lado servidor, sem dependências da aplicação.
- Atribuição guardada por sessão e copiada para a encomenda no momento do pagamento, para sobreviver à navegação interna.
- Não duplicação garantida por restrição única na base de dados, não apenas por verificação na aplicação.

## O que ficará dependente de terceiros

- Aprovação de permissões e validação de catálogos pela OpenAI, Google e Meta.
- Credenciais e contas externas para publicação real dos feeds.
- Pagamento real em ambiente de produção (os testes usam ambiente de teste).
