import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// PT
import ptCommon from './locales/pt/common.json';
import ptNav from './locales/pt/nav.json';
import ptDashboard from './locales/pt/dashboard.json';
import ptCrm from './locales/pt/crm.json';
import ptSettings from './locales/pt/settings.json';
import ptLanding from './locales/pt/landing.json';
import ptInbox from './locales/pt/inbox.json';
import ptAutomations from './locales/pt/automations.json';
import ptIntelligence from './locales/pt/intelligence.json';
import ptInvoices from './locales/pt/invoices.json';
import ptProducts from './locales/pt/products.json';
import ptAuth from './locales/pt/auth.json';
import ptReports from './locales/pt/reports.json';

// EN
import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enDashboard from './locales/en/dashboard.json';
import enCrm from './locales/en/crm.json';
import enSettings from './locales/en/settings.json';
import enLanding from './locales/en/landing.json';
import enInbox from './locales/en/inbox.json';
import enAutomations from './locales/en/automations.json';
import enIntelligence from './locales/en/intelligence.json';
import enInvoices from './locales/en/invoices.json';
import enProducts from './locales/en/products.json';
import enAuth from './locales/en/auth.json';
import enReports from './locales/en/reports.json';

// ES
import esCommon from './locales/es/common.json';
import esNav from './locales/es/nav.json';
import esDashboard from './locales/es/dashboard.json';
import esCrm from './locales/es/crm.json';
import esSettings from './locales/es/settings.json';
import esLanding from './locales/es/landing.json';
import esInbox from './locales/es/inbox.json';
import esAutomations from './locales/es/automations.json';
import esIntelligence from './locales/es/intelligence.json';
import esInvoices from './locales/es/invoices.json';
import esProducts from './locales/es/products.json';
import esAuth from './locales/es/auth.json';
import esReports from './locales/es/reports.json';

// FR
import frCommon from './locales/fr/common.json';
import frNav from './locales/fr/nav.json';
import frDashboard from './locales/fr/dashboard.json';
import frCrm from './locales/fr/crm.json';
import frSettings from './locales/fr/settings.json';
import frLanding from './locales/fr/landing.json';
import frInbox from './locales/fr/inbox.json';
import frAutomations from './locales/fr/automations.json';
import frIntelligence from './locales/fr/intelligence.json';
import frInvoices from './locales/fr/invoices.json';
import frProducts from './locales/fr/products.json';
import frAuth from './locales/fr/auth.json';
import frReports from './locales/fr/reports.json';

export const supportedLanguages = [
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'pt',
    supportedLngs: ['pt', 'en', 'es', 'fr'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    ns: ['common', 'nav', 'dashboard', 'crm', 'settings', 'landing', 'inbox', 'automations', 'intelligence', 'invoices', 'products', 'auth', 'reports'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    resources: {
      pt: {
        common: ptCommon, nav: ptNav, dashboard: ptDashboard, crm: ptCrm,
        settings: ptSettings, landing: ptLanding, inbox: ptInbox,
        automations: ptAutomations, intelligence: ptIntelligence,
        invoices: ptInvoices, products: ptProducts, auth: ptAuth, reports: ptReports,
      },
      en: {
        common: enCommon, nav: enNav, dashboard: enDashboard, crm: enCrm,
        settings: enSettings, landing: enLanding, inbox: enInbox,
        automations: enAutomations, intelligence: enIntelligence,
        invoices: enInvoices, products: enProducts, auth: enAuth, reports: enReports,
      },
      es: {
        common: esCommon, nav: esNav, dashboard: esDashboard, crm: esCrm,
        settings: esSettings, landing: esLanding, inbox: esInbox,
        automations: esAutomations, intelligence: esIntelligence,
        invoices: esInvoices, products: esProducts, auth: esAuth, reports: esReports,
      },
      fr: {
        common: frCommon, nav: frNav, dashboard: frDashboard, crm: frCrm,
        settings: frSettings, landing: frLanding, inbox: frInbox,
        automations: frAutomations, intelligence: frIntelligence,
        invoices: frInvoices, products: frProducts, auth: frAuth, reports: frReports,
      },
    },
  });

export default i18n;
