import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProductsList } from "@/components/products/ProductsList";

export default function Products() {
  return (
    <DashboardLayout>
      <ProductsList />
    </DashboardLayout>
  );
}
