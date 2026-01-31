import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProtocols } from "@/hooks/client-portal/useProtocols";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { ProtocolCard } from "./ProtocolCard";
import { ProtocolDetailModal } from "./ProtocolDetailModal";
import type { ProductProtocol } from "@/types/protocol";
import { Package, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProtocolsSectionProps {
  title?: string;
  showCategories?: boolean;
  limit?: number;
  compact?: boolean;
  className?: string;
}

export function ProtocolsSection({
  title = "Protocolos e Kits",
  showCategories = true,
  limit = 10,
  compact = false,
  className,
}: ProtocolsSectionProps) {
  const { clientUser } = useClientAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<ProductProtocol | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { protocols, categories, loading } = useProtocols({
    workspaceId: clientUser?.workspace_id,
    category: selectedCategory || undefined,
    limit,
  });

  const handleViewDetails = (protocol: ProductProtocol) => {
    setSelectedProtocol(protocol);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5" />
          <h3 className="font-semibold">{title}</h3>
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (protocols.length === 0) {
    return null; // Don't show section if no protocols
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">{title}</h3>
          <Badge variant="secondary">{protocols.length}</Badge>
        </div>
      </div>

      {/* Category Filter */}
      {showCategories && categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            Todos
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      )}

      {/* Protocols Grid */}
      {compact ? (
        <div className="space-y-2">
          {protocols.map((protocol) => (
            <ProtocolCard
              key={protocol.id}
              protocol={protocol}
              compact
              onViewDetails={() => handleViewDetails(protocol)}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {protocols.map((protocol) => (
            <ProtocolCard
              key={protocol.id}
              protocol={protocol}
              onViewDetails={() => handleViewDetails(protocol)}
              onAddToCart={() => handleViewDetails(protocol)} // Opens modal to select optional products
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <ProtocolDetailModal
        protocol={selectedProtocol}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
