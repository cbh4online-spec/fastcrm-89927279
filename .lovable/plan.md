# Concluir a ligação da extensão FastCRM WhatsApp Pro

## Diagnóstico confirmado pela captura
- O Chrome continua a usar a **0.5.0**, carregada de «Descargas/fastcrm-whatsapp-pro-v0.5.0», e deu-lhe o código **kindoboiedomafmjmagdeidghcpiajnh**. Esse código não está registado no FastCRM, por isso a autorização falha e o painel mostra «Desligado».
- A **0.5.1** resolve isto: tem um código fixo (**kdocdkdaklgfehfcggnacaaffiidipma**) que já está registado no FastCRM e não muda com a pasta nem com o computador.
- O servidor da extensão está neste momento em «desativado» (testado agora). Isto confirma que pelo menos um dos dois valores guardados no formulário anterior ficou num formato que o servidor não aceita.

## Passos
1. Voltar a abrir o formulário dos dois valores, com o formato validado:
   - Identificação do cliente: `e3797d42-b91a-4872-8a42-fca687486725`
   - Origem permitida: `chrome-extension://kdocdkdaklgfehfcggnacaaffiidipma`
2. Voltar a publicar a função da extensão e confirmar que responde com sucesso (204) para a nova origem e recusa outras origens.
3. Mostrar no painel, em Configurações, o código esperado e um aviso «Instalação antiga — instale a 0.5.1» quando o código instalado for diferente.
4. Entregar de novo o ZIP 0.5.1.

## O que precisa de fazer
- Em chrome://extensions: **Remover extensão** (a 0.5.0), descompactar o ZIP 0.5.1, «Carregar expandida» com essa pasta e confirmar que o ID mostrado é `kdocdkdaklgfehfcggnacaaffiidipma`.
- No painel, carregar em «Ligar ao FastCRM» e autorizar.

## Critérios de aceitação
- O servidor responde 204 para a nova origem.
- O painel mostra «Ligado ao FastCRM» depois de autorizar.
