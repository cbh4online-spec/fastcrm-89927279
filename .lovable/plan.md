# Preencher os valores das especificações do produto

## Alternativas que já existem no ecrã
1. **Sugerir IA** — a IA propõe valores a partir do nome, SKU e marca (ex.: Ajax NVR 16 canais). Tem de rever antes de Guardar.
2. **Extrair de Texto** — cola a ficha técnica do fabricante (texto ou PDF copiado) e os valores são distribuídos pelos campos (Largura de banda, Interface de rede, Temperatura, etc.).
3. **Manual** — escrever em cada campo "Valor".

Recomendação para equipamento Ajax: copiar a tabela "Especificações" do site ajax.systems e usar **Extrair de Texto**; é o mais fiável, porque vem da fonte oficial.

## Melhoria proposta (opcional)
- Botão **"Preencher a partir do site do fabricante"**: pesquisa a página oficial pelo SKU (AJ-NVR116-W), extrai a tabela técnica e preenche só os campos vazios, marcando-os como "sugestão" para aprovação manual (nunca grava sozinho).
- Indicar a origem de cada valor (manual / IA / fabricante).

## Detalhes técnicos
- Reutilizar a extração de páginas já usada no AI Commerce e o fluxo existente de "Extrair de Texto".
- Preenche apenas campos vazios; aprovação manual obrigatória antes de Guardar.
- Teste: correspondência de nomes de especificações (ex.: "Operating temperature" → "Temperatura de funcionamento").
