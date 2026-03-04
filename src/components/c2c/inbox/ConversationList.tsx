import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, MessageCircle, Plus, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { C2CConversation } from "@/hooks/useC2CMessages";

type Filter = "all" | "unread" | "offer" | "reserved" | "sold";

interface ConversationListProps {
  conversations: C2CConversation[];
  isLoading: boolean;
  selectedKey: string | null;
  onSelect: (conv: C2CConversation) => void;
}

const FILTER_CHIPS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "unread", label: "Não lidas" },
  { key: "offer", label: "Com oferta" },
  { key: "reserved", label: "Reservadas" },
  { key: "sold", label: "Vendidas" },
];

export function ConversationList({ conversations, isLoading, selectedKey, onSelect }: ConversationListProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    let list = conversations;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.listing_title.toLowerCase().includes(q) || c.last_message.toLowerCase().includes(q));
    }
    switch (filter) {
      case "unread": list = list.filter(c => c.unread_count > 0); break;
      case "offer": list = list.filter(c => c.has_pending_offer); break;
      case "reserved": list = list.filter(c => c.listing_status === "reserved"); break;
      case "sold": list = list.filter(c => c.listing_status === "sold"); break;
    }
    return list;
  }, [conversations, search, filter]);

  const statusColor = (s: string) => {
    if (s === "reserved") return "bg-[hsl(38,92%,50%)]/20 text-[hsl(38,92%,50%)]";
    if (s === "sold") return "bg-destructive/20 text-destructive";
    return "";
  };

  return (
    <div className="flex flex-col h-full glass-premium rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar conversas..."
            className="pl-9 h-9 bg-muted/30 border-border/30"
          />
        </div>
        {/* Filter chips */}
        <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar">
          {FILTER_CHIPS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center text-muted-foreground text-sm">A carregar...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center">
            <MessageCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mb-4">Sem conversas</p>
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/c2c")} className="text-xs">
                <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                Explorar Marketplace
              </Button>
              <Button size="sm" onClick={() => navigate("/dashboard/c2c/create")} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Publicar anúncio
              </Button>
            </div>
          </div>
        ) : (
          filtered.map(conv => {
            const key = `${conv.listing_id}:${conv.other_user_id}`;
            const isSelected = selectedKey === key;
            return (
              <button
                key={key}
                onClick={() => onSelect(conv)}
                className={`w-full text-left p-3 border-b border-border/30 transition-all ${
                  isSelected
                    ? "bg-primary/10 border-l-2 border-l-primary"
                    : "hover:bg-muted/30"
                }`}
              >
                <div className="flex gap-2.5">
                  {/* Thumbnail */}
                  <div className="w-11 h-11 rounded-lg bg-muted/50 overflow-hidden flex-shrink-0">
                    {conv.listing_photo ? (
                      <img src={conv.listing_photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-medium truncate text-foreground">{conv.listing_title}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {conv.unread_count > 0 && (
                          <Badge className="text-[10px] px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center bg-primary text-primary-foreground">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-semibold text-[hsl(var(--gold))]">
                        {conv.listing_price.toFixed(2)} €
                      </span>
                      {conv.listing_status !== "active" && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor(conv.listing_status)}`}>
                          {conv.listing_status === "reserved" ? "Reservado" : "Vendido"}
                        </span>
                      )}
                      {conv.has_pending_offer && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                          Oferta
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{conv.last_message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {format(new Date(conv.last_message_at), "d MMM, HH:mm", { locale: pt })}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
