import { useState, useEffect } from "react";
import { Building2, Stethoscope, Scissors, Sparkles, Cross, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BusinessType = 
  | "hairdresser" 
  | "clinic" 
  | "therapist" 
  | "aesthetics" 
  | "pharmacy" 
  | "other";

interface BusinessTypeOption {
  value: BusinessType | "all";
  label: string;
  icon: React.ReactNode;
}

const businessTypeOptions: BusinessTypeOption[] = [
  { value: "all", label: "Todos", icon: <Building2 className="h-4 w-4" /> },
  { value: "hairdresser", label: "Cabeleireiro", icon: <Scissors className="h-4 w-4" /> },
  { value: "clinic", label: "Clínica", icon: <Stethoscope className="h-4 w-4" /> },
  { value: "aesthetics", label: "Estética", icon: <Sparkles className="h-4 w-4" /> },
  { value: "pharmacy", label: "Farmácia", icon: <Cross className="h-4 w-4" /> },
  { value: "other", label: "Outro", icon: <MoreHorizontal className="h-4 w-4" /> },
];

interface BusinessTypeFilterProps {
  clientBusinessType?: BusinessType | null;
  value: BusinessType | "all";
  onChange: (value: BusinessType | "all") => void;
  className?: string;
}

const STORAGE_KEY = "client_catalog_business_filter";

export function BusinessTypeFilter({
  clientBusinessType,
  value,
  onChange,
  className,
}: BusinessTypeFilterProps) {
  // Initialize from localStorage or client's business type
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && businessTypeOptions.some((opt) => opt.value === stored)) {
      onChange(stored as BusinessType | "all");
    } else if (clientBusinessType) {
      onChange(clientBusinessType);
    }
  }, [clientBusinessType]);

  const handleChange = (newValue: BusinessType | "all") => {
    localStorage.setItem(STORAGE_KEY, newValue);
    onChange(newValue);
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {businessTypeOptions.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? "default" : "outline"}
          size="sm"
          onClick={() => handleChange(option.value)}
          className={cn(
            "gap-2 transition-all",
            value === option.value && "shadow-sm"
          )}
        >
          {option.icon}
          <span className="hidden sm:inline">{option.label}</span>
        </Button>
      ))}
    </div>
  );
}

export { businessTypeOptions };
