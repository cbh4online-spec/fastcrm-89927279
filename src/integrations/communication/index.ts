/**
 * FastCRM Omnichannel Command Center — Public API.
 *
 * Esta camada generaliza o que já existe em src/integrations/whatsapp para todos os canais,
 * sem duplicar tabelas ou lógica. WhatsApp é um channel adapter dentro do registo.
 */

export type {
  CommunicationChannelType,
  CommunicationChannelStatus,
  CommunicationDirection,
  CommunicationMessageType,
  CommunicationChannelAdapter,
  ChannelCapabilities,
  OutgoingMessage,
  IncomingMessage,
  IncomingStatus,
  SendResult,
  ConnectionTestResult,
} from "./channels/types";

export { getChannelAdapter, listChannelAdapters } from "./channels/channelAdapter";
export { createPlaceholderAdapter } from "./channels/createPlaceholderAdapter";

export {
  CHANNEL_LABELS,
  CHANNEL_SHORT_LABELS,
  channelLabel,
  channelShortLabel,
} from "./utils/channelLabels";
export {
  CHANNEL_ICONS,
  CHANNEL_BADGE_CLASSES,
  channelIcon,
  channelBadgeClass,
} from "./utils/channelIcons";
export {
  resolveChannelAccess,
  canReply,
  canManage,
  canConfigureChannel,
} from "./utils/channelPermissions";
export type {
  ChannelAccessLevel,
  WorkspaceRole,
} from "./utils/channelPermissions";
