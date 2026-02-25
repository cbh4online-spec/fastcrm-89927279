import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const MAX_SIZE = 524_288_000; // 500MB
const ALLOWED_TYPES = [
  "audio/mpeg", "audio/wav", "audio/webm", "audio/ogg", "audio/mp4",
  "video/mp4", "video/webm", "video/quicktime",
];

export interface CrmLink {
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
}

export function useRecordingUpload(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}`;
    }
    if (file.size > MAX_SIZE) {
      return `File too large. Maximum: ${Math.round(MAX_SIZE / 1024 / 1024)}MB`;
    }
    return null;
  }, []);

  const uploadRecording = useCallback(
    async (meetingId: string, file: File): Promise<{ recordingId: string; crmLinks: CrmLink[] } | null> => {
      if (!workspaceId) {
        toast.error("No workspace selected");
        return null;
      }

      const validationError = validateFile(file);
      if (validationError) {
        toast.error(validationError);
        return null;
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        // 1. Request presigned URL from edge function
        setUploadProgress(5);
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        if (!token) {
          toast.error("Authentication required");
          return null;
        }

        const { data, error } = await supabase.functions.invoke("recording-upload", {
          body: {
            meeting_id: meetingId,
            filename: file.name,
            content_type: file.type,
            size_bytes: file.size,
          },
          headers: {
            "X-Workspace-Id": workspaceId,
          },
        });

        if (error || !data?.success) {
          const msg = data?.message || error?.message || "Failed to initiate upload";
          toast.error(msg);
          return null;
        }

        const { recording_id, signed_upload_url, crm_links } = data.data;

        // 2. PUT file directly to storage
        setUploadProgress(15);

        const xhr = new XMLHttpRequest();
        const uploadPromise = new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const pct = 15 + Math.round((e.loaded / e.total) * 75);
              setUploadProgress(pct);
            }
          });
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });
          xhr.addEventListener("error", () => reject(new Error("Upload failed")));
          xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));
        });

        xhr.open("PUT", signed_upload_url);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);

        await uploadPromise;

        // 3. Confirm upload status
        setUploadProgress(95);
        await supabase
          .from("meeting_recordings" as any)
          .update({ status: "uploaded", updated_at: new Date().toISOString() } as any)
          .eq("id", recording_id);

        setUploadProgress(100);

        // 4. Invalidate queries
        queryClient.invalidateQueries({ queryKey: ["meeting-recording"] });

        toast.success("Recording uploaded successfully");
        return { recordingId: recording_id, crmLinks: crm_links || [] };
      } catch (err: any) {
        console.error("Upload error:", err);
        toast.error(err?.message || "Upload failed");
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [workspaceId, validateFile, queryClient]
  );

  return {
    uploadRecording,
    isUploading,
    uploadProgress,
    validateFile,
  };
}
