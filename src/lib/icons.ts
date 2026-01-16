import { LucideIcon } from "lucide-react";
import {
  Home, Search, Headphones, TrendingUp, Megaphone, DollarSign, BarChart3,
  MessageSquare, Zap, Brain, Plug, Package, Mail, Star, Users, Building2,
  Target, FileText, Shield, Clock, Check, LayoutGrid, Sparkles, CreditCard,
  ExternalLink, Play, ArrowRight, Settings, Eye, Edit, Trash, Plus
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Home, Search, Headphones, TrendingUp, Megaphone, DollarSign, BarChart3,
  MessageSquare, Zap, Brain, Plug, Package, Mail, Star, Users, Building2,
  Target, FileText, Shield, Clock, Check, LayoutGrid, Sparkles, CreditCard,
  ExternalLink, Play, ArrowRight, Settings, Eye, Edit, Trash, Plus
};

export function getIconByName(name: string): LucideIcon {
  return iconMap[name] || Package;
}
