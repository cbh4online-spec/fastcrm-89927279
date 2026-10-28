# Separar faturas Adelcia Maria Monteiro Garcia / Trico Spa Cabo Verde

## Diagnóstico (confirmado na base de dados)
- Em 2026 existem 7 faturas emitidas em nome de «Trico Spa Cabo Verde, Sociedade Unipessoal Lda», mas só 2 estão na ficha da Trico Spa (FT V110.01/144 e /148).
- As outras 5 (FT V102.01/206, /208, /214, /218, /221) estão na ficha da Adelcia, apesar de o nome no documento ser Trico Spa.
- Causa: as duas fichas partilham o mesmo email (adelciagarcia@hotmail.com) e a Trico Spa não tem NIF. Quando a importação não encontra NIF, a associação por email «puxa» as faturas para a ficha da Adelcia.

## O que vou fazer
1. Mover para a ficha da Trico Spa todas as faturas (todos os anos, não só 2026) cujo nome no documento é Trico Spa e que estão na ficha da Adelcia; as cobranças ligadas a essas faturas acompanham.
2. Garantir que as faturas emitidas em nome da Adelcia continuam na ficha dela.
3. Ajustar a regra de associação da importação SAF-T: se o nome do cliente no documento corresponde exatamente a uma ficha, essa ficha ganha sempre ao email partilhado (o email só é usado quando não há NIF nem nome correspondente).
4. Teste para essa regra (duas fichas com o mesmo email, nomes diferentes → cada fatura vai para a ficha do seu nome).
5. Verificar o resultado: Trico Spa com 7 faturas em 2026, Adelcia com 9.

## Pontos por validar
- Se souber o NIF da Trico Spa, posso acrescentá-lo à ficha para tornar a associação ainda mais segura.
- Outros clientes com email partilhado entre pessoa e empresa podem ter o mesmo problema; posso listá-los depois.

## Detalhes técnicos
- Atualização de dados: `invoices.company_id` onde `client_name` normalizado = nome da Trico e `company_id` = Adelcia; idem `collection_cases`/ligações dependentes.
- Alteração em `supabase/functions/_shared/saftCustomerMatch.ts` (ordem NIF → nome exato → email) + teste Deno; republicar `saft-import`.
