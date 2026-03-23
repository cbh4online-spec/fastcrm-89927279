export interface VoiceSettings {
  workspace_id: string;
  default_voice_id: string;
  default_voice_name: string;
  voice_stability: number;
  voice_similarity_boost: number;
  voice_style: number;
  voice_use_speaker_boost: boolean;
  agent_id?: string;
  proposal_narration_enabled: boolean;
  copilot_voice_enabled: boolean;
  voice_widget_enabled: boolean;
  total_tts_characters: number;
  total_conversation_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  preview_url?: string;
  labels?: Record<string, string>;
}

export interface TTSRequest {
  text: string;
  voice_id?: string;
  source_type: "proposal" | "summary" | "copilot" | "custom";
  source_id?: string;
  workspace_id: string;
  use_cache?: boolean;
}

export interface TTSResponse {
  audio_url: string;
  cached: boolean;
  duration_seconds?: number;
  cache_id?: string;
}

export interface ProposalNarrationToken {
  signed_url: string;
  voice_id: string;
  proposal_id: string;
  expires_at: string;
}

export interface ConversationConfig {
  agent_id: string;
  dynamic_variables?: Record<string, string>;
}

export type AudioPlayerState =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "error";

export interface AudioPlayerControls {
  state: AudioPlayerState;
  currentTime: number;
  duration: number;
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
}
