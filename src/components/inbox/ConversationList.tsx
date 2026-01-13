import { useState } from "react";
import { useConversations, ConversationChannel, ConversationStatus } from "@/hooks/useConversations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MessageSquare,
  Mail,
  Phone,
  Instagram,
  Facebook,
  Globe,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const channelIcons: Record<ConversationChannel, React.ElementType> = {
  whatsapp: Phone,
  email: Mail,
  sms: MessageSquare,
  webchat: Globe,
  instagram: Instagram,
  facebook: Facebook,
};

const channelColors: Record<ConversationChannel, string> = {
  whatsapp: "text-green-500",
  email: "text-blue-500",
  sms: "text-purple-500",
  webchat: "text-cyan-500",
  instagram: "text-pink-500",
  facebook: "text-indigo-500",
};

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "all">("open");
  const [showFilters, setShowFilters] = useState(false);

  const { data: conversations, isLoading } = useConversations({
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const filteredConversations = conversations?.filter((conv) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      conv.lead?.name?.toLowerCase().includes(searchLower) ||
      conv.lead?.email?.toLowerCase().includes(searchLower) ||
      conv.external_thread_id?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Inbox</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-accent")}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as ConversationStatus | "all")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !filteredConversations?.length ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageSquare className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredConversations.map((conv) => {
              const ChannelIcon = channelIcons[conv.channel];
              const displayName = conv.lead?.name || conv.external_thread_id || "Unknown";

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    "w-full p-4 text-left hover:bg-accent/50 transition-colors",
                    selectedId === conv.id && "bg-accent"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Channel Icon */}
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0",
                        channelColors[conv.channel]
                      )}
                    >
                      <ChannelIcon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground truncate">
                          {displayName}
                        </span>
                        {conv.unread_count > 0 && (
                          <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-sm text-muted-foreground truncate capitalize">
                          {conv.channel}
                        </span>
                        {conv.last_message_at && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatDistanceToNow(new Date(conv.last_message_at), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
