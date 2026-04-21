import { describe, it, expect } from 'vitest';
import {
  convertPriceString,
  parsePriceBreakdown,
  formatPrice,
} from './pricing';

/**
 * Testes da conversão segmentada de preços do pitch.
 *
 * Regras-chave validadas:
 *  - Setup é cobrado uma vez: tier × FX, NUNCA × multiplicador anual.
 *  - Mensal recorrente: tier × FX × (1 mensal | 10 anual) e o sufixo
 *    "/mês" é reescrito para "/ano" quando o intervalo é anual.
 *  - Segmentos já tarifados em "/ano" mantêm o sufixo e não são
 *    multiplicados de novo.
 *  - Segmentos variáveis sem € (ex.: "+ 0,9% por venda") são preservados.
 */
describe('parsePriceBreakdown', () => {
  it('classifica corretamente "€499 setup + €19/mês"', () => {
    const bd = parsePriceBreakdown('€499 setup + €19/mês');
    expect(bd.setupEur).toBe(499);
    expect(bd.monthlyEur).toBe(19);
    expect(bd.annualEur).toBe(0);
    expect(bd.hasSetup).toBe(true);
    expect(bd.hasAmount).toBe(true);
  });

  it('classifica corretamente "€290 /ano + €99 setup"', () => {
    const bd = parsePriceBreakdown('€290 /ano + €99 setup');
    expect(bd.annualEur).toBe(290);
    expect(bd.setupEur).toBe(99);
    expect(bd.monthlyEur).toBe(0);
  });

  it('trata "€NN" sem sufixo como mensal', () => {
    const bd = parsePriceBreakdown('€29');
    expect(bd.monthlyEur).toBe(29);
    expect(bd.setupEur).toBe(0);
    expect(bd.annualEur).toBe(0);
  });

  it('preserva segmentos variáveis sem € (ex.: percentagem)', () => {
    const bd = parsePriceBreakdown('€19/mês + 0,9% por venda');
    expect(bd.monthlyEur).toBe(19);
    expect(bd.segments).toHaveLength(2);
    expect(bd.segments[1].amountEur).toBe(0);
    expect(bd.segments[1].kind).toBe('variable');
  });

  it('devolve breakdown vazio para input indefinido', () => {
    const bd = parsePriceBreakdown(undefined);
    expect(bd.hasAmount).toBe(false);
    expect(bd.segments).toHaveLength(0);
  });
});

describe('convertPriceString — setup nunca multiplica no intervalo anual', () => {
  it('"€499 setup + €19/mês" mensal · EUR · grow → mantém valores', () => {
    const out = convertPriceString('€499 setup + €19/mês', 'EUR', 'monthly', 'grow');
    expect(out).toContain('€499'); // setup intacto
    expect(out).toContain('€19');
    expect(out).toContain('/mês');
  });

  it('"€499 setup + €19/mês" anual · EUR · grow → setup intacto, mensal ×10', () => {
    const out = convertPriceString('€499 setup + €19/mês', 'EUR', 'annual', 'grow')!;
    // Setup permanece €499 (cobrado uma vez, sem multiplicador anual)
    expect(out).toContain('€499');
    expect(out).toContain('setup');
    // Mensal: 19 × 10 = 190
    expect(out).toContain('€190');
    // Sufixo /mês reescrito para /ano
    expect(out).toContain('/ano');
    expect(out).not.toMatch(/€19\b/); // o 19 original já não pode aparecer "solto"
  });

  it('"€499 setup + €19/mês" anual · EUR · pro (×1.6) → setup ×1.6, mensal ×1.6×10', () => {
    const out = convertPriceString('€499 setup + €19/mês', 'EUR', 'annual', 'pro')!;
    // Setup: 499 × 1.6 = 798.4 → arredonda para 798
    expect(out).toMatch(/€798/);
    // Mensal: 19 × 1.6 × 10 = 304
    expect(out).toMatch(/€304/);
  });

  it('"€290 /ano + €99 setup" anual · EUR · grow → não duplica o anual nem multiplica setup', () => {
    const out = convertPriceString('€290 /ano + €99 setup', 'EUR', 'annual', 'grow')!;
    // Anual já tarifado: 290 mantém-se (não vira 2900)
    expect(out).toContain('€290');
    expect(out).toContain('/ano');
    // Setup intacto
    expect(out).toContain('€99');
    expect(out).toContain('setup');
    // Garantia explícita: o anual NÃO foi multiplicado por 10
    expect(out).not.toMatch(/€2[\s.,]?900/);
    // Garantia explícita: o setup NÃO foi multiplicado por 10
    expect(out).not.toMatch(/€990\b/);
  });

  it('"€290 /ano + €99 setup" mensal · EUR · grow → mantém /ano (escolha explícita do catálogo)', () => {
    const out = convertPriceString('€290 /ano + €99 setup', 'EUR', 'monthly', 'grow')!;
    expect(out).toContain('€290');
    expect(out).toContain('/ano'); // não converte para /mês
    expect(out).toContain('€99');
  });

  it('aplica FX ao setup mas não multiplica por intervalo (USD anual)', () => {
    const out = convertPriceString('€499 setup + €19/mês', 'USD', 'annual', 'grow')!;
    // Setup: 499 × 1 × 1.08 ≈ 539 (sem ×10)
    expect(out).toMatch(/\$539/);
    // Mensal: 19 × 1.08 × 10 ≈ 205
    expect(out).toMatch(/\$205/);
    // Não pode ter o setup × 10 (5390+)
    expect(out).not.toMatch(/\$5[\s.,]?[34]\d{2}/);
  });

  it('preserva variável "+ 0,9% por venda" intocada em conversão anual', () => {
    const out = convertPriceString('€19/mês + 0,9% por venda', 'EUR', 'annual', 'grow')!;
    expect(out).toContain('€190');
    expect(out).toContain('/ano');
    expect(out).toContain('0,9%');
    expect(out).toContain('por venda');
  });

  it('devolve input inalterado quando não tem qualquer €', () => {
    expect(convertPriceString('Sob consulta', 'EUR', 'annual', 'grow')).toBe('Sob consulta');
  });

  it('devolve undefined quando input é undefined', () => {
    expect(convertPriceString(undefined, 'EUR', 'monthly', 'grow')).toBeUndefined();
  });
});

describe('formatPrice (sanity checks usadas pelos asserts acima)', () => {
  it('formata EUR com símbolo antes', () => {
    expect(formatPrice(190, 'EUR')).toBe('€190');
  });
  it('formata USD com símbolo antes', () => {
    expect(formatPrice(539, 'USD')).toBe('$539');
  });
});
