import { useState, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquare, Reply, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import {
  useOpportunityComments,
  useAddComment,
  useDeleteComment,
  type OpportunityComment,
} from "@/hooks/useOpportunityComments";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface OpportunityCommentsTabProps {
  opportunityId: string;
}

// ── Mention Input ──────────────────────────────────────────
function MentionInput({
  value,
  onChange,
  onMentionAdd,
  placeholder,
  className,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onMentionAdd: (userId: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation("crm");
  const { data: members = [] } = useWorkspaceMembers();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredMembers = useMemo(() => {
    if (!mentionFilter) return members;
    const lower = mentionFilter.toLowerCase();
    return members.filter(
      (m) =>
        m.profile?.full_name?.toLowerCase().includes(lower) ||
        m.profile?.email?.toLowerCase().includes(lower)
    );
  }, [members, mentionFilter]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart || 0;
    onChange(val);

    // Detect @ trigger
    const textBeforeCursor = val.substring(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    if (atIndex >= 0 && (atIndex === 0 || textBeforeCursor[atIndex - 1] === " ")) {
      const query = textBeforeCursor.substring(atIndex + 1);
      if (!query.includes(" ")) {
        setMentionStart(atIndex);
        setMentionFilter(query);
        setShowDropdown(true);
        return;
      }
    }
    setShowDropdown(false);
  };

  const selectMember = (member: (typeof members)[0]) => {
    const name = member.profile?.full_name || member.profile?.email || "User";
    const before = value.substring(0, mentionStart);
    const after = value.substring(mentionStart + mentionFilter.length + 1);
    onChange(`${before}@${name} ${after}`);
    onMentionAdd(member.user_id);
    setShowDropdown(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn("min-h-[60px] resize-none text-sm", className)}
        autoFocus={autoFocus}
      />
      {showDropdown && filteredMembers.length > 0 && (
        <div className="absolute z-50 bottom-full mb-1 left-0 w-64 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
          <div className="p-1.5 text-[10px] text-muted-foreground border-b">
            {t("oppDetail_mentionSearch")}
          </div>
          {filteredMembers.map((m) => (
            <button
              key={m.user_id}
              type="button"
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm"
              onMouseDown={(e) => {
                e.preventDefault();
                selectMember(m);
              }}
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={m.profile?.avatar_url || ""} />
                <AvatarFallback className="text-[9px]">
                  {(m.profile?.full_name || m.profile?.email || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{m.profile?.full_name || m.profile?.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Render content with highlighted @mentions ──────────────
function CommentContent({ content, mentions, members }: { content: string; mentions: string[]; members: any[] }) {
  if (!mentions.length) return <p className="text-sm whitespace-pre-wrap">{content}</p>;

  const mentionNames = mentions.map((uid) => {
    const m = members.find((mem: any) => mem.user_id === uid);
    return m?.profile?.full_name || m?.profile?.email || null;
  }).filter(Boolean);

  let result = content;
  const parts: (string | { name: string })[] = [];
  let remaining = result;

  for (const name of mentionNames) {
    if (!name) continue;
    const idx = remaining.indexOf(`@${name}`);
    if (idx >= 0) {
      if (idx > 0) parts.push(remaining.substring(0, idx));
      parts.push({ name });
      remaining = remaining.substring(idx + name.length + 1);
    }
  }
  if (remaining) parts.push(remaining);

  return (
    <p className="text-sm whitespace-pre-wrap">
      {parts.map((p, i) =>
        typeof p === "string" ? (
          <span key={i}>{p}</span>
        ) : (
          <span key={i} className="text-primary font-medium">@{p.name}</span>
        )
      )}
    </p>
  );
}

// ── Comment Item ───────────────────────────────────────────
function CommentItem({
  comment,
  members,
  currentUserId,
  onReply,
  onDelete,
  isReply,
}: {
  comment: OpportunityComment;
  members: any[];
  currentUserId: string;
  onReply: (id: string) => void;
  onDelete: (id: string) => void;
  isReply?: boolean;
}) {
  const { t } = useTranslation("crm");
  const initials = (comment.profile?.full_name || "U").charAt(0).toUpperCase();

  return (
    <div className={cn("flex gap-2.5 group", isReply && "ml-8")}>
      <Avatar className="h-7 w-7 mt-0.5 shrink-0">
        <AvatarImage src={comment.profile?.avatar_url || ""} />
        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium truncate">
            {comment.profile?.full_name || "User"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <CommentContent content={comment.content} mentions={comment.mentions} members={members} />
        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isReply && (
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] gap-1" onClick={() => onReply(comment.id)}>
              <Reply className="w-3 h-3" />
              {t("oppDetail_reply")}
            </Button>
          )}
          {comment.user_id === currentUserId && (
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] gap-1 text-destructive hover:text-destructive" onClick={() => onDelete(comment.id)}>
              <Trash2 className="w-3 h-3" />
              {t("oppDetail_deleteComment")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────
export function OpportunityCommentsTab({ opportunityId }: OpportunityCommentsTabProps) {
  const { t } = useTranslation("crm");
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useOpportunityComments(opportunityId);
  const { data: members = [] } = useWorkspaceMembers();
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();

  const [newComment, setNewComment] = useState("");
  const [newMentions, setNewMentions] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyMentions, setReplyMentions] = useState<string[]>([]);

  const topLevelComments = useMemo(
    () => comments.filter((c) => !c.parent_id),
    [comments]
  );

  const getReplies = useCallback(
    (parentId: string) => comments.filter((c) => c.parent_id === parentId),
    [comments]
  );

  const handlePost = async () => {
    if (!newComment.trim()) return;
    try {
      await addComment.mutateAsync({
        opportunityId,
        content: newComment.trim(),
        mentions: newMentions,
      });
      setNewComment("");
      setNewMentions([]);
      toast.success(t("oppDetail_commentPosted"));
    } catch {
      toast.error("Error posting comment");
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) return;
    try {
      await addComment.mutateAsync({
        opportunityId,
        content: replyContent.trim(),
        parentId,
        mentions: replyMentions,
      });
      setReplyContent("");
      setReplyMentions([]);
      setReplyingTo(null);
      toast.success(t("oppDetail_commentPosted"));
    } catch {
      toast.error("Error posting reply");
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync({ commentId, opportunityId });
      toast.success(t("oppDetail_commentDeleted"));
    } catch {
      toast.error("Error deleting comment");
    }
  };

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* New comment form */}
      <div className="space-y-2">
        <MentionInput
          value={newComment}
          onChange={setNewComment}
          onMentionAdd={(uid) => setNewMentions((prev) => [...prev, uid])}
          placeholder={t("oppDetail_addComment")}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!newComment.trim() || addComment.isPending}
            onClick={handlePost}
            className="gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            {t("oppDetail_postComment")}
          </Button>
        </div>
      </div>

      {/* Comments list */}
      {topLevelComments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("oppDetail_noComments")}</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-4">
            {topLevelComments.map((comment) => {
              const replies = getReplies(comment.id);
              return (
                <div key={comment.id} className="space-y-2">
                  <CommentItem
                    comment={comment}
                    members={members}
                    currentUserId={user?.id || ""}
                    onReply={(id) => setReplyingTo(replyingTo === id ? null : id)}
                    onDelete={handleDelete}
                  />
                  {/* Replies */}
                  {replies.map((r) => (
                    <CommentItem
                      key={r.id}
                      comment={r}
                      members={members}
                      currentUserId={user?.id || ""}
                      onReply={() => {}}
                      onDelete={handleDelete}
                      isReply
                    />
                  ))}
                  {replies.length > 0 && (
                    <div className="ml-8 text-[10px] text-muted-foreground">
                      {t("oppDetail_repliesCount", { count: replies.length })}
                    </div>
                  )}
                  {/* Reply form */}
                  {replyingTo === comment.id && (
                    <div className="ml-8 space-y-1.5">
                      <MentionInput
                        value={replyContent}
                        onChange={setReplyContent}
                        onMentionAdd={(uid) => setReplyMentions((prev) => [...prev, uid])}
                        placeholder={t("oppDetail_addComment")}
                        autoFocus
                      />
                      <div className="flex gap-1.5 justify-end">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setReplyingTo(null)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={!replyContent.trim() || addComment.isPending}
                          onClick={() => handleReply(comment.id)}
                        >
                          <Reply className="w-3 h-3" />
                          {t("oppDetail_reply")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
