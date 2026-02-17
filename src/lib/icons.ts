import { LucideIcon } from "lucide-react";
import {
  Home, Search, Headphones, TrendingUp, Megaphone, DollarSign, BarChart3,
  MessageSquare, Zap, Brain, Plug, Package, Mail, Star, Users, Building2,
  Target, FileText, Shield, Clock, Check, LayoutGrid, Sparkles, CreditCard,
  ExternalLink, Play, ArrowRight, Settings, Eye, Edit, Trash, Plus,
  Heart, Briefcase, ShoppingBag, Utensils, Scissors, Camera, Dumbbell,
  GraduationCap, Stethoscope, Wrench, Palette, Music
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Home, Search, Headphones, TrendingUp, Megaphone, DollarSign, BarChart3,
  MessageSquare, Zap, Brain, Plug, Package, Mail, Star, Users, Building2,
  Target, FileText, Shield, Clock, Check, LayoutGrid, Sparkles, CreditCard,
  ExternalLink, Play, ArrowRight, Settings, Eye, Edit, Trash, Plus,
  Heart, Briefcase, ShoppingBag, Utensils, Scissors, Camera, Dumbbell,
  GraduationCap, Stethoscope, Wrench, Palette, Music
};

// Industry icon categories for the editor picker
export const INDUSTRY_ICONS: { category: string; icons: string[] }[] = [
  { category: "Negócio", icons: ["Briefcase", "TrendingUp", "DollarSign", "BarChart3", "Target", "Building2"] },
  { category: "Saúde", icons: ["Heart", "Stethoscope", "Dumbbell"] },
  { category: "Beleza & Criativo", icons: ["Scissors", "Palette", "Camera", "Sparkles"] },
  { category: "Educação", icons: ["GraduationCap", "Brain", "FileText"] },
  { category: "Alimentação", icons: ["Utensils", "ShoppingBag"] },
  { category: "Serviços", icons: ["Wrench", "Headphones", "Shield"] },
  { category: "Entretenimento", icons: ["Music", "Play", "Star"] },
  { category: "Comunicação", icons: ["MessageSquare", "Mail", "Users", "Megaphone"] },
];

export function getIconByName(name: string): LucideIcon {
  return iconMap[name] || Package;
}
