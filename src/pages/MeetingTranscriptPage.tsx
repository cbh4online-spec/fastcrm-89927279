import { useParams, useNavigate } from "react-router-dom";
import { TranscriptViewer } from "@/components/meetings/TranscriptViewer";

export default function MeetingTranscriptPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();

  if (!meetingId) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <TranscriptViewer
        meetingId={meetingId}
        onBack={() => navigate(-1)}
      />
    </div>
  );
}
