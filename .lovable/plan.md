# Concluir os dois problemas de segurança do Project monitoring

## Diagnóstico
- **FastMatch — confirmado:** o cliente calcula a reputação apenas sobre avaliações visíveis e tenta gravar esse valor. A escrita de um perfil de outra pessoa normalmente é bloqueada, mas o erro é ignorado; o cálculo continua incorreto e um utilizador privilegiado pode gravá-lo. Atualmente existem zero avaliações, pelo que não foi demonstrada corrupção histórica.
- **Mapa de Eventos — confirmado:** a política de leitura permite apenas super administradores, mas a página não tem essa restrição. O catálogo tem zero registos mesmo com acesso privilegiado; alargar a leitura, sozinho, não preenche a página.

## Já corrigido nesta revisão
- Vendedor: atualizar a lista `companies` usada na ficha após atribuição.
- Prospeção: usar origem aceite pela importação segura; confirmar envio antes de importar, mantendo verificação de duplicados. A conversão termina a prospeção, pelo que não agenda acompanhamentos que seriam imediatamente cancelados. Se a importação falhar, o envio fica registado e o aviso mantém-se.
- Loja: aceitar o checkout inicial **pago** de subscrição, mantendo assinatura, montante, moeda, isolamento e processamento único. O segredo específico já está configurado na única configuração Stripe existente; não foi criado fallback inseguro.
- Meta: preço igual ao catálogo público, sem multiplicar novamente por IVA. Catálogo ativo Ajax confirmado: `FIBRA-KIT1-PRO-4G-W`, **828,52 EUR**, HTTP 200.

## Decisões de produto e segurança
1. A reputação deve resultar de todas as avaliações válidas, sem expor avaliações privadas nem permitir alterações manuais ao agregado.
2. Administradores autorizados devem consultar o catálogo de eventos; os eventos operacionais continuam isolados por espaço de trabalho.
3. Não inventar eventos para preencher o catálogo: identificar os registos oficiais já definidos no sistema antes de os disponibilizar.

## Implementação proposta
### FastMatch
- Substituir a agregação no cliente por recálculo transacional na base de dados após alterações de avaliações.
- Serializar o cálculo por perfil para evitar resultados parciais em submissões simultâneas.
- Proteger `reputation_score` e `reputation_count` contra escritas diretas, mantendo a edição legítima dos restantes campos do perfil.
- Preservar as políticas de leitura de avaliações; verificar pertença à ligação, autoria, destino e espaço de trabalho na submissão.
- Remover o recálculo local e atualizar as consultas de perfis após sucesso.

### Mapa de Eventos
- Rever as colunas do catálogo antes de permitir leitura; excluir informação interna sensível se existir.
- Conceder acesso apenas a funções administrativas autorizadas através dos mecanismos partilhados de permissões, sem `USING(true)`.
- Manter os eventos reais limitados ao espaço de trabalho atual.
- Disponibilizar apenas o catálogo oficial existente, com estado vazio/erro explícito caso não haja entradas; não criar dados demonstrativos.

## Estrutura técnica
- Mudança aditiva com funções e triggers em `public`, `search_path = public` e permissões mínimas; não editar migrações anteriores.
- Alterações focadas em `useFastMatchReviews`, políticas de reputação, `useEventRegistry` e autorização da página Mapa de Eventos.
- Registar os mecanismos autoritativos em `AGENTS.md` e acrescentar testes junto dos existentes.

## Critérios de aceitação
- Dez avaliações de 5 estrelas mais uma de 2 produzem **4,7 / 11**, mesmo quando o avaliador só consegue ler uma avaliação.
- Escrita direta do agregado é recusada; submissões simultâneas não perdem avaliações.
- Administrador autorizado lê o catálogo; conta sem autorização não lê dados internos.
- Eventos de outros espaços de trabalho continuam invisíveis.
- Validar os fluxos com contas de diferentes funções, erros, estados vazios e sem novos erros de execução.

## Verificação e limitações desta revisão
- 27 testes Vitest distintos aprovados e 13 testes de comportamento do webhook aprovados. Os mocks Deno existentes têm erros de tipagem; os testes de execução foram feitos com `--no-check`, não equivalendo a validação de tipos desses mocks.
- Última compilação automática: OK. Mapa de Eventos aberto com sessão real, sem erros de execução, catálogo vazio.
- As duas funções da loja foram atualizadas e o feed ativo foi verificado. Não se cobrou um cartão, não se criou uma avaliação/lead real nem se alterou o vendedor de uma empresa real; a publicação do frontend não foi solicitada.
- Os dois findings de segurança permanecem abertos até implementação e verificação deste plano.