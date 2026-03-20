import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { collectBugReportContext } from "@/utils/bug-report-context";
import { captureScreenshot, blobToFile } from "@/utils/capture-screenshot";

export type BugReportCategory = "bug" | "question" | "suggestion" | "performance" | "other";
export type BugReportPriority = "low" | "normal" | "high" | "critical";
export type BugReportStatus = "open" | "in_review" | "resolved" | "closed" | "duplicate";

export interface BugReportForm {
  title: string;
  description: string;
  category: BugReportCategory;
  priority: BugReportPriority;
}

export interface BugReport {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: BugReportCategory;
  priority: BugReportPriority;
  status: BugReportStatus;
  route: string | null;
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
  screen_width: number | null;
  screen_height: number | null;
  viewport_width: number | null;
  viewport_height: number | null;
  user_agent: string | null;
  screenshot_url: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  admin_notes: string | null;
  user_email: string | null;
  user_name: string | null;
  workspace_id: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useBugReport() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const captureScreen = async () => {
    setIsCapturing(true);
    setCaptureError(null);
    const result = await captureScreenshot();
    if (result.success) {
      setScreenshotDataUrl(result.dataUrl);
      setScreenshotBlob(result.blob);
    } else if (!result.success) {
      setCaptureError(result.error);
    }
    setIsCapturing(false);
  };

  const clearScreenshot = () => {
    setScreenshotDataUrl(null);
    setScreenshotBlob(null);
  };

  const clearAttachment = () => setAttachmentFile(null);

  const setAttachment = (file: File | null) => {
    if (!file) { setAttachmentFile(null); return null; }
    if (file.size > 5 * 1024 * 1024) return "Ficheiro demasiado grande (máx 5MB)";
    setAttachmentFile(file);
    return null;
  };

  const submit = useMutation({
    mutationFn: async (form: BugReportForm) => {
      const ctx = collectBugReportContext(location.pathname);
      let screenshotUrl: string | null = null;
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;
      let attachmentSize: number | null = null;
      const timestamp = Date.now();
      const userId = user?.id ?? "anon";

      // Upload screenshot (fire-and-forget on error)
      if (screenshotBlob) {
        try {
          const file = blobToFile(screenshotBlob, `screenshot-${timestamp}.png`);
          const path = `${userId}/screenshots/${timestamp}.png`;
          const { error } = await supabase.storage
            .from("bug-report-assets")
            .upload(path, file, { cacheControl: "3600", upsert: false });
          if (!error) {
            const { data } = supabase.storage.from("bug-report-assets").getPublicUrl(path);
            screenshotUrl = data.publicUrl;
          } else {
            console.warn("Screenshot upload failed:", error);
          }
        } catch (e) {
          console.warn("Screenshot upload error:", e);
        }
      }

      // Upload attachment (fire-and-forget on error)
      if (attachmentFile) {
        try {
          const ext = attachmentFile.name.split(".").pop();
          const path = `${userId}/attachments/${timestamp}.${ext}`;
          const { error } = await supabase.storage
            .from("bug-report-assets")
            .upload(path, attachmentFile, { cacheControl: "3600", upsert: false });
          if (!error) {
            const { data } = supabase.storage.from("bug-report-assets").getPublicUrl(path);
            attachmentUrl = data.publicUrl;
            attachmentName = attachmentFile.name;
            attachmentSize = attachmentFile.size;
          } else {
            console.warn("Attachment upload failed:", error);
          }
        } catch (e) {
          console.warn("Attachment upload error:", e);
        }
      }

      const { data, error } = await (supabase.from("bug_reports") as any)
        .insert({
          workspace_id: currentWorkspace?.id ?? null,
          user_id: user?.id ?? null,
          user_email: user?.email ?? null,
          user_name: (user as any)?.user_metadata?.full_name ?? null,
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          priority: form.priority,
          route: ctx.route,
          browser_name: ctx.browserName,
          browser_version: ctx.browserVersion,
          os_name: ctx.osName,
          os_version: ctx.osVersion,
          screen_width: ctx.screenWidth,
          screen_height: ctx.screenHeight,
          viewport_width: ctx.viewportWidth,
          viewport_height: ctx.viewportHeight,
          user_agent: ctx.userAgent,
          app_version: ctx.appVersion,
          screenshot_url: screenshotUrl,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
          attachment_size: attachmentSize,
        })
        .select("ticket_number")
        .single();

      if (error) throw error;
      return data.ticket_number as string;
    },
    onSuccess: () => {
      clearScreenshot();
      setAttachmentFile(null);
      queryClient.invalidateQueries({ queryKey: ["bug_reports"] });
    },
  });

  return {
    screenshotDataUrl,
    isCapturing,
    captureError,
    captureScreen,
    clearScreenshot,
    attachmentFile,
    setAttachment,
    clearAttachment,
    submit,
    isSubmitting: submit.isPending,
    ticketNumber: submit.data,
    submitError: submit.error,
    reset: () => {
      submit.reset();
      clearScreenshot();
      setAttachmentFile(null);
    },
  };
}

// ── ADMIN HOOK ──────────────────────────────────────────────
export function useBugReportsAdmin(filters: {
  status?: string;
  category?: string;
  search?: string;
} = {}) {
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["bug_reports", filters],
    queryFn: async () => {
      let query = (supabase.from("bug_reports") as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
      }
      if (filters.search?.trim()) {
        query = query.or(
          `title.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%,user_email.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data as BugReport[];
    },
  });

  const updateReport = useMutation({
    mutationFn: async ({
      id,
      status,
      adminNotes,
    }: {
      id: string;
      status?: BugReportStatus;
      adminNotes?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (status) updates.status = status;
      if (adminNotes !== undefined) updates.admin_notes = adminNotes;
      if (status === "resolved" || status === "closed") {
        updates.resolved_at = new Date().toISOString();
      }
      const { error } = await (supabase.from("bug_reports") as any)
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bug_reports"] });
    },
  });

  const counts = {
    total: reports.length,
    open: reports.filter((r) => r.status === "open").length,
    in_review: reports.filter((r) => r.status === "in_review").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
  };

  return { reports, isLoading, updateReport, counts };
}
