import { Badge } from "@/components/ui/badge";
import { Beaker, Stethoscope, FileCheck, Sparkles } from "lucide-react";

interface ProductAttribute {
  id: string;
  attribute_type: string;
  attribute_value: string;
}

interface ProductAttributeTagsProps {
  attributes: ProductAttribute[];
}

const attributeConfig: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bgColor: string;
}> = {
  function: {
    icon: Sparkles,
    label: "Função",
    color: "text-blue-700",
    bgColor: "bg-blue-100 hover:bg-blue-200",
  },
  pathology: {
    icon: Stethoscope,
    label: "Patologia",
    color: "text-purple-700",
    bgColor: "bg-purple-100 hover:bg-purple-200",
  },
  indication: {
    icon: FileCheck,
    label: "Indicação",
    color: "text-green-700",
    bgColor: "bg-green-100 hover:bg-green-200",
  },
  protocol: {
    icon: Beaker,
    label: "Protocolo",
    color: "text-amber-700",
    bgColor: "bg-amber-100 hover:bg-amber-200",
  },
};

export function ProductAttributeTags({ attributes }: ProductAttributeTagsProps) {
  if (!attributes || attributes.length === 0) {
    return null;
  }

  // Group attributes by type
  const groupedAttributes = attributes.reduce((acc, attr) => {
    if (!acc[attr.attribute_type]) {
      acc[attr.attribute_type] = [];
    }
    acc[attr.attribute_type].push(attr);
    return acc;
  }, {} as Record<string, ProductAttribute[]>);

  return (
    <div className="space-y-4">
      {Object.entries(groupedAttributes).map(([type, attrs]) => {
        const config = attributeConfig[type] || {
          icon: Sparkles,
          label: type,
          color: "text-muted-foreground",
          bgColor: "bg-muted hover:bg-muted/80",
        };
        const Icon = config.icon;

        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-4 w-4 ${config.color}`} />
              <span className="text-sm font-medium">{config.label}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {attrs.map((attr) => (
                <Badge
                  key={attr.id}
                  variant="secondary"
                  className={`${config.bgColor} ${config.color} border-0`}
                >
                  {attr.attribute_value}
                </Badge>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
