

## Plano: Adicionar EU VIES como 3ª fonte de dados no lookup de NIF

### Situação atual
A edge function `lookup-company-nif` já tem 2 estratégias:
1. **nif.pt API** (primária) — dados completos mas com rate-limit
2. **Firecrawl + Racius** (fallback) — scraping quando nif.pt falha

### O que muda
Adicionar o **VIES (EU VAT Information Exchange System)** como 3ª estratégia. O VIES valida NIFs europeus e retorna nome da empresa + morada oficial. Será usado como fonte complementar para preencher campos que as outras fontes não conseguiram.

### Implementação

**1. Nova função `tryVIES()` na edge function `lookup-company-nif/index.ts`**
- Chamar o endpoint SOAP do VIES: `https://ec.europa.eu/taxation_customs/vies/services/checkVatService`
- Enviar request XML com `countryCode: PT` e `vatNumber: <9 dígitos>`
- Parsear a resposta XML para extrair `name` e `address`
- Retornar dados parciais (nome, morada, status de validação)
- Sem API key necessária — serviço público e gratuito

**2. Alterar a estratégia de lookup (mesma edge function)**
- Manter a ordem: nif.pt → Racius → (novo) VIES
- Após obter resultado de qualquer fonte, tentar VIES em paralelo para **complementar campos em falta** (merge)
- Se nif.pt e Racius falharem, usar VIES como último recurso (dados básicos: nome + morada)
- Lógica de merge: campos `null` no resultado principal são preenchidos pelo VIES

**3. Dados obtidos do VIES**
- `company_name` (nome oficial registado na AT)
- `address` (morada fiscal completa)
- `valid` (boolean — confirma se o NIF é válido na UE)
- Estes dados são autoritativos (fonte oficial da UE)

### Ficheiro a alterar
- `supabase/functions/lookup-company-nif/index.ts` — adicionar `tryVIES()` + lógica de merge

### Resultado esperado
- NIFs que falham nas 2 fontes actuais passam a ter dados básicos via VIES
- Resultados de nif.pt/Racius ficam enriquecidos com a confirmação oficial de validade UE
- Sem custos adicionais (API gratuita)

