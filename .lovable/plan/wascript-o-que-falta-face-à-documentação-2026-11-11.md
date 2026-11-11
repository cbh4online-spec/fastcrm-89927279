# WAScript — o que falta face à documentação

## Diagnóstico
A documentação oficial tem 8 funções. Comparação com o FastCRM:

| Função WAScript | Estado no FastCRM |
|---|---|
| Enviar texto | Ligado |
| Enviar imagem / documento / áudio / vídeo | Ligado (anexo convertido, máx. 15 MB) |
| Listar etiquetas | Usado só para testar a ligação |
| Modificar etiquetas (adicionar/remover por telefone) | Em falta |
| Criar nota no contacto WhatsApp | Em falta |
| Receção de mensagens (webhook) | Ligado, mas **não está documentado** pela WAScript — formato deduzido |

Pontos de risco:
- A receção depende de um formato que a WAScript não publica; é preciso validar com uma mensagem real.
- Não existe na API: estado de entrega/leitura, histórico de conversas, nem consulta do estado da sessão (só o erro 501 quando o WhatsApp Web está fechado).

## O que proponho acrescentar
1. **Etiquetas**: ver as etiquetas WhatsApp na conversa e na ficha do contacto, e aplicar/remover a partir do FastCRM (com registo de quem alterou).
2. **Notas**: botão «Enviar nota para o WhatsApp» que copia uma nota do CRM para o contacto no WhatsApp.
3. **Validação da receção**: guardar as primeiras mensagens recebidas em bruto (só para diagnóstico, visíveis ao dono), para confirmar os campos e ajustar a leitura.
4. **Aviso de sessão desligada**: quando a WAScript responde 501, marcar a ligação como «WhatsApp Web fechado» no cartão e na conversa, com instrução para reabrir.

## Detalhes técnicos
- `_shared/wascript.ts`: `listLabels`, `modifyLabels(phone, actions[{labelId,type:add|remove}])`, `createNote(phone, text)`.
- `wascript-manage`: novas ações `labels.list`, `labels.modify`, `note.create` com JWT + membro do workspace + capability `crm.write`; validação zod; log em activity_logs.
- `wascript-webhook`: amostras brutas limitadas (últimas 20, sem tokens) em tabela com RLS só de leitura para gestores; inserção via service_role.
- Estado `session_down` na ligação, atualizado em erros 501 e limpo no próximo envio com sucesso.
- Testes em `src/test/whatsapp/wascript.test.ts` para o formato das etiquetas e mapeamento do 501.

## Critérios de aceitação
- Aplicar/remover etiqueta reflete-se no WhatsApp Web.
- Nota criada aparece no contacto WhatsApp.
- Mensagem real recebida aparece na Inbox com nome e texto corretos.
- Com o WhatsApp Web fechado, o utilizador vê aviso claro em vez de erro genérico.
