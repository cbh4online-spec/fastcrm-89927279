import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageThread } from "@/components/c2c/MessageThread";
import { useC2CConversations, useC2CThread, useSendC2CMessage } from "@/hooks/useC2CMessages";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function C2CMessages() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { data: conversations = [], isLoading } = useC2CConversations(workspaceId);
  const sendMessage = useSendC2CMessage(workspaceId);

  const [selectedConv, setSelectedConv] = useState<{
    listingId: string;
    otherUserId: string;
    title: string;
  } | null>(null);

  const { data: threadMessages = [] } = useC2CThread(
    selectedConv?.listingId,
    selectedConv?.otherUserId
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/c2c")} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Marketplace
        </Button>
        <h1 className="text-2xl font-bold mb-6">Mensagens</h1>

        <div className="grid lg:grid-cols-3 gap-4 h-[600px]">
          {/* Conversations list */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-3 border-b bg-muted/30">
              <h2 className="font-medium text-sm">Conversas</h2>
            </div>
            <div className="overflow-y-auto h-[calc(100%-48px)]">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">A carregar...</div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Sem conversas
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={`${conv.listing_id}:${conv.other_user_id}`}
                    onClick={() =>
                      setSelectedConv({
                        listingId: conv.listing_id,
                        otherUserId: conv.other_user_id,
                        title: conv.listing_title,
                      })
                    }
                    className={`w-full text-left p-3 border-b hover:bg-muted/50 transition-colors ${
                      selectedConv?.listingId === conv.listing_id &&
                      selectedConv?.otherUserId === conv.other_user_id
                        ? "bg-muted"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{conv.listing_title}</p>
                      {conv.unread_count > 0 && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 min-w-[20px] flex items-center justify-center">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {conv.last_message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(new Date(conv.last_message_at), "d MMM, HH:mm", { locale: pt })}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Thread */}
          <div className="lg:col-span-2 border rounded-xl overflow-hidden flex flex-col">
            {selectedConv ? (
              <>
                <div className="p-3 border-b bg-muted/30">
                  <p className="font-medium text-sm">{selectedConv.title}</p>
                </div>
                <div className="flex-1 min-h-0">
                  <MessageThread
                    messages={threadMessages}
                    onSend={(content) =>
                      sendMessage.mutate({
                        listingId: selectedConv.listingId,
                        receiverId: selectedConv.otherUserId,
                        content,
                      })
                    }
                    isSending={sendMessage.isPending}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Seleciona uma conversa</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
