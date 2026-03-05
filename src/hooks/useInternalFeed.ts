import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { emitKernelEvent } from '@/lib/kernelEmitter';
import type { Json } from '@/integrations/supabase/types';

export type FeedType = 'workspace' | 'team' | 'user' | 'client';
export type PostType = 'update' | 'help_request' | 'daily_checklist' | 'winners' | 'ai_alert';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface Post {
  id: string;
  workspace_id: string;
  author_id: string;
  feed_type: FeedType;
  target_team_id: string | null;
  target_user_id: string | null;
  target_client_id: string | null;
  post_type: PostType;
  title: string | null;
  content: string;
  checklist_items: ChecklistItem[];
  attachments: Attachment[];
  is_pinned: boolean;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  ai_generated: boolean;
  ai_source: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  comments_count?: number;
  reactions?: PostReaction[];
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_comment_id: string | null;
  attachments: Attachment[];
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  reactions?: PostReaction[];
  replies?: PostComment[];
}

export interface PostReaction {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

export interface PostMention {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  mentioned_user_id: string;
  mentioned_by: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface CreatePostInput {
  feed_type: FeedType;
  post_type: PostType;
  title?: string;
  content: string;
  checklist_items?: ChecklistItem[];
  attachments?: Attachment[];
  target_team_id?: string;
  target_user_id?: string;
  target_client_id?: string;
  mentions?: string[];
}

export function useInternalFeed(feedType?: FeedType, targetId?: string) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const postsQuery = useQuery({
    queryKey: ['internal-posts', currentWorkspace?.id, feedType, targetId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      let query = supabase
        .from('internal_posts')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (feedType) {
        query = query.eq('feed_type', feedType);
      }

      if (targetId) {
        if (feedType === 'team') {
          query = query.eq('target_team_id', targetId);
        } else if (feedType === 'user') {
          query = query.eq('target_user_id', targetId);
        } else if (feedType === 'client') {
          query = query.eq('target_client_id', targetId);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch reactions for each post
      const postsWithReactions = await Promise.all(
        (data || []).map(async (post) => {
          const { data: reactions } = await supabase
            .from('post_reactions')
            .select('*')
            .eq('post_id', post.id);

          const { count } = await supabase
            .from('post_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          // Parse JSON fields
          const checklistItems = Array.isArray(post.checklist_items) 
            ? (post.checklist_items as unknown as ChecklistItem[])
            : [];
          const attachments = Array.isArray(post.attachments) 
            ? (post.attachments as unknown as Attachment[])
            : [];
          const metadata = typeof post.metadata === 'object' && post.metadata !== null
            ? (post.metadata as Record<string, unknown>)
            : {};

          return {
            ...post,
            checklist_items: checklistItems,
            attachments: attachments,
            metadata: metadata,
            reactions: reactions || [],
            comments_count: count || 0,
          } as Post;
        })
      );

      return postsWithReactions;
    },
    enabled: !!currentWorkspace?.id,
  });

  const createPost = useMutation({
    mutationFn: async (input: CreatePostInput) => {
      if (!currentWorkspace?.id || !user?.id) throw new Error('Missing context');

      const { data, error } = await supabase
        .from('internal_posts')
        .insert({
          workspace_id: currentWorkspace.id,
          author_id: user.id,
          feed_type: input.feed_type,
          post_type: input.post_type,
          title: input.title,
          content: input.content,
          checklist_items: (input.checklist_items || []) as unknown as Json,
          attachments: (input.attachments || []) as unknown as Json,
          target_team_id: input.target_team_id,
          target_user_id: input.target_user_id,
          target_client_id: input.target_client_id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create mentions if any
      if (input.mentions && input.mentions.length > 0) {
        await supabase.from('post_mentions').insert(
          input.mentions.map((userId) => ({
            post_id: data.id,
            mentioned_user_id: userId,
            mentioned_by: user.id,
          }))
        );
      }

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['internal-posts'] });
      toast({ title: 'Post publicado com sucesso' });
      console.log(`[FEED] Post created: ${data.id}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'FEED.POST_CREATED',
          entity_kind: 'post',
          entity_id: data.id,
          source_module: 'core-feed',
          payload: {
            feed_type: variables.feed_type,
            post_type: variables.post_type,
            has_mentions: !!(variables.mentions && variables.mentions.length > 0),
            has_checklist: !!(variables.checklist_items && variables.checklist_items.length > 0),
          },
        });
      }
    },
    onError: (error) => {
      console.warn('[FEED] POST_CREATE_FAILED:', error.message);
      toast({ title: 'Erro ao publicar', description: error.message, variant: 'destructive' });
    },
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, checklist_items, attachments, ...rest }: Partial<Post> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...rest };
      
      if (checklist_items !== undefined) {
        updateData.checklist_items = checklist_items as unknown as Json;
      }
      if (attachments !== undefined) {
        updateData.attachments = attachments as unknown as Json;
      }

      const { data, error } = await supabase
        .from('internal_posts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['internal-posts'] });
      console.log(`[FEED] Post updated: ${data.id}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'FEED.POST_UPDATED',
          entity_kind: 'post',
          entity_id: data.id,
          source_module: 'core-feed',
        });
      }
    },
    onError: (error: Error) => {
      console.warn('[FEED] POST_UPDATE_FAILED:', error.message);
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('internal_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['internal-posts'] });
      toast({ title: 'Post eliminado' });
      console.log(`[FEED] Post deleted: ${id}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'FEED.POST_DELETED',
          entity_kind: 'post',
          entity_id: id,
          source_module: 'core-feed',
        });
      }
    },
    onError: (error: Error) => {
      console.warn('[FEED] POST_DELETE_FAILED:', error.message);
    },
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      const { error } = await supabase
        .from('internal_posts')
        .update({ is_pinned })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['internal-posts'] });
      console.log(`[FEED] Post ${variables.is_pinned ? 'pinned' : 'unpinned'}: ${variables.id}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'FEED.POST_PINNED',
          entity_kind: 'post',
          entity_id: variables.id,
          source_module: 'core-feed',
          payload: { is_pinned: variables.is_pinned },
        });
      }
    },
    onError: (error: Error) => {
      console.warn('[FEED] POST_PIN_FAILED:', error.message);
    },
  });

  const resolvePost = useMutation({
    mutationFn: async ({ id, is_resolved }: { id: string; is_resolved: boolean }) => {
      const { error } = await supabase
        .from('internal_posts')
        .update({
          is_resolved,
          resolved_at: is_resolved ? new Date().toISOString() : null,
          resolved_by: is_resolved ? user?.id : null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['internal-posts'] });
      console.log(`[FEED] Post ${variables.is_resolved ? 'resolved' : 'unresolved'}: ${variables.id}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'FEED.POST_RESOLVED',
          entity_kind: 'post',
          entity_id: variables.id,
          source_module: 'core-feed',
          payload: { is_resolved: variables.is_resolved },
        });
      }
    },
    onError: (error: Error) => {
      console.warn('[FEED] POST_RESOLVE_FAILED:', error.message);
    },
  });

  const addReaction = useMutation({
    mutationFn: async ({ post_id, reaction_type }: { post_id: string; reaction_type: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase.from('post_reactions').insert({
        post_id,
        user_id: user.id,
        reaction_type,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-posts'] });
    },
  });

  const removeReaction = useMutation({
    mutationFn: async ({ post_id, reaction_type }: { post_id: string; reaction_type: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', post_id)
        .eq('user_id', user.id)
        .eq('reaction_type', reaction_type);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-posts'] });
    },
  });

  const updateChecklist = useMutation({
    mutationFn: async ({ id, checklist_items }: { id: string; checklist_items: ChecklistItem[] }) => {
      const { error } = await supabase
        .from('internal_posts')
        .update({ checklist_items: checklist_items as unknown as Json })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-posts'] });
    },
  });

  return {
    posts: postsQuery.data || [],
    isLoading: postsQuery.isLoading,
    createPost,
    updatePost,
    deletePost,
    togglePin,
    resolvePost,
    addReaction,
    removeReaction,
    updateChecklist,
  };
}

export function usePostComments(postId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const commentsQuery = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      if (!postId) return [];

      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch reactions for each comment
      const commentsWithReactions = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: reactions } = await supabase
            .from('post_reactions')
            .select('*')
            .eq('comment_id', comment.id);

          const attachments = Array.isArray(comment.attachments)
            ? (comment.attachments as unknown as Attachment[])
            : [];

          return {
            ...comment,
            attachments,
            reactions: reactions || [],
          } as PostComment;
        })
      );

      // Organize into threads
      const rootComments = commentsWithReactions.filter((c) => !c.parent_comment_id);
      const replies = commentsWithReactions.filter((c) => c.parent_comment_id);

      return rootComments.map((comment) => ({
        ...comment,
        replies: replies.filter((r) => r.parent_comment_id === comment.id),
      }));
    },
    enabled: !!postId,
  });

  const addComment = useMutation({
    mutationFn: async ({
      content,
      parent_comment_id,
      attachments,
      mentions,
    }: {
      content: string;
      parent_comment_id?: string;
      attachments?: Attachment[];
      mentions?: string[];
    }) => {
      if (!postId || !user?.id) throw new Error('Missing context');

      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          content,
          parent_comment_id,
          attachments: (attachments || []) as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;

      // Create mentions if any
      if (mentions && mentions.length > 0) {
        await supabase.from('post_mentions').insert(
          mentions.map((userId) => ({
            comment_id: data.id,
            mentioned_user_id: userId,
            mentioned_by: user.id,
          }))
        );
      }

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['internal-posts'] });
      console.log(`[FEED] Comment created: ${data.id} on post ${postId}`);
      // Note: usePostComments doesn't have workspace context, emit with postId as correlation
      if (postId) {
        // We need workspace_id — get it from the query cache if available
        const posts = queryClient.getQueryData<Array<{ workspace_id: string }>>(['internal-posts']);
        const workspaceId = posts?.[0]?.workspace_id;
        if (workspaceId) {
          emitKernelEvent({
            workspace_id: workspaceId,
            type: 'FEED.COMMENT_CREATED',
            entity_kind: 'comment',
            entity_id: data.id,
            source_module: 'core-feed',
            payload: {
              post_id: postId,
              is_reply: !!variables.parent_comment_id,
            },
          });
        }
      }
    },
    onError: (error) => {
      console.warn('[FEED] COMMENT_CREATE_FAILED:', error.message);
      toast({ title: 'Erro ao comentar', description: error.message, variant: 'destructive' });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('post_comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['internal-posts'] });
      console.log(`[FEED] Comment deleted: ${id}`);
      if (postId) {
        const posts = queryClient.getQueryData<Array<{ workspace_id: string }>>(['internal-posts']);
        const workspaceId = posts?.[0]?.workspace_id;
        if (workspaceId) {
          emitKernelEvent({
            workspace_id: workspaceId,
            type: 'FEED.COMMENT_DELETED',
            entity_kind: 'comment',
            entity_id: id,
            source_module: 'core-feed',
            payload: { post_id: postId },
          });
        }
      }
    },
    onError: (error: Error) => {
      console.warn('[FEED] COMMENT_DELETE_FAILED:', error.message);
    },
  });

  const addCommentReaction = useMutation({
    mutationFn: async ({ comment_id, reaction_type }: { comment_id: string; reaction_type: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase.from('post_reactions').insert({
        comment_id,
        user_id: user.id,
        reaction_type,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
    },
  });

  return {
    comments: commentsQuery.data || [],
    isLoading: commentsQuery.isLoading,
    addComment,
    deleteComment,
    addCommentReaction,
  };
}

export function useMyMentions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mentionsQuery = useQuery({
    queryKey: ['my-mentions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('post_mentions')
        .select('*')
        .eq('mentioned_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PostMention[];
    },
    enabled: !!user?.id,
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('post_mentions')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['my-mentions'] });
      console.log(`[FEED] Mention marked as read: ${id}`);
    },
  });

  return {
    mentions: mentionsQuery.data || [],
    unreadCount: (mentionsQuery.data || []).filter((m) => !m.is_read).length,
    isLoading: mentionsQuery.isLoading,
    markAsRead,
  };
}
