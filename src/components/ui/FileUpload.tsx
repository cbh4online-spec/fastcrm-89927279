import { useCallback, useState } from "react";
import { useDropzone, type Accept } from "react-dropzone";
import imageCompression from "browser-image-compression";
import { cn } from "@/lib/utils";
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface UploadedFile {
  file: File;
  preview?: string;
}

interface FileUploadProps {
  accept?: Accept;
  maxFiles?: number;
  maxSizeMB?: number;
  onFilesChange: (files: UploadedFile[]) => void;
  className?: string;
  label?: string;
  description?: string;
  compressImages?: boolean;
  compressMaxSizeMB?: number;
  compressMaxWidthOrHeight?: number;
}

export function FileUpload({
  accept,
  maxFiles = 5,
  maxSizeMB = 10,
  onFilesChange,
  className,
  label = "Arraste ficheiros ou clique para selecionar",
  description,
  compressImages = true,
  compressMaxSizeMB = 1,
  compressMaxWidthOrHeight = 1920,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  const processFiles = useCallback(
    async (acceptedFiles: File[]) => {
      setIsCompressing(true);
      try {
        const processed: UploadedFile[] = [];

        for (const file of acceptedFiles) {
          let finalFile = file;

          // Compress images if enabled
          if (compressImages && file.type.startsWith("image/")) {
            try {
              finalFile = await imageCompression(file, {
                maxSizeMB: compressMaxSizeMB,
                maxWidthOrHeight: compressMaxWidthOrHeight,
                useWebWorker: true,
              });
            } catch {
              // Use original if compression fails
            }
          }

          const preview = finalFile.type.startsWith("image/")
            ? URL.createObjectURL(finalFile)
            : undefined;

          processed.push({ file: finalFile, preview });
        }

        const newFiles = [...files, ...processed].slice(0, maxFiles);
        setFiles(newFiles);
        onFilesChange(newFiles);
      } finally {
        setIsCompressing(false);
      }
    },
    [files, maxFiles, compressImages, compressMaxSizeMB, compressMaxWidthOrHeight, onFilesChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: processFiles,
    accept,
    maxFiles: maxFiles - files.length,
    maxSize: maxSizeMB * 1024 * 1024,
    onDropRejected: (rejections) => {
      rejections.forEach((r) => {
        r.errors.forEach((e) => toast.error(e.message));
      });
    },
  });

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    // Revoke preview URLs
    if (files[index]?.preview) URL.revokeObjectURL(files[index].preview!);
    setFiles(updated);
    onFilesChange(updated);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
        )}
      >
        <input {...getInputProps()} />
        {isCompressing ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
        )}
        <p className="text-sm text-muted-foreground text-center">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground/70 mt-1">{description}</p>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-md border p-2 bg-muted/30"
            >
              {f.preview ? (
                <img
                  src={f.preview}
                  alt={f.file.name}
                  className="h-10 w-10 rounded object-cover"
                />
              ) : (
                <FileText className="h-10 w-10 text-muted-foreground p-2" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{f.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(f.file.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => removeFile(i)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Image-only shorthand ── */

interface ImageUploadProps extends Omit<FileUploadProps, "accept"> {
  /** Accepted image MIME types */
  acceptTypes?: string[];
}

export function ImageUpload({
  acceptTypes = ["image/jpeg", "image/png", "image/webp"],
  label = "Arraste imagens ou clique para selecionar",
  ...rest
}: ImageUploadProps) {
  const accept: Accept = {};
  acceptTypes.forEach((t) => {
    accept[t] = [];
  });

  return <FileUpload accept={accept} label={label} {...rest} />;
}
