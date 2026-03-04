
Objetivo imediato: eliminar definitivamente o erro `Maximum call stack size exceeded` no fluxo `rfq-quote-ocr-parse` e evitar “blank screen”.

1) Diagnóstico já confirmado
- O erro ocorreu em execuções antigas (11:05 e 11:07 UTC) da função `rfq-quote-ocr-parse`.
- A função atualmente já responde com sucesso (teste direto executado): `200` com `lines_count: 9`.
- O import que estava preso em `processing` foi processado para `status: matched`.
- Conclusão: o erro reportado no ecrã é de execução anterior (estado antigo), não de falha ativa no backend neste momento.

2) Plano de estabilização (para ficar “à prova”)
- Reforçar conversão para base64 sem risco de stack:
  - substituir concatenação de string binária por encoder seguro de bytes (`encodeBase64(Uint8Array)`), evitando `btoa` com payloads grandes.
- Adicionar guardrails de ficheiro:
  - validação de tamanho máximo (ex.: 8–10 MB por documento) com erro amigável.
  - validação de mime/extension antes de OCR.
- Adicionar telemetria por etapa:
  - logs estruturados: `download_started`, `download_done(size)`, `base64_done(length)`, `ai_request_started`, `ai_request_done`.
  - em erro, persistir `status='failed'` + `meta_json.last_error`.

3) Plano de UX para evitar blank screen
- No frontend (`useRFQQuoteImport` + wizard):
  - garantir fallback visual em qualquer erro da função (não depender de estado intermédio do stepper).
  - mostrar toast + banner com mensagem legível e ação “Tentar novamente”.
  - se import ficar `processing` por timeout, oferecer “Retomar processamento”.

4) Validação end-to-end após ajustes
- Teste 1: PDF ~700KB (caso real) → deve completar OCR/parse/match.
- Teste 2: imagem JPG/PNG.
- Teste 3: ficheiro acima do limite → erro controlado (sem crash).
- Teste 4: simular falha AI (429/402) → mensagem correta no UI.
- Critério de aceite: sem `Maximum call stack size exceeded`, sem blank screen, e import sempre termina em `matched` ou `failed` com erro explícito.

5) Detalhes técnicos (curto)
- Origem provável: conversão para base64 com abordagem sensível a tamanho de payload.
- Estado atual do backend: saudável (função responde 200).
- Ação prioritária: hardening + tratamento de erro no frontend para robustez operacional.
