/// <reference types="vite/client" />

// Augment the global Window interface with browser-specific and custom properties

interface FastCRMVisitor {
  trackEvent: (event: string) => void;
  getScore: () => number;
}

declare global {
  interface Window {
    /** Web Speech API — not in standard TS lib, vendor-prefixed in some browsers */
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
    /** FastCRM visitor tracking object injected by StoreVisitorTracker */
    __fastcrm_visitor?: FastCRMVisitor;
  }
}

export {};
