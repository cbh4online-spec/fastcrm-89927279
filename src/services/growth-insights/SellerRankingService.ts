// Seller Ranking Service - Performance Intelligence
import type { 
  TopSeller, 
  SellerProduct, 
  SellerInsight,
  RankingConfig 
} from '@/types/growth-insights';

export class SellerRankingService {
  private static instance: SellerRankingService;

  static getInstance(): SellerRankingService {
    if (!SellerRankingService.instance) {
      SellerRankingService.instance = new SellerRankingService();
    }
    return SellerRankingService.instance;
  }

  /**
   * Calculate Top Sellers based on performance metrics
   */
  calculateTopSellers(
    sellers: Array<{
      id: string;
      name: string;
      email?: string;
      avatarUrl?: string;
      target?: number;
    }>,
    opportunities: Array<{
      id: string;
      ownerId: string;
      value: number;
      status: string;
      createdAt: string;
      closedAt?: string;
      products?: string[];
    }>,
    config: Partial<RankingConfig> = {}
  ): TopSeller[] {
    const period = config.period || 'year';
    const limit = config.limit || 10;
    const periodStart = this.getPeriodStart(period);

    const sellerData = sellers.map(seller => {
      const sellerOpps = opportunities.filter(opp => opp.ownerId === seller.id);
      const periodOpps = sellerOpps.filter(opp => 
        !periodStart || new Date(opp.createdAt) >= periodStart
      );

      const wonOpps = periodOpps.filter(opp => opp.status === 'closed_won');
      const lostOpps = periodOpps.filter(opp => opp.status === 'closed_lost');
      const activeOpps = periodOpps.filter(opp => 
        opp.status !== 'closed_won' && opp.status !== 'closed_lost'
      );

      const totalRevenue = wonOpps.reduce((sum, opp) => sum + (opp.value || 0), 0);
      const forecastedRevenue = activeOpps.reduce((sum, opp) => sum + (opp.value || 0) * 0.5, 0);
      
      const totalDeals = wonOpps.length + lostOpps.length;
      const conversionRate = totalDeals > 0 ? (wonOpps.length / totalDeals) * 100 : 0;

      // Calculate average close velocity
      const closeVelocities = wonOpps
        .filter(opp => opp.closedAt && opp.createdAt)
        .map(opp => this.daysBetween(new Date(opp.createdAt), new Date(opp.closedAt!)));
      const avgCloseVelocity = closeVelocities.length > 0
        ? closeVelocities.reduce((a, b) => a + b, 0) / closeVelocities.length
        : 0;

      // Top products sold
      const productCounts = new Map<string, { count: number; revenue: number }>();
      wonOpps.forEach(opp => {
        if (opp.products) {
          opp.products.forEach(product => {
            const existing = productCounts.get(product) || { count: 0, revenue: 0 };
            productCounts.set(product, {
              count: existing.count + 1,
              revenue: existing.revenue + (opp.value / opp.products!.length)
            });
          });
        }
      });

      const topProducts: SellerProduct[] = Array.from(productCounts.entries())
        .map(([name, data]) => ({
          productId: name,
          productName: name,
          salesCount: data.count,
          revenue: data.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Target progress
      const targetProgress = seller.target && seller.target > 0
        ? (totalRevenue / seller.target) * 100
        : 0;

      // Calculate composite score for ranking
      const score = this.calculateSellerScore({
        revenue: totalRevenue,
        conversionRate,
        closeVelocity: avgCloseVelocity,
        dealsWon: wonOpps.length
      });

      return {
        id: seller.id,
        name: seller.name,
        email: seller.email,
        avatarUrl: seller.avatarUrl,
        totalRevenue,
        forecastedRevenue,
        margin: totalRevenue * 0.3, // Estimate
        conversionRate,
        closeVelocity: Math.round(avgCloseVelocity),
        dealsWon: wonOpps.length,
        dealsLost: lostOpps.length,
        topProducts,
        targetProgress: Math.min(targetProgress, 150),
        insights: [],
        score
      };
    });

    // Sort by score and limit
    return sellerData
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, ...seller }) => seller);
  }

  /**
   * Generate performance insights for a seller
   */
  generateSellerInsights(
    seller: TopSeller,
    allSellers: TopSeller[]
  ): SellerInsight[] {
    const insights: SellerInsight[] = [];
    
    // Calculate averages for comparison
    const avgRevenue = allSellers.reduce((sum, s) => sum + s.totalRevenue, 0) / allSellers.length;
    const avgConversion = allSellers.reduce((sum, s) => sum + s.conversionRate, 0) / allSellers.length;
    const avgVelocity = allSellers.filter(s => s.closeVelocity > 0)
      .reduce((sum, s) => sum + s.closeVelocity, 0) / allSellers.filter(s => s.closeVelocity > 0).length;

    // Strength: High conversion rate
    if (seller.conversionRate > avgConversion * 1.2) {
      insights.push({
        id: `strength-${seller.id}-conversion`,
        type: 'strength',
        message: `Taxa de conversão ${Math.round(seller.conversionRate)}% (acima da média).`,
        impact: 'high'
      });
    }

    // Strength: Fast closer
    if (seller.closeVelocity > 0 && seller.closeVelocity < avgVelocity * 0.8) {
      insights.push({
        id: `strength-${seller.id}-velocity`,
        type: 'strength',
        message: `Fecha negócios mais rápido que a média (${seller.closeVelocity} dias).`,
        impact: 'medium'
      });
    }

    // Strength: Top products
    if (seller.topProducts.length > 0) {
      const topProduct = seller.topProducts[0];
      insights.push({
        id: `strength-${seller.id}-products`,
        type: 'strength',
        message: `Melhor performance em "${topProduct.productName}".`,
        impact: 'medium'
      });
    }

    // Improvement: Below average conversion
    if (seller.conversionRate < avgConversion * 0.8 && seller.dealsWon + seller.dealsLost > 5) {
      insights.push({
        id: `improvement-${seller.id}-conversion`,
        type: 'improvement',
        message: 'Taxa de conversão abaixo da média. Considerar treino adicional.',
        impact: 'high'
      });
    }

    // Trend: Target progress
    if (seller.targetProgress >= 100) {
      insights.push({
        id: `trend-${seller.id}-target`,
        type: 'trend',
        message: `Meta atingida! ${Math.round(seller.targetProgress)}% do objetivo.`,
        impact: 'high'
      });
    } else if (seller.targetProgress >= 80) {
      insights.push({
        id: `trend-${seller.id}-target`,
        type: 'trend',
        message: `Perto da meta: ${Math.round(seller.targetProgress)}% alcançado.`,
        impact: 'medium'
      });
    }

    // Recommendation: Focus on strengths
    if (seller.topProducts.length > 0) {
      insights.push({
        id: `recommendation-${seller.id}-focus`,
        type: 'recommendation',
        message: 'Continuar focando em produtos de alta performance.',
        impact: 'medium'
      });
    }

    return insights;
  }

  private calculateSellerScore(metrics: {
    revenue: number;
    conversionRate: number;
    closeVelocity: number;
    dealsWon: number;
  }): number {
    // Weighted composite score
    const revenueScore = Math.min(metrics.revenue / 100000, 1) * 40;
    const conversionScore = Math.min(metrics.conversionRate / 100, 1) * 30;
    const velocityScore = metrics.closeVelocity > 0 
      ? Math.max(0, 1 - (metrics.closeVelocity / 90)) * 20 
      : 0;
    const volumeScore = Math.min(metrics.dealsWon / 20, 1) * 10;

    return revenueScore + conversionScore + velocityScore + volumeScore;
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

export const sellerRankingService = SellerRankingService.getInstance();
