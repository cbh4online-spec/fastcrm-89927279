import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  StickyNote,
  Mic,
  MicOff,
  Paperclip,
  Send,
  Trash2,
  Pin,
  PinOff,
  Play,
  Pause,
  FileText,
  Image as ImageIcon,
  File,
  X,
  Loader2,
  AudioLines,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface EntityNote {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  content: string | null;
  note_type: "text" | "voice";
  audio_url: string | null;
  audio_duration_seconds: number | null;
  transcription: string | null;
  attachments: Attachment[];
  is_pinned: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface NotesSectionProps {
  entityType: "lead" | "contact" | "company" | "opportunity";
  entityId: string;
  entityName: string;
}

export function NotesSection({ entityType, entityId, entityName }: NotesSectionProps) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [newNote, setNewNote] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Fetch notes
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["entity-notes", entityType, entityId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      
      const { data, error } = await supabase
        .from("entity_notes")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId as unknown as string)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as EntityNote[];
    },
    enabled: !!currentWorkspace?.id && !!entityId,
  });

  // Create note mutation
  const createNote = useMutation({
    mutationFn: async (noteData: {
      content?: string;
      note_type: "text" | "voice";
      audio_url?: string;
      audio_duration_seconds?: number;
      attachments?: Attachment[];
    }) => {
      if (!currentWorkspace?.id || !user?.id) throw new Error("Missing data");

      const { data, error } = await supabase
        .from("entity_notes")
        .insert([{
          workspace_id: currentWorkspace.id,
          entity_type: entityType,
          entity_id: entityId,
          content: noteData.content || null,
          note_type: noteData.note_type,
          audio_url: noteData.audio_url || null,
          audio_duration_seconds: noteData.audio_duration_seconds || null,
          attachments: JSON.stringify(noteData.attachments || []),
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-notes", entityType, entityId] });
      setNewNote("");
      setPendingAttachments([]);
      toast.success("Nota criada com sucesso");
    },
    onError: () => {
      toast.error("Erro ao criar nota");
    },
  });

  // Delete note mutation
  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from("entity_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-notes", entityType, entityId] });
      toast.success("Nota eliminada");
    },
    onError: () => {
      toast.error("Erro ao eliminar nota");
    },
  });

  // Toggle pin mutation
  const togglePin = useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from("entity_notes")
        .update({ is_pinned: !isPinned })
        .eq("id", noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-notes", entityType, entityId] });
    },
  });

  // Handle file upload
  const uploadFile = async (file: File): Promise<Attachment> => {
    const filePath = `${currentWorkspace?.id}/${entityType}/${entityId}/${Date.now()}_${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from("note-attachments")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("note-attachments")
      .getPublicUrl(filePath);

    return {
      id: crypto.randomUUID(),
      name: file.name,
      url: urlData.publicUrl,
      type: file.type,
      size: file.size,
    };
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!newNote.trim() && pendingAttachments.length === 0) return;

    setIsSubmitting(true);
    try {
      // Upload attachments
      const uploadedAttachments: Attachment[] = [];
      for (const file of pendingAttachments) {
        const attachment = await uploadFile(file);
        uploadedAttachments.push(attachment);
      }

      await createNote.mutateAsync({
        content: newNote.trim() || undefined,
        note_type: "text",
        attachments: uploadedAttachments,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        
        // Upload audio
        try {
          const filePath = `${currentWorkspace?.id}/${entityType}/${entityId}/voice_${Date.now()}.webm`;
          
          const { error: uploadError } = await supabase.storage
            .from("note-attachments")
            .upload(filePath, audioBlob);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from("note-attachments")
            .getPublicUrl(filePath);

          await createNote.mutateAsync({
            note_type: "voice",
            audio_url: urlData.publicUrl,
            audio_duration_seconds: recordingTime,
          });
        } catch {
          toast.error("Erro ao guardar nota de voz");
        }
        
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      toast.error("Não foi possível aceder ao microfone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  // Audio playback
  const toggleAudioPlayback = (noteId: string, audioUrl: string) => {
    if (playingAudioId === noteId) {
      audioRefs.current[noteId]?.pause();
      setPlayingAudioId(null);
    } else {
      // Pause any currently playing audio
      if (playingAudioId && audioRefs.current[playingAudioId]) {
        audioRefs.current[playingAudioId].pause();
      }
      
      if (!audioRefs.current[noteId]) {
        audioRefs.current[noteId] = new Audio(audioUrl);
        audioRefs.current[noteId].onended = () => setPlayingAudioId(null);
      }
      
      audioRefs.current[noteId].play();
      setPlayingAudioId(noteId);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
    if (type.includes("pdf")) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Create Note Card */}
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
        <CardHeader className="pb-3 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent">
          <CardTitle className="text-base font-semibold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <StickyNote className="w-4 h-4" />
            </div>
            Notas
          </CardTitle>
          <CardDescription>
            Adicione notas, gravações de voz e anexos sobre {entityName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Text input */}
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Escreva uma nota..."
            className="min-h-[100px] resize-none"
          />

          {/* Pending attachments */}
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pendingAttachments.map((file, index) => (
                <Badge key={index} variant="secondary" className="gap-2 py-1.5">
                  {getFileIcon(file.type)}
                  <span className="max-w-32 truncate">{file.name}</span>
                  <button
                    onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== index))}
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-medium">A gravar... {formatDuration(recordingTime)}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Voice recording */}
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="sm"
                onClick={isRecording ? stopRecording : startRecording}
                className="gap-2"
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    Parar
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Voz
                  </>
                )}
              </Button>

              {/* Attachment button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Paperclip className="w-4 h-4" />
                Anexar
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setPendingAttachments((prev) => [...prev, ...files]);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (!newNote.trim() && pendingAttachments.length === 0)}
              className="gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Histórico de Notas
            </CardTitle>
            <Badge variant="secondary">{notes.length} notas</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-12">
              <StickyNote className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Sem notas ainda</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Adicione notas escritas, de voz ou anexos acima
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={cn(
                      "p-4 rounded-lg border transition-colors",
                      note.is_pinned
                        ? "bg-primary/5 border-primary/20"
                        : "bg-muted/30 border-border/50 hover:border-border"
                    )}
                  >
                    {/* Note header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {note.note_type === "voice" ? (
                          <Badge variant="secondary" className="gap-1">
                            <AudioLines className="w-3 h-3" />
                            Voz
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <FileText className="w-3 h-3" />
                            Texto
                          </Badge>
                        )}
                        {note.is_pinned && (
                          <Badge variant="default" className="gap-1 bg-primary/80">
                            <Pin className="w-3 h-3" />
                            Fixada
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => togglePin.mutate({ noteId: note.id, isPinned: note.is_pinned })}
                        >
                          {note.is_pinned ? (
                            <PinOff className="w-3.5 h-3.5" />
                          ) : (
                            <Pin className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar Nota</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem a certeza que deseja eliminar esta nota? Esta ação não pode ser revertida.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteNote.mutate(note.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {/* Voice player */}
                    {note.note_type === "voice" && note.audio_url && (
                      <div className="flex items-center gap-3 p-3 rounded-md bg-background/50 mb-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-full"
                          onClick={() => toggleAudioPlayback(note.id, note.audio_url!)}
                        >
                          {playingAudioId === note.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4 ml-0.5" />
                          )}
                        </Button>
                        <div className="flex-1">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full w-1/3 bg-primary/50 rounded-full" />
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {note.audio_duration_seconds
                            ? formatDuration(note.audio_duration_seconds)
                            : "0:00"}
                        </span>
                      </div>
                    )}

                    {/* Text content */}
                    {note.content && (
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    )}

                    {/* Attachments */}
                    {note.attachments && note.attachments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {note.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background/50 border border-border/50 hover:border-primary/50 transition-colors text-sm"
                          >
                            {getFileIcon(attachment.type)}
                            <span className="max-w-32 truncate">{attachment.name}</span>
                            <span className="text-muted-foreground text-xs">
                              ({formatFileSize(attachment.size)})
                            </span>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-muted-foreground mt-3">
                      {format(new Date(note.created_at), "d 'de' MMMM 'às' HH:mm", { locale: pt })}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}