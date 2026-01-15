// Need Matching Service - AI-powered next need prediction
import type { 
  NeedMatch, 
  TopCustomer, 
  ProductPurchase 
} from '@/types/growth-insights';

export interface ProductSequence {
  fromProduct: string;
  toProduct: string;
  avgDays: number;
  confidence: number;
  occurrences: number;
}

export class NeedMatchingService {
  private static instance: NeedMatchingService;
  private learnedSequences: ProductSequence[] = [];

  static getInstance(): NeedMatchingService {
    if (!NeedMatchingService.instance) {
      NeedMatchingService.instance = new NeedMatchingService();
    }
    return NeedMatchingService.instance;
  }

  /**
   * Learn product sequences from historical data
   */
  learnFromHistory(
    allCustomerPurchases: Array<{
      customerId: string;
      products: ProductPurchase[];
    }>
  ): void {
    const sequenceCounts = new Map<string, {
      count: number;
      totalDays: number;
      toProduct: string;
    }>();

    for (const customer of allCustomerPurchases) {
      const sortedProducts = [...customer.products].sort(
        (a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
      );

      for (let i = 0; i < sortedProducts.length - 1; i++) {
        const from = sortedProducts[i];
        const to = sortedProducts[i + 1];
        const key = `${from.productName}|${to.productName}`;
        const days = this.daysBetween(
          new Date(from.purchaseDate),
          new Date(to.purchaseDate)
        );

        const existing = sequenceCounts.get(key) || { count: 0, totalDays: 0, toProduct: to.productName };
        sequenceCounts.set(key, {
          count: existing.count + 1,
          totalDays: existing.totalDays + days,
          toProduct: to.productName
        });
      }
    }

    // Convert to learned sequences with confidence
    const totalCustomers = allCustomerPurchases.length;
    this.learnedSequences = Array.from(sequenceCounts.entries())
      .map(([key, data]) => {
        const [fromProduct] = key.split('|');
        return {
          fromProduct,
          toProduct: data.toProduct,
          avgDays: Math.round(data.totalDays / data.count),
          confidence: Math.min(0.95, 0.4 + (data.count / totalCustomers) * 0.5),
          occurrences: data.count
        };
      })
      .filter(seq => seq.occurrences >= 2)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Find matching needs for all customers
   */
  findAllNeedMatches(
    customers: TopCustomer[],
    products: Array<{ id: string; name: string; category?: string }>
  ): NeedMatch[] {
    const matches: NeedMatch[] = [];

    for (const customer of customers) {
      const customerMatches = this.findCustomerNeedMatches(customer, products);
      matches.push(...customerMatches);
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Find need matches for a specific customer
   */
  findCustomerNeedMatches(
    customer: TopCustomer,
    products: Array<{ id: string; name: string; category?: string }>
  ): NeedMatch[] {
    const matches: NeedMatch[] = [];
    const purchasedIds = new Set(customer.products.map(p => p.productId));

    // Check learned sequences
    for (const product of customer.products) {
      const applicableSequences = this.learnedSequences.filter(
        seq => seq.fromProduct.toLowerCase() === product.productName.toLowerCase()
      );

      for (const seq of applicableSequences) {
        const nextProduct = products.find(
          p => p.name.toLowerCase() === seq.toProduct.toLowerCase() && !purchasedIds.has(p.id)
        );

        if (nextProduct) {
          const purchaseDate = new Date(product.purchaseDate);
          const idealStart = new Date(purchaseDate);
          idealStart.setDate(idealStart.getDate() + seq.avgDays - 14);
          const idealEnd = new Date(purchaseDate);
          idealEnd.setDate(idealEnd.getDate() + seq.avgDays + 14);

          matches.push({
            id: `match-${customer.id}-${nextProduct.id}`,
            customerId: customer.id,
            customerName: customer.name,
            currentProduct: product.productName,
            recommendedProduct: nextProduct.name,
            recommendedProductId: nextProduct.id,
            confidence: seq.confidence,
            idealWindow: {
              start: idealStart.toISOString(),
              end: idealEnd.toISOString()
            },
            reasoning: `Clientes que compraram "${product.productName}" tipicamente passam para "${nextProduct.name}" em ~${seq.avgDays} dias.`,
            basedOn: 'purchase_sequence',
            patternDetails: `Baseado em ${seq.occurrences} casos semelhantes.`
          });
        }
      }
    }

    // Check pattern-based sequences (training levels, sessions, etc.)
    const patternMatches = this.findPatternBasedMatches(customer, products, purchasedIds);
    matches.push(...patternMatches);

    // Check time-based needs (periodic products)
    const timeMatches = this.findTimeBasedMatches(customer, products);
    matches.push(...timeMatches);

    return matches;
  }

  private findPatternBasedMatches(
    customer: TopCustomer,
    products: Array<{ id: string; name: string; category?: string }>,
    purchasedIds: Set<string>
  ): NeedMatch[] {
    const matches: NeedMatch[] = [];
    const patterns = [
      { regex: /nível\s*1|level\s*1|básico|iniciante|intro/i, nextPattern: /nível\s*2|level\s*2|intermédio|intermediário/i, avgDays: 90 },
      { regex: /nível\s*2|level\s*2|intermédio|intermediário/i, nextPattern: /nível\s*3|level\s*3|avançado|advanced/i, avgDays: 120 },
      { regex: /sessão\s*1|1ª\s*sessão|primeira\s*sessão/i, nextPattern: /sessão\s*2|2ª\s*sessão|segunda\s*sessão/i, avgDays: 14 },
      { regex: /implementação|onboarding|setup/i, nextPattern: /manutenção|support|suporte/i, avgDays: 60 },
      { regex: /trial|teste|experimental/i, nextPattern: /premium|pro|completo/i, avgDays: 30 },
    ];

    for (const product of customer.products) {
      for (const pattern of patterns) {
        if (pattern.regex.test(product.productName)) {
          const nextProduct = products.find(
            p => pattern.nextPattern.test(p.name) && !purchasedIds.has(p.id)
          );

          if (nextProduct) {
            const purchaseDate = new Date(product.purchaseDate);
            const idealStart = new Date(purchaseDate);
            idealStart.setDate(idealStart.getDate() + pattern.avgDays - 14);
            const idealEnd = new Date(purchaseDate);
            idealEnd.setDate(idealEnd.getDate() + pattern.avgDays + 14);

            matches.push({
              id: `pattern-${customer.id}-${nextProduct.id}`,
              customerId: customer.id,
              customerName: customer.name,
              currentProduct: product.productName,
              recommendedProduct: nextProduct.name,
              recommendedProductId: nextProduct.id,
              confidence: 0.75,
              idealWindow: {
                start: idealStart.toISOString(),
                end: idealEnd.toISOString()
              },
              reasoning: `Sequência natural: após "${product.productName}", o próximo passo lógico é "${nextProduct.name}".`,
              basedOn: 'purchase_sequence',
              patternDetails: 'Baseado em padrões de progressão típicos.'
            });
          }
        }
      }
    }

    return matches;
  }

  private findTimeBasedMatches(
    customer: TopCustomer,
    products: Array<{ id: string; name: string; category?: string }>
  ): NeedMatch[] {
    const matches: NeedMatch[] = [];
    
    // Check for periodic products (annual renewals, checkups, etc.)
    const periodicPatterns = [
      { regex: /anual|yearly|renovação|renewal/i, periodDays: 365 },
      { regex: /semestral|6\s*meses|half-year/i, periodDays: 180 },
      { regex: /trimestral|quarterly|3\s*meses/i, periodDays: 90 },
      { regex: /checkup|revisão|manutenção/i, periodDays: 180 },
    ];

    for (const product of customer.products) {
      const purchaseDate = new Date(product.purchaseDate);
      const daysSincePurchase = this.daysBetween(purchaseDate, new Date());

      for (const pattern of periodicPatterns) {
        if (pattern.regex.test(product.productName)) {
          // Check if renewal window is approaching
          if (daysSincePurchase >= pattern.periodDays - 30 && daysSincePurchase <= pattern.periodDays + 30) {
            const renewalDate = new Date(purchaseDate);
            renewalDate.setDate(renewalDate.getDate() + pattern.periodDays);

            matches.push({
              id: `time-${customer.id}-${product.productId}-renewal`,
              customerId: customer.id,
              customerName: customer.name,
              currentProduct: product.productName,
              recommendedProduct: product.productName,
              recommendedProductId: product.productId,
              confidence: 0.85,
              idealWindow: {
                start: new Date(renewalDate.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                end: new Date(renewalDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
              },
              reasoning: `Período de renovação para "${product.productName}" está próximo.`,
              basedOn: 'time_interval',
              patternDetails: `Ciclo de ${pattern.periodDays} dias.`
            });
          }
        }
      }
    }

    return matches;
  }

  private daysBetween(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

export const needMatchingService = NeedMatchingService.getInstance();
