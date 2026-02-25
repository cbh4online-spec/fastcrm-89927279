import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Upload, FileAudio, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useRecordingUpload, CrmLink } from "@/hooks/useRecordingUpload";
import { RecordingCrmLinks } from "./RecordingCrmLinks";

interface Props {
  meetingId: string;
  workspaceId: string | undefined;
  onUploaded?: (recordingId: string) => void;
}

export function RecordingUploadCard({ meetingId, workspaceId, onUploaded }: Props) {
  const { t } = useTranslation("meetings");
  const { uploadRecording, isUploading, uploadProgress, validateFile } = useRecordingUpload(workspaceId);
  const [isDragging, setIsDragging] = useState(false);
  const [crmLinks, setCrmLinks] = useState<CrmLink[]>([]);
  const [uploadDone, setUploadDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const result = await uploadRecording(meetingId, file);
    if (result) {
      setCrmLinks(result.crmLinks);
      setUploadDone(true);
      onUploaded?.(result.recordingId);
    }
  }, [meetingId, uploadRecording, onUploaded]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  if (uploadDone) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <CheckCircle2 className="h-4 w-4" />
          {t("recording_uploadSuccess")}
        </div>
        <RecordingCrmLinks links={crmLinks} />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">{t("recording_upload")}</p>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/20 hover:border-primary/50",
          isUploading && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*"
          className="hidden"
          onChange={onFileChange}
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="space-y-3">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t("recording_uploading")}</p>
            <Progress value={uploadProgress} className="max-w-xs mx-auto" />
            <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-3">
              <div className="rounded-full p-3 bg-muted">
                {isDragging ? (
                  <FileAudio className="h-6 w-6 text-primary" />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
            </div>
            <p className="text-sm font-medium text-foreground">{t("recording_dropzone")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("recording_dropzoneHint")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("recording_maxSize")}</p>
          </>
        )}
      </div>
    </div>
  );
}
