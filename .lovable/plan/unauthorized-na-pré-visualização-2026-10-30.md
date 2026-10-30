## «Unauthorized» na pré-visualização

### Diagnóstico
- A aplicação está a responder normalmente (página /dashboard devolve 200).
- O texto «Unauthorized» não existe em nenhum ecrã da aplicação: vem da camada de acesso da pré-visualização do Lovable (sessão de pré-visualização expirada), não do FastCRM.
- O site publicado (fastcrm.metodopare.ai) continua a funcionar — os registos de login mostram acessos com sucesso às 14:57.

### Passos (do seu lado, sem alterações de código)
1. Carregar no botão de recarregar da pré-visualização (seta circular junto a «/dashboard»).
2. Se persistir, recarregar a página inteira do Lovable (Ctrl/Cmd+Shift+R).
3. Verificar o aviso vermelho de pagamento no topo: se o método de pagamento falhar, o espaço de trabalho pode perder acesso à pré-visualização. Atualizar em «Atualizar método de pagamento».

### Se continuar depois disto
Diga-me e eu reproduzo com o navegador de testes e investigo mais a fundo.
