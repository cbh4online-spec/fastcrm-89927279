// Customer Ranking Service - Single Source of Truth for Top Customers
import type { 
  TopCustomer, 
  RankingCriteria, 
  ChurnRisk,
  ProductPurchase,
  NextOpportunity,
  CustomerInsight,
  RankingConfig 
} from '@/types/growth-insights';

export class CustomerRankingService {
  private static instance: CustomerRankingService;

  static getInstance(): CustomerRankingService {
    if (!CustomerRankingService.instance) {
      CustomerRankingService.instance = new CustomerRankingService();
    }
    return CustomerRankingService.instance;
  }

  /**
   * Calculate Top Customers based on configurable criteria
   */
  calculateTopCustomers(
    customers: Array<{
      id: string;
      name: string;
      email?: string;
      company?: string;
      createdAt: string;
    }>,
    opportunities: Array<{
      id: string;
      contactId?: string;
      companyId?: string;
      value: number;
      status: string;
      closedAt?: string;
      products?: string[];
    }>,
    config: RankingConfig = {
      criteria: ['total_revenue', 'purchase_frequency', 'ltv'],
      weights: {
        total_revenue: 0.4,
        recurring_revenue: 0.2,
        purchase_frequency: 0.2,
        margin: 0.1,
        ltv: 0.1,
        conversion_rate: 0,
        close_velocity: 0
      },
      period: 'year',
      limit: 10
    }
  ): TopCustomer[] {
    const periodStart = this.getPeriodStart(config.period);
    
    // Aggregate data per customer
    const customerData = customers.map(customer => {
      const customerOpps = opportunities.filter(
        opp => (opp.contactId === customer.id || opp.companyId === customer.id) && 
               opp.status === 'closed_won' &&
               (!periodStart || new Date(opp.closedAt || '') >= periodStart)
      );

      const totalRevenue = customerOpps.reduce((sum, opp) => sum + (opp.value || 0), 0);
      const purchaseCount = customerOpps.length;
      const lastPurchase = customerOpps.sort(
        (a, b) => new Date(b.closedAt || '').getTime() - new Date(a.closedAt || '').getTime()
      )[0];

      // Calculate LTV based on historical data
      const daysSinceFirst = this.daysBetween(new Date(customer.createdAt), new Date());
      const monthlyRate = daysSinceFirst > 30 ? totalRevenue / (daysSinceFirst / 30) : totalRevenue;
      const ltv = monthlyRate * 24; // 24 months projected

      // Calculate churn risk
      const daysSinceLastPurchase = lastPurchase 
        ? this.daysBetween(new Date(lastPurchase.closedAt || ''), new Date())
        : 999;
      const churnRisk = this.calculateChurnRisk(daysSinceLastPurchase, purchaseCount);

      // Calculate score based on weighted criteria
      const score = this.calculateCustomerScore(
        {
          total_revenue: totalRevenue,
          recurring_revenue: 0, // Would need subscription data
          purchase_frequency: purchaseCount,
          margin: totalRevenue * 0.3, // Estimate
          ltv,
          conversion_rate: 0,
          close_velocity: 0
        },
        config.weights
      );

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        company: customer.company,
        totalRevenue,
        recurringRevenue: 0,
        purchaseCount,
        lastPurchaseDate: lastPurchase?.closedAt,
        products: this.extractProducts(customerOpps),
        ltv,
        churnRisk,
        score,
        insights: []
      };
    });

    // Sort by score and limit
    return customerData
      .sort((a, b) => b.score - a.score)
      .slice(0, config.limit)
      .map(({ score, ...customer }) => customer);
  }

  /**
   * Generate insights for a specific customer
   */
  generateCustomerInsights(
    customer: TopCustomer,
    allProducts: Array<{ id: string; name: string; category?: string }>,
    similarCustomers: TopCustomer[]
  ): CustomerInsight[] {
    const insights: CustomerInsight[] = [];

    // Pattern: Regular purchase behavior
    if (customer.purchaseCount >= 3) {
      insights.push({
        id: `pattern-${customer.id}-regular`,
        type: 'pattern',
        message: `Este cliente compra regularmente (${customer.purchaseCount} compras).`,
        confidence: 0.85,
        actionable: false
      });
    }

    // Opportunity: Next product suggestion
    const nextProduct = this.predictNextProduct(customer.products, allProducts);
    if (nextProduct) {
      insights.push({
        id: `opportunity-${customer.id}-next`,
        type: 'opportunity',
        message: `Alta probabilidade de interesse em "${nextProduct.name}".`,
        confidence: nextProduct.confidence,
        actionable: true,
        suggestedAction: `Contactar sobre ${nextProduct.name}`
      });
    }

    // Risk: Churn warning
    if (customer.churnRisk === 'high' || customer.churnRisk === 'critical') {
      insights.push({
        id: `risk-${customer.id}-churn`,
        type: 'risk',
        message: 'Cliente sem interação recente. Risco de perda.',
        confidence: 0.75,
        actionable: true,
        suggestedAction: 'Agendar contacto de reativação'
      });
    }

    // Lifecycle: Based on time since last purchase
    if (customer.lastPurchaseDate) {
      const daysSince = this.daysBetween(new Date(customer.lastPurchaseDate), new Date());
      if (daysSince > 60 && daysSince < 120) {
        insights.push({
          id: `lifecycle-${customer.id}-followup`,
          type: 'lifecycle',
          message: 'Bom momento para follow-up de satisfação.',
          confidence: 0.7,
          actionable: true,
          suggestedAction: 'Enviar pesquisa de satisfação'
        });
      }
    }

    return insights;
  }

  /**
   * Predict next likely product based on purchase sequence
   */
  predictNextProduct(
    purchasedProducts: ProductPurchase[],
    allProducts: Array<{ id: string; name: string; category?: string }>
  ): { id: string; name: string; confidence: number } | null {
    if (purchasedProducts.length === 0) return null;

    // Simple sequence detection (Level 1 -> Level 2 -> Level 3)
    const productNames = purchasedProducts.map(p => p.productName.toLowerCase());
    
    // Look for numbered sequences
    const sequencePatterns = [
      { pattern: /nível\s*1|level\s*1|básico|iniciante/i, next: 'Nível 2', confidence: 0.8 },
      { pattern: /nível\s*2|level\s*2|intermédio|intermediário/i, next: 'Nível 3', confidence: 0.75 },
      { pattern: /sessão\s*1|consulta\s*1|primeira/i, next: 'Sessão 2', confidence: 0.85 },
      { pattern: /implementação|setup|instalação/i, next: 'Manutenção', confidence: 0.7 },
    ];

    for (const product of purchasedProducts) {
      for (const seq of sequencePatterns) {
        if (seq.pattern.test(product.productName)) {
          const nextProduct = allProducts.find(p => 
            p.name.toLowerCase().includes(seq.next.toLowerCase())
          );
          if (nextProduct) {
            return {
              id: nextProduct.id,
              name: nextProduct.name,
              confidence: seq.confidence
            };
          }
        }
      }
    }

    return null;
  }

  private calculateCustomerScore(
    metrics: Record<RankingCriteria, number>,
    weights: Record<RankingCriteria, number>
  ): number {
    let score = 0;
    let totalWeight = 0;

    for (const [criteria, value] of Object.entries(metrics)) {
      const weight = weights[criteria as RankingCriteria] || 0;
      if (weight > 0) {
        // Normalize value (rough estimation)
        const normalizedValue = Math.min(value / 10000, 1) * 100;
        score += normalizedValue * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  private calculateChurnRisk(daysSinceLastPurchase: number, purchaseCount: number): ChurnRisk {
    if (purchaseCount === 0) return 'high';
    if (daysSinceLastPurchase > 180) return 'critical';
    if (daysSinceLastPurchase > 90) return 'high';
    if (daysSinceLastPurchase > 45) return 'medium';
    return 'low';
  }

  private extractProducts(opportunities: Array<{ products?: string[]; closedAt?: string; value: number }>): ProductPurchase[] {
    const products: ProductPurchase[] = [];
    let sequence = 1;

    for (const opp of opportunities.sort((a, b) => 
      new Date(a.closedAt || '').getTime() - new Date(b.closedAt || '').getTime()
    )) {
      if (opp.products) {
        for (const productName of opp.products) {
          products.push({
            productId: productName, // Would need actual ID
            productName,
            purchaseDate: opp.closedAt || '',
            value: opp.value / (opp.products.length || 1),
            sequence: sequence++
          });
        }
      }
    }

    return products;
  }

  private getPeriodStart(period: 'month' | 'quarter' | 'year' | 'all'): Date | null {
    const now = new Date();
    switch (period) {
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarter':
        return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return null;
    }
  }

  private daysBetween(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

export const customerRankingService = CustomerRankingService.getInstance();
