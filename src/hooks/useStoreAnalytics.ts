import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { format, eachDayOfInterval, subDays, getDay, getHours } from "date-fns";

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface StoreKPIs {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  paidOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  revenueChange: number;
  ordersChange: number;
  totalUnits: number;
  uniqueCustomers: number;
  totalViews: number;
  conversionRate: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
  units: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  image?: string;
  totalQuantity: number;
  totalRevenue: number;
  views?: number;
  conversionRate?: number;
  stockQuantity?: number;
  stockStatus?: string;
  trackStock?: boolean;
}

export interface RecentOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string;
  total: number;
  currency: string;
  status: string;
  created_at: string;
  items: OrderItem[];
}

export interface CustomerMetric {
  email: string;
  name: string | null;
  totalSpent: number;
  orderCount: number;
  firstOrder: string;
  lastOrder: string;
}

export interface CouponMetric {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  usedCount: number;
  totalDiscountGiven: number;
  revenueGenerated: number;
  isActive: boolean;
}

export interface HeatmapCell {
  day: number; // 0=Sun...6=Sat
  hour: number;
  count: number;
  revenue: number;
}

export interface InventoryAlert {
  productId: string;
  name: string;
  image?: string;
  stockQuantity: number;
  stockStatus: string;
  category?: string;
}

const PAID_STATUSES = ["paid", "processing", "shipped", "delivered"];

export function useStoreAnalytics(days: number = 30) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const now = new Date();
  const periodStart = subDays(now, days);
  const prevPeriodStart = subDays(periodStart, days);

  // KPIs
  const kpis = useQuery({
    queryKey: ["store-analytics-kpis", wsId, days],
    queryFn: async (): Promise<StoreKPIs> => {
      if (!wsId) throw new Error("No workspace");

      const [{ data: currentOrders, error }, { data: prevOrders, error: prevError }, { count: viewCount }] = await Promise.all([
        supabase
          .from("store_orders")
          .select("total, status, paid_at, items, customer_email")
          .eq("workspace_id", wsId)
          .gte("created_at", periodStart.toISOString()),
        supabase
          .from("store_orders")
          .select("total, status")
          .eq("workspace_id", wsId)
          .gte("created_at", prevPeriodStart.toISOString())
          .lt("created_at", periodStart.toISOString()),
        supabase
          .from("store_page_views" as any)
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", wsId)
          .gte("created_at", periodStart.toISOString()),
      ]);
      if (error) throw error;
      if (prevError) throw prevError;

      const paid = (currentOrders || []).filter(o => PAID_STATUSES.includes(o.status));
      const prevPaid = (prevOrders || []).filter(o => PAID_STATUSES.includes(o.status));

      const totalRevenue = paid.reduce((sum, o) => sum + (o.total || 0), 0);
      const prevRevenue = prevPaid.reduce((sum, o) => sum + (o.total || 0), 0);
      const totalOrders = (currentOrders || []).length;
      const prevTotalOrders = (prevOrders || []).length;

      let totalUnits = 0;
      const emailSet = new Set<string>();
      (currentOrders || []).forEach(o => {
        emailSet.add(o.customer_email);
        const items = (o.items as unknown as OrderItem[]) || [];
        items.forEach(item => { totalUnits += item.quantity || 1; });
      });

      const views = viewCount || 0;

      return {
        totalRevenue,
        totalOrders,
        averageOrderValue: paid.length > 0 ? totalRevenue / paid.length : 0,
        paidOrders: paid.length,
        pendingOrders: (currentOrders || []).filter(o => o.status === "pending").length,
        cancelledOrders: (currentOrders || []).filter(o => o.status === "cancelled").length,
        revenueChange: prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0,
        ordersChange: prevTotalOrders > 0 ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100 : 0,
        totalUnits,
        uniqueCustomers: emailSet.size,
        totalViews: views,
        conversionRate: views > 0 ? (paid.length / views) * 100 : 0,
      };
    },
    enabled: !!wsId,
  });

  // Daily revenue chart
  const dailyRevenue = useQuery({
    queryKey: ["store-analytics-daily", wsId, days],
    queryFn: async (): Promise<DailyRevenue[]> => {
      if (!wsId) throw new Error("No workspace");

      const { data: orders, error } = await supabase
        .from("store_orders")
        .select("total, status, created_at, items")
        .eq("workspace_id", wsId)
        .gte("created_at", periodStart.toISOString())
        .in("status", PAID_STATUSES);
      if (error) throw error;

      const dayMap = new Map<string, { revenue: number; orders: number; units: number }>();
      const allDays = eachDayOfInterval({ start: periodStart, end: now });
      allDays.forEach(d => {
        dayMap.set(format(d, "yyyy-MM-dd"), { revenue: 0, orders: 0, units: 0 });
      });

      (orders || []).forEach(o => {
        const day = format(new Date(o.created_at), "yyyy-MM-dd");
        const existing = dayMap.get(day);
        if (existing) {
          existing.revenue += o.total || 0;
          existing.orders += 1;
          const items = (o.items as unknown as OrderItem[]) || [];
          items.forEach(item => { existing.units += item.quantity || 1; });
        }
      });

      return allDays.map(d => {
        const key = format(d, "yyyy-MM-dd");
        const val = dayMap.get(key)!;
        return { date: key, revenue: val.revenue, orders: val.orders, units: val.units };
      });
    },
    enabled: !!wsId,
  });

  // Top products with stock + views
  const topProducts = useQuery({
    queryKey: ["store-analytics-top-products", wsId, days],
    queryFn: async (): Promise<TopProduct[]> => {
      if (!wsId) throw new Error("No workspace");

      const [{ data: orders, error }, { data: products }, { data: views }] = await Promise.all([
        supabase
          .from("store_orders")
          .select("items")
          .eq("workspace_id", wsId)
          .gte("created_at", periodStart.toISOString())
          .in("status", PAID_STATUSES),
        supabase
          .from("products")
          .select("id, name, images, primary_image_index, stock_quantity, stock_status, track_stock")
          .eq("workspace_id", wsId)
          .eq("store_published", true),
        supabase
          .from("store_page_views" as any)
          .select("product_id")
          .eq("workspace_id", wsId)
          .gte("created_at", periodStart.toISOString()),
      ]);
      if (error) throw error;

      // Count views per product
      const viewMap = new Map<string, number>();
      (views || []).forEach((v: any) => {
        viewMap.set(v.product_id, (viewMap.get(v.product_id) || 0) + 1);
      });

      // Build product info map
      const productInfoMap = new Map<string, any>();
      (products || []).forEach(p => {
        const imgIdx = p.primary_image_index ?? 0;
        productInfoMap.set(p.id, {
          image: p.images?.[imgIdx] || p.images?.[0],
          stockQuantity: p.stock_quantity,
          stockStatus: p.stock_status,
          trackStock: p.track_stock,
        });
      });

      const productMap = new Map<string, TopProduct>();

      (orders || []).forEach(order => {
        const items = (order.items as unknown as OrderItem[]) || [];
        items.forEach(item => {
          const key = item.productId || item.name;
          const existing = productMap.get(key);
          if (existing) {
            existing.totalQuantity += item.quantity || 1;
            existing.totalRevenue += (item.price || 0) * (item.quantity || 1);
          } else {
            const info = productInfoMap.get(item.productId);
            productMap.set(key, {
              productId: item.productId || "",
              name: item.name || "Produto",
              image: item.image || info?.image,
              totalQuantity: item.quantity || 1,
              totalRevenue: (item.price || 0) * (item.quantity || 1),
              views: viewMap.get(item.productId) || 0,
              stockQuantity: info?.stockQuantity ?? 0,
              stockStatus: info?.stockStatus || "available",
              trackStock: info?.trackStock ?? false,
            });
          }
        });
      });

      // Add conversion rate
      return Array.from(productMap.values())
        .map(p => ({
          ...p,
          views: p.views || viewMap.get(p.productId) || 0,
          conversionRate: (p.views || 0) > 0 ? (p.totalQuantity / (p.views || 1)) * 100 : 0,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 20);
    },
    enabled: !!wsId,
  });

  // Recent orders
  const recentOrders = useQuery({
    queryKey: ["store-analytics-recent", wsId],
    queryFn: async (): Promise<RecentOrder[]> => {
      if (!wsId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("store_orders")
        .select("id, order_number, customer_name, customer_email, total, currency, status, created_at, items")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;

      return (data || []).map(o => ({
        ...o,
        items: (o.items as unknown as OrderItem[]) || [],
      }));
    },
    enabled: !!wsId,
  });

  // Customer metrics
  const customerMetrics = useQuery({
    queryKey: ["store-analytics-customers", wsId, days],
    queryFn: async (): Promise<{ customers: CustomerMetric[]; newCount: number; returningCount: number }> => {
      if (!wsId) throw new Error("No workspace");

      const { data: orders, error } = await supabase
        .from("store_orders")
        .select("customer_email, customer_name, total, status, created_at")
        .eq("workspace_id", wsId)
        .in("status", PAID_STATUSES);
      if (error) throw error;

      const customerMap = new Map<string, CustomerMetric>();

      (orders || []).forEach(o => {
        const existing = customerMap.get(o.customer_email);
        if (existing) {
          existing.totalSpent += o.total || 0;
          existing.orderCount += 1;
          if (o.created_at < existing.firstOrder) existing.firstOrder = o.created_at;
          if (o.created_at > existing.lastOrder) existing.lastOrder = o.created_at;
        } else {
          customerMap.set(o.customer_email, {
            email: o.customer_email,
            name: o.customer_name,
            totalSpent: o.total || 0,
            orderCount: 1,
            firstOrder: o.created_at,
            lastOrder: o.created_at,
          });
        }
      });

      const customers = Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
      const newCount = customers.filter(c => c.orderCount === 1).length;
      const returningCount = customers.filter(c => c.orderCount > 1).length;

      return { customers: customers.slice(0, 10), newCount, returningCount };
    },
    enabled: !!wsId,
  });

  // Coupon metrics
  const couponMetrics = useQuery({
    queryKey: ["store-analytics-coupons", wsId, days],
    queryFn: async (): Promise<CouponMetric[]> => {
      if (!wsId) throw new Error("No workspace");

      const [{ data: coupons, error: ce }, { data: orders, error: oe }] = await Promise.all([
        supabase
          .from("store_coupons")
          .select("id, code, discount_type, discount_value, used_count, is_active")
          .eq("workspace_id", wsId),
        supabase
          .from("store_orders")
          .select("coupon_id, discount_amount, total, status")
          .eq("workspace_id", wsId)
          .not("coupon_id", "is", null)
          .in("status", PAID_STATUSES),
      ]);
      if (ce) throw ce;
      if (oe) throw oe;

      const couponOrderMap = new Map<string, { totalDiscount: number; totalRevenue: number }>();
      (orders || []).forEach(o => {
        if (!o.coupon_id) return;
        const existing = couponOrderMap.get(o.coupon_id);
        if (existing) {
          existing.totalDiscount += o.discount_amount || 0;
          existing.totalRevenue += o.total || 0;
        } else {
          couponOrderMap.set(o.coupon_id, {
            totalDiscount: o.discount_amount || 0,
            totalRevenue: o.total || 0,
          });
        }
      });

      return (coupons || []).map(c => {
        const stats = couponOrderMap.get(c.id) || { totalDiscount: 0, totalRevenue: 0 };
        return {
          id: c.id,
          code: c.code,
          discountType: c.discount_type,
          discountValue: c.discount_value,
          usedCount: c.used_count || 0,
          totalDiscountGiven: stats.totalDiscount,
          revenueGenerated: stats.totalRevenue,
          isActive: c.is_active ?? false,
        };
      });
    },
    enabled: !!wsId,
  });

  // Sales heatmap (day x hour)
  const salesHeatmap = useQuery({
    queryKey: ["store-analytics-heatmap", wsId, days],
    queryFn: async (): Promise<HeatmapCell[]> => {
      if (!wsId) throw new Error("No workspace");

      const { data: orders, error } = await supabase
        .from("store_orders")
        .select("created_at, total")
        .eq("workspace_id", wsId)
        .gte("created_at", periodStart.toISOString())
        .in("status", PAID_STATUSES);
      if (error) throw error;

      const grid = new Map<string, HeatmapCell>();
      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
          grid.set(`${d}-${h}`, { day: d, hour: h, count: 0, revenue: 0 });
        }
      }

      (orders || []).forEach(o => {
        const dt = new Date(o.created_at);
        const key = `${getDay(dt)}-${getHours(dt)}`;
        const cell = grid.get(key);
        if (cell) {
          cell.count += 1;
          cell.revenue += o.total || 0;
        }
      });

      return Array.from(grid.values());
    },
    enabled: !!wsId,
  });

  // Inventory alerts
  const inventoryAlerts = useQuery({
    queryKey: ["store-analytics-inventory", wsId],
    queryFn: async (): Promise<{ inStock: number; lowStock: number; outOfStock: number; alerts: InventoryAlert[] }> => {
      if (!wsId) throw new Error("No workspace");

      const { data: products, error } = await supabase
        .from("products")
        .select("id, name, images, primary_image_index, stock_quantity, stock_status, track_stock, category, low_stock_threshold")
        .eq("workspace_id", wsId)
        .eq("store_published", true)
        .eq("track_stock", true);
      if (error) throw error;

      let inStock = 0, lowStock = 0, outOfStock = 0;
      const alerts: InventoryAlert[] = [];

      (products || []).forEach(p => {
        const qty = p.stock_quantity ?? 0;
        const status = p.stock_status || "available";
        const threshold = (p as Record<string, unknown>).low_stock_threshold as number || 5;
        if (status === "out_of_stock" || qty <= 0) {
          outOfStock++;
        } else if (status === "limited" || qty <= threshold) {
          lowStock++;
        } else {
          inStock++;
        }

        if (status === "out_of_stock" || qty <= ((p as Record<string, unknown>).low_stock_threshold as number || 5)) {
          const imgIdx = p.primary_image_index ?? 0;
          alerts.push({
            productId: p.id,
            name: p.name,
            image: p.images?.[imgIdx] || p.images?.[0],
            stockQuantity: qty,
            stockStatus: status,
            category: p.category,
          });
        }
      });

      alerts.sort((a, b) => a.stockQuantity - b.stockQuantity);

      return { inStock, lowStock, outOfStock, alerts };
    },
    enabled: !!wsId,
  });

  // Order status breakdown
  const statusBreakdown = useQuery({
    queryKey: ["store-analytics-status-breakdown", wsId, days],
    queryFn: async () => {
      if (!wsId) throw new Error("No workspace");

      const { data: orders, error } = await supabase
        .from("store_orders")
        .select("status, created_at, total")
        .eq("workspace_id", wsId)
        .gte("created_at", periodStart.toISOString());
      if (error) throw error;

      const dayMap = new Map<string, Record<string, number>>();
      const allDays = eachDayOfInterval({ start: periodStart, end: now });
      allDays.forEach(d => {
        dayMap.set(format(d, "yyyy-MM-dd"), { paid: 0, processing: 0, shipped: 0, delivered: 0, pending: 0, cancelled: 0 });
      });

      (orders || []).forEach(o => {
        const day = format(new Date(o.created_at), "yyyy-MM-dd");
        const existing = dayMap.get(day);
        if (existing && existing[o.status] !== undefined) {
          existing[o.status] += 1;
        }
      });

      return allDays.map(d => {
        const key = format(d, "yyyy-MM-dd");
        return { date: key, ...dayMap.get(key)! };
      });
    },
    enabled: !!wsId,
  });

  return {
    kpis,
    dailyRevenue,
    topProducts,
    recentOrders,
    customerMetrics,
    couponMetrics,
    salesHeatmap,
    inventoryAlerts,
    statusBreakdown,
  };
}
