# Fechar o acesso a CVs, PDFs de cotação e entregáveis

## O que está mal hoje
Qualquer pessoa com sessão iniciada (de qualquer empresa cliente) consegue abrir:
- **CVs de candidatos** (recursos humanos)
- **PDFs de pedidos de cotação** gerados e **ficheiros de cotação** enviados por fornecedores
- **Entregáveis** dos produtos digitais (ficheiros entregues ao cliente após compra)

## O que muda
- **CVs:** só membros do espaço de trabalho dono da vaga os veem ou apagam. O formulário de candidatura passa a abrir o CV com um link temporário (o link atual deixaria de funcionar).
- **PDFs e ficheiros de cotação:** só membros do espaço de trabalho dono do pedido os veem, enviam ou apagam.
- **Entregáveis:** só membros do espaço de trabalho dono os veem ou gerem. O envio ao cliente após compra continua a funcionar (é feito pelo servidor com link temporário de 7 dias).
- Os 7 PDFs e 3 ficheiros de cotação já existentes continuam acessíveis à equipa certa.

## Consequências a saber
- Entregáveis cujo caminho não comece pelo identificador do espaço de trabalho deixam de aparecer para a equipa (o cliente final continua a recebê-los). Hoje o bucket está vazio, por isso não há impacto atual; o campo de caminho passa a indicar o formato esperado.

## Detalhes técnicos
- Migração em `storage.objects` para `hr-cvs`, `rfq-pdfs`, `rfq-quote-files`, `product-deliverables`: SELECT/INSERT/UPDATE/DELETE com `(storage.foldername(name))[1]::uuid IN (SELECT public.get_user_workspace_ids()) OR public.is_super_admin(auth.uid())`; remover políticas `bucket_id = ...` sem âmbito; service_role intacto.
- `ApplicationForm.tsx`: guardar o caminho e abrir via `createSignedUrl` em vez de `getPublicUrl`.
- `ProductDeliverablesManager.tsx`: dica `workspaceId/...` no campo de caminho.
- Marcar as findings correspondentes como corrigidas; testar leitura com um membro e um não-membro.
