import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { Conversation } from "@/hooks/useConversations";
import { cleanEmailPreview } from "@/lib/cleanEmailPreview";
import { isToday, isYesterday, format as fnsFormat } from "date-fns";
import { pt } from "date-fns/locale";

function formatSmartTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return fnsFormat(d, "HH:mm", { locale: pt });
  if (isYesterday(d)) return `Ontem ${fnsFormat(d, "HH:mm", { locale: pt })}`;
  return fnsFormat(d, "dd/MM HH:mm", { locale: pt });
}

interface ColumnGroup {
  title: string;
  conversations: Conversation[];
}

interface SalesInboxColumnsProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
}

export function SalesInboxColumns({ conversations, selectedId, onSelect, search }: SalesInboxColumnsProps) {
  const columns = useMemo((): ColumnGroup[] => {
    let filtered = conversations;

    // Search filter
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(c =>
        c.contact?.name?.toLowerCase().includes(s) ||
        c.lead?.name?.toLowerCase().includes(s) ||
        c.lead?.email?.toLowerCase().includes(s) ||
        c.last_message_preview?.toLowerCase().includes(s)
      );
    }

    const deals: Conversation[] = [];
    const contactsOpps: Conversation[] = [];
    const notInCRM: Conversation[] = [];
    const colleagues: Conversation[] = [];

    for (const conv of filtered) {
      const hasOpportunity = conv.opportunities && conv.opportunities.length > 0;
      const hasLead = !!conv.lead_id;
      const hasContact = !!conv.contact_id;
      const hasCompany = !!conv.company_id;

      if (hasLead && hasOpportunity) {
        deals.push(conv);
      } else if (hasContact || hasLead) {
        contactsOpps.push(conv);
      } else if (!hasLead && !hasContact && !hasCompany) {
        notInCRM.push(conv);
      } else {
        colleagues.push(conv);
      }
    }

    // Sort each group by last_message_at desc
    const sortByRecent = (a: Conversation, b: Conversation) => {
      const da = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const db = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return db - da;
    };

    deals.sort(sortByRecent);
    contactsOpps.sort(sortByRecent);
    notInCRM.sort(sortByRecent);
    colleagues.sort(sortByRecent);

    return [
      { title: "NEGÓCIOS", conversations: deals },
      { title: "CONTACTOS & OPORTUNIDADES", conversations: contactsOpps },
      { title: "NÃO EXISTE NO CRM", conversations: notInCRM },
      { title: "COLEGAS", conversations: colleagues },
    ];
  }, [conversations, search]);

  return (
    <div className="flex h-full divide-x divide-border">
      {columns.map((col) => (
        <div key={col.title} className="flex-1 min-w-0 flex flex-col">
          {/* Column Header */}
          <div className="px-3 py-2 border-b border-border bg-muted/30 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {col.title}
              </h3>
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-medium bg-muted">
                {col.conversations.length}
              </Badge>
            </div>
          </div>

          {/* Column Items */}
          <ScrollArea className="flex-1">
            <div className="divide-y divide-border/40">
              {col.conversations.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <p className="text-[11px] text-muted-foreground">Sem conversas</p>
                </div>
              ) : (
                col.conversations.map((conv) => {
                  const displayName = conv.contact?.name || conv.lead?.name || conv.external_thread_id || "Desconhecido";
                  const hasUnread = conv.unread_count > 0;
                  const isSelected = selectedId === conv.id;
                  const hasAttachments = (conv as any).channel_metadata?.has_attachments;
                  const emailSubject = conv.channel === "email"
                    ? ((conv as any).channel_metadata?.subject || (conv as any).channel_metadata?.email_subject)
                    : null;

                  // Opportunity value for deals column
                  const oppValue = conv.opportunities?.[0]?.value;

                  return (
                    <button
                      key={conv.id}
                      className={cn(
                        "w-full text-left px-3 py-2 transition-colors hover:bg-accent/50",
                        isSelected && "bg-accent",
                        hasUnread && "bg-primary/[0.03]"
                      )}
                      onClick={() => onSelect(conv.id)}
                    >
                      {/* Row 1: Name + Time */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          {hasUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          )}
                          <span className={cn(
                            "text-[13px] truncate",
                            hasUnread ? "font-semibold text-foreground" : "font-normal text-foreground/90"
                          )}>
                            {displayName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {hasAttachments && (
                            <Paperclip className="w-3 h-3 text-muted-foreground" />
                          )}
                          {conv.last_message_at && (
                            <span className={cn(
                              "text-[11px] whitespace-nowrap",
                              hasUnread ? "text-primary font-medium" : "text-muted-foreground"
                            )}>
                              {formatSmartTime(conv.last_message_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Subject or Preview */}
                      {emailSubject && (
                        <p className="text-[11px] font-medium text-foreground/70 truncate mt-0.5">
                          {emailSubject}
                        </p>
                      )}

                      {/* Row 3: Preview */}
                      <p className={cn(
                        "text-[12px] truncate mt-0.5",
                        hasUnread ? "text-foreground/70" : "text-muted-foreground"
                      )}>
                        {conv.channel === 'email'
                          ? cleanEmailPreview(conv.last_message_preview)
                          : (conv.last_message_preview || "Sem mensagens")}
                      </p>

                      {/* Opportunity value badge */}
                      {oppValue && (
                        <Badge className="mt-1 text-[10px] bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10">
                          € {Number(oppValue).toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                        </Badge>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}
