# Corrigir envio de WhatsApp a sair pela WAScript

## Diagnóstico (confirmado na base de dados)
Na organização Central Business Hub, o número ativo para envio é a linha que era o **WhatsApp Business Oficial (+351 925 990 747)**, mas foi convertida para WAScript quando a WAScript foi escolhida como número principal (fica registado «previous_provider: meta_cloud_api»). A ligação Z-API desta organização está **inativa**. Por isso todos os envios vão para a WAScript, que responde «WhatsApp Web fechado».

Ter reativado a Z-API no painel da Z-API não alterou o número principal no FastCRM.

## O que vou fazer
1. **Repor os dados**: devolver a linha oficial ao tipo Meta (sem a apagar) e ativar a Z-API como número principal desta organização; a WAScript fica desligada como principal (o token mantém-se guardado).
2. **Corrigir a causa**: escolher um fornecedor como principal passa a ativar/criar a linha desse fornecedor e desativar as outras, em vez de reescrever o tipo de uma linha existente. A linha oficial Meta nunca é convertida.
3. **Mensagem de erro clara**: quando o envio falha, o aviso indica qual o serviço usado (ex.: «Enviado via WAScript») e um atalho para mudar o número principal.
4. **Teste** da regra «escolher principal não altera o tipo de outras linhas».

## Verificação
- Enviar uma mensagem de teste a partir da ficha de contacto e confirmar que sai pela Z-API.
- Confirmar que a linha oficial continua presente.

## Ponto por validar
- Assumo que quer a **Z-API como principal**. Se preferir a linha oficial Meta, diga-me.

