

# Email and Calendar Accounts — Attio-Style Personal Settings Section

## Reference Analysis

The Attio screenshot shows a **Personal-level** "Email and calendar accounts" section with:
- Connected accounts list (Google icon, email, "Default" badge, "In Sync" status, 3-dot menu)
- Two large CTA buttons: "Connect Google Account" and "Connect Microsoft Account"
- Forwarding address section with a separate email
- Watermark toggle ("Sent with Attio")

## Current State

The existing email connection system lives under **Settings > Channels** (workspace-level). It uses IMAP/SMTP with app passwords via `EmailChannelSettings.tsx`, `EmailConnectDialog.tsx`, and `EmailConnectionCard.tsx`. There is no personal-level email/calendar section in the sidebar.

## Proposed: Personal Email & Calendar Settings

A new **"Email & Calendar"** section under **Personal** in the settings sidebar, inspired by Attio but enhanced.

### Layout

```text
┌──────────────────────────────────────────────────────────────┐
│  Email & Calendar Accounts                                   │
│  Manage and sync your email and calendar accounts            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Connected accounts                                          │
│  We take your privacy very seriously. Read our Privacy Policy │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ 🔴 joao@gmail.com     [Default]     ✅ In Sync   ⋮ │    │
│  │    Email, Calendar                                    │    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ 🟣 info@empresa.com                ✅ In Sync   ⋮ │    │
│  │    Email                                              │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────┐  ┌──────────────────────────┐      │
│  │ G Connect Google    │  │ 🟦 Connect Microsoft    │      │
│  └─────────────────────┘  └──────────────────────────┘      │
│  ┌─────────────────────┐  ┌──────────────────────────┐      │
│  │ 📧 Connect IMAP     │  │ 🟣 Connect Hostinger   │      │
│  └─────────────────────┘  └──────────────────────────┘      │
│                                                              │
│  ─────────────────────────────────────────────────────────── │
│                                                              │
│  Email signature                                             │
│  Configure your default email signature                      │
│                                                              │
│  [Rich text signature editor / toggle]                       │
│                                                              │
│  ─────────────────────────────────────────────────────────── │
│                                                              │
│  FastCRM watermark                                           │
│  Add "Sent with FastCRM" to the end of         [Toggle]      │
│  emails sent from this platform                              │
│                                                              │
│  ─────────────────────────────────────────────────────────── │
│                                                              │
│  Default sending account                                     │
│  Choose which account is used when composing    [Select ▼]   │
│  new emails                                                  │
└──────────────────────────────────────────────────────────────┘
```

### Enhancements Over Attio

1. **Four connect options** — Google, Microsoft, Hostinger, and Custom IMAP (Attio only has Google + Microsoft)
2. **Default account selector** — Dropdown to pick which account sends new emails by default
3. **Email signature** — Inline signature editor (Attio has none in this section)
4. **FastCRM watermark toggle** — Like Attio's watermark, but for FastCRM branding
5. **Attio-style connection cards** — Clean inline rows with provider icon, email, badges (Default, In Sync/Error), and 3-dot menu (Set as default, Disconnect, Settings)
6. **i18n from day one** — All strings translated in PT, EN, ES, FR
7. **Reuses existing hook** — `useEmailConnections` already provides all the data; the new component just presents it differently

### File Plan

| File | Action |
|---|---|
| `src/components/settings/sections/EmailCalendarSettings.tsx` | **NEW** — Main section component with connected accounts list, connect buttons, signature, watermark toggle, default account selector |
| `src/components/settings/sections/EmailAccountRow.tsx` | **NEW** — Single connected account row (provider icon, email, Default badge, sync status badge, 3-dot menu with Set Default / Disconnect / Settings) |
| `src/components/settings/SettingsNavigation.tsx` | **EDIT** — Add `"emailCalendar"` nav item under Personal group (after Profile, before Appearance) with `Mail` icon |
| `src/pages/Settings.tsx` | **EDIT** — Add `"emailCalendar"` case in `renderContent()` and `categoryMeta`, import new component |
| `src/i18n/locales/pt/settings.json` | **EDIT** — Add ~25 new keys for email & calendar section |
| `src/i18n/locales/en/settings.json` | **EDIT** — Same keys in English |
| `src/i18n/locales/es/settings.json` | **EDIT** — Same keys in Spanish |
| `src/i18n/locales/fr/settings.json` | **EDIT** — Same keys in French |
| `src/components/settings/settingsSearchData.ts` | **EDIT** — Add searchable entries for the new section |

### New i18n Keys (~25)

```
emailCalendar_title, emailCalendar_description,
emailCalendar_connectedAccounts, emailCalendar_privacyNotice,
emailCalendar_connectGoogle, emailCalendar_connectMicrosoft,
emailCalendar_connectIMAP, emailCalendar_connectHostinger,
emailCalendar_default, emailCalendar_inSync, emailCalendar_error,
emailCalendar_pending, emailCalendar_syncing,
emailCalendar_setDefault, emailCalendar_disconnect, emailCalendar_settings,
emailCalendar_emailCalendar, emailCalendar_emailOnly,
emailCalendar_signature, emailCalendar_signatureDesc,
emailCalendar_watermark, emailCalendar_watermarkDesc,
emailCalendar_defaultAccount, emailCalendar_defaultAccountDesc,
emailCalendar_noAccounts, emailCalendar_noAccountsDesc
```

### Component Details

**EmailAccountRow** — Compact row (not a card) matching Attio's clean style:
- Left: Provider icon (Google colored G, Microsoft logo, Hostinger purple, IMAP gray) + email address + capabilities ("Email, Calendar" or "Email")
- Center: `[Default]` badge if is_default
- Right: Green "In Sync" / Yellow "Syncing" / Red "Error" status + 3-dot dropdown (Set as Default, Open Settings, Disconnect)

**EmailCalendarSettings** — Composed of:
1. Header with title + description
2. Privacy notice text
3. List of `EmailAccountRow` components
4. Grid of 4 connect buttons (reuses existing `EmailConnectDialog`)
5. Separator + Email signature section (textarea or rich text)
6. Separator + Watermark toggle
7. Separator + Default account select dropdown

### Technical Notes

- The existing `useEmailConnections()` hook already returns all connections for the workspace. No new queries needed.
- The connect flow reuses the existing `EmailConnectDialog` component.
- The "Set as Default" action can use `useUpdateEmail` with a new `is_default` field, or simply store the default connection ID in user metadata via `supabase.auth.updateUser()`.
- No new database tables needed — the `email_connections` table already has all required fields.
- The "Calendar" connect is future-ready (Google Calendar API integration) — for now the buttons are present but calendar sync shows as "Coming soon".

