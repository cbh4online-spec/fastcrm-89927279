# Resumo financeiro no cabeçalho — porque ainda não aparece

## Diagnóstico

O código já está no projeto:

- `FinancialKPIStrip` tem uma variante `header` (faixa compacta com skeletons).
- `CompanyDetailWithSidebar.tsx` (linha 670) e `ENIContactDetailWithSidebar.tsx` (linha 650) já renderizam essa faixa no cabeçalho, e os quatro cartões já foram retirados do separador **Financeiro**.

Contudo, uma verificação feita no teu navegador confirma que a página aberta **não contém** o elemento da faixa (`aria-label="Resumo financeiro"`). Ou seja: o browser continua a executar o bundle anterior — coincide com o aviso "Preview is behind the latest changes" visível na captura. Não é um bug de lógica; é a antevisão que não recarregou o módulo.

## O que vou fazer

1. Forçar a atualização do bundle: reiniciar o servidor de desenvolvimento para invalidar a cache de módulos do Vite e obrigar a antevisão a servir o código atual.
2. Voltar a inspecionar a ficha da empresa no navegador e confirmar, por verificação direta ao DOM, que a faixa existe no cabeçalho e que os cartões já não aparecem no separador Financeiro.
3. Se, depois disso, a faixa continuar ausente, o problema passa a ser de renderização e investigo então:
   - se a rota `/dashboard/companies/:id` está mesmo a montar `CompanyDetailWithSidebar` (e não outra variante, ex.: `ObjectDetailPage`);
   - se algum guard/erro de render corta o bloco do cabeçalho antes da faixa.

## Critérios de aceitação

- No cabeçalho da ficha de Empresa e de Contacto, por baixo do nome e da barra de ações, aparece a faixa com Total Faturado, Pago, Pendente e Vencido.
- Os valores coincidem com os do separador Financeiro (Pago 47,56 €, Pendente 24,40 € no caso da Angovending).
- O separador **Financeiro** já não repete os quatro cartões.
- Em ecrã estreito a faixa faz scroll horizontal sem quebrar o cabeçalho.

## Nota técnica

Nenhuma alteração de dados ou de base de dados é necessária: a correção de RLS de `invoice_payments` e o cruzamento com `amount_paid` já estão aplicados e os valores corretos já são visíveis na captura.
