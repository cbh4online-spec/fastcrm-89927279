# A conversa do WhatsApp não aparece na ficha do contacto

## Diagnóstico (confirmado)
- No myMYA Hub, nos últimos 3 dias, não há nenhuma conversa de WhatsApp gravada. As únicas existentes são de email, SMS e Instagram.
- O serviço da extensão não registou nenhum pedido de «Guardar conversa». Arrancou e parou sem trabalho.
- Ou seja, o botão nunca chegou ao FastCRM: ou não foi carregado, ou falhou ainda na extensão (por exemplo, botão cinzento porque falta escolher o espaço de trabalho, ou a conversa não foi lida).
- A captura mostra a extensão aberta na página do CRM, onde não pode ler conversas. Só funciona com o WhatsApp Web aberto.

## O que vou fazer
1. **Extensão (v0.6.1)**
   - Quando o botão estiver cinzento, mostrar o motivo: «Abra uma conversa no WhatsApp Web», «Escolha o espaço de trabalho» ou «Pesquise o número primeiro».
   - Depois de guardar, mostrar o resultado: «X mensagens guardadas» ou o erro concreto (não autorizado, número sem contacto, nenhuma mensagem lida).
   - Juntar um link «Ver no CRM» que abre a ficha do contacto.
2. **Servidor**
   - Registar cada tentativa (pedido recebido, contacto encontrado, quantas mensagens gravadas, motivo de recusa), sem guardar o texto das mensagens.
3. **Ficha do contacto**
   - Confirmar que «Mensagens Trocadas» mostra as conversas de WhatsApp ligadas ao contacto, à lead associada ou ao mesmo número. Se não mostrar, corrigir.
4. **Teste**
   - Guardar uma conversa de teste do Fernando (+351914025972) e confirmar que aparece na ficha.

## Detalhes técnicos
- `sidepanel.js`/`content.js`: razões de desativação do `btn-sync-chat`, feedback com `inserted/skipped`, deep link `/dashboard/crm/contacts/:id`.
- `fastcrm-whatsapp-extension-api`: `console.log` estruturado por ação `sync_messages` (workspace, resultado, contagens).
- `EntityMessageHistory.tsx`: validar filtro por `contact_id` OR `lead_id` OR `external_thread_id` em variantes do telefone.
- Novo ZIP v0.6.1; testes da extensão a correr.

## A validar consigo
- Teste feito com o WhatsApp Web aberto na conversa do Fernando.
