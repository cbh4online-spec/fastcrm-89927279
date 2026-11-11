# Edge function rules

- WAScript: token server-only; labels/notes/raw samples only via `wascript-manage` actions (member + audit); `wascript-webhook` never triggers bots (no loops).
- Z-API voice: only human click-to-call via `whatsapp-zapi-call` (ephemeral `/call-token` server-side, opt-out/consent + limits in `_shared/zapiCallRules.ts`, start/end logged in `activity_logs`); automated `send-call` audio is never exposed, because robocalls get numbers banned.
