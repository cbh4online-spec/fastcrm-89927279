import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { startOfMonth, subMonths, format, eachDayOfInterval, startOfDay, endOfDay, subDays } from "date-fns";

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
  revenueChange: number; // % vs previous period
  ordersChange: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  image?: string;
  totalQuantity: number;
  totalRevenue: number;
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

      // Current period orders
      const { data: currentOrders, error } = await supabase
        .from("store_orders")
        .select("total, status, paid_at")
        .eq("workspace_id", wsId)
        .gte("created_at", periodStart.toISOString());
      if (error) throw error;

      // Previous period orders (for comparison)
      const { data: prevOrders, error: prevError } = await supabase
        .from("store_orders")
        .select("total, status")
        .eq("workspace_id", wsId)
        .gte("created_at", prevPeriodStart.toISOString())
        .lt("created_at", periodStart.toISOString());
      if (prevError) throw prevError;

      const paid = (currentOrders || []).filter(o => o.status === "paid" || o.status === "processing" || o.status === "shipped" || o.status === "delivered");
      const prevPaid = (prevOrders || []).filter(o => o.status === "paid" || o.status === "processing" || o.status === "shipped" || o.status === "delivered");

      const totalRevenue = paid.reduce((sum, o) => sum + (o.total || 0), 0);
      const prevRevenue = prevPaid.reduce((sum, o) => sum + (o.total || 0), 0);

      const totalOrders = (currentOrders || []).length;
      const prevTotalOrders = (prevOrders || []).length;

      return {
        totalRevenue,
        totalOrders,
        averageOrderValue: paid.length > 0 ? totalRevenue / paid.length : 0,
        paidOrders: paid.length,
        pendingOrders: (currentOrders || []).filter(o => o.status === "pending").length,
        cancelledOrders: (currentOrders || []).filter(o => o.status === "cancelled").length,
        revenueChange: prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0,
        ordersChange: prevTotalOrders > 0 ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100 : 0,
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
        .select("total, status, created_at")
        .eq("workspace_id", wsId)
        .gte("created_at", periodStart.toISOString())
        .in("status", ["paid", "processing", "shipped", "delivered"]);
      if (error) throw error;

      const dayMap = new Map<string, { revenue: number; orders: number }>();
      const allDays = eachDayOfInterval({ start: periodStart, end: now });
      allDays.forEach(d => {
        dayMap.set(format(d, "yyyy-MM-dd"), { revenue: 0, orders: 0 });
      });

      (orders || []).forEach(o => {
        const day = format(new Date(o.created_at), "yyyy-MM-dd");
        const existing = dayMap.get(day);
        if (existing) {
          existing.revenue += o.total || 0;
          existing.orders += 1;
        }
      });

      return allDays.map(d => {
        const key = format(d, "yyyy-MM-dd");
        const val = dayMap.get(key)!;
        return { date: key, revenue: val.revenue, orders: val.orders };
      });
    },
    enabled: !!wsId,
  });

  // Top products
  const topProducts = useQuery({
    queryKey: ["store-analytics-top-products", wsId, days],
    queryFn: async (): Promise<TopProduct[]> => {
      if (!wsId) throw new Error("No workspace");

      const { data: orders, error } = await supabase
        .from("store_orders")
        .select("items")
        .eq("workspace_id", wsId)
        .gte("created_at", periodStart.toISOString())
        .in("status", ["paid", "processing", "shipped", "delivered"]);
      if (error) throw error;

      const productMap = new Map<string, TopProduct>();

      (orders || []).forEach(order => {
        const items = (order.items as unknown as OrderItem[]) || [];
        items.forEach(item => {
          const existing = productMap.get(item.productId || item.name);
          if (existing) {
            existing.totalQuantity += item.quantity || 1;
            existing.totalRevenue += (item.price || 0) * (item.quantity || 1);
          } else {
            productMap.set(item.productId || item.name, {
              productId: item.productId || "",
              name: item.name || "Produto",
              image: item.image,
              totalQuantity: item.quantity || 1,
              totalRevenue: (item.price || 0) * (item.quantity || 1),
            });
          }
        });
      });

      return Array.from(productMap.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10);
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

  return { kpis, dailyRevenue, topProducts, recentOrders };
}
