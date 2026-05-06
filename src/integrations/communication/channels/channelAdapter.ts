import type { CommunicationChannelAdapter, CommunicationChannelType } from "./types";
import {
  whatsappChannelAdapter,
  emailChannelAdapter,
  instagramChannelAdapter,
  facebookChannelAdapter,
  websiteChatChannelAdapter,
  websiteFormChannelAdapter,
  phoneChannelAdapter,
  smsChannelAdapter,
  telegramChannelAdapter,
  manualChannelAdapter,
} from "./adapters";

const REGISTRY: Record<CommunicationChannelType, CommunicationChannelAdapter> = {
  whatsapp: whatsappChannelAdapter,
  email: emailChannelAdapter,
  instagram_dm: instagramChannelAdapter,
  facebook_messenger: facebookChannelAdapter,
  website_chat: websiteChatChannelAdapter,
  website_form: websiteFormChannelAdapter,
  phone: phoneChannelAdapter,
  sms: smsChannelAdapter,
  telegram: telegramChannelAdapter,
  manual: manualChannelAdapter,
};

export function getChannelAdapter(type: CommunicationChannelType): CommunicationChannelAdapter {
  return REGISTRY[type] ?? manualChannelAdapter;
}

export function listChannelAdapters(): CommunicationChannelAdapter[] {
  return Object.values(REGISTRY);
}
