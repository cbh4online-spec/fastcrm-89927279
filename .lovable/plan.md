

# Plan: Add Emoji/Icon Picker to View Rename Dialog

## Overview

Add an emoji/icon picker alongside the rename input so users can customize the view's icon. This applies to both the inline rename in `DealsSidebar.tsx` and the dialog rename in `ViewSettingsDropdown.tsx`.

## Current State

- `SavedView` already has an `icon: string | null` field stored in the database
- The sidebar already renders `view.icon` as a text emoji when present (line 567)
- `useUpdateSavedView` already supports updating `icon` in the `updates` partial
- Rename in `DealsSidebar` is an inline input (lines 605-624) — callback is `onRename(newName: string)`
- Rename in `ViewSettingsDropdown` is a Dialog with input (lines 94-112)

## Implementation Steps

### 1. Create `EmojiIconPicker` component — NEW `src/components/opportunities/EmojiIconPicker.tsx`

A small Popover-based picker with:
- A grid of common emojis organized by category (Objects, Faces, Nature, Symbols — ~60 emojis total)
- A "Remove" option to clear the icon back to the default colored dot
- Trigger is the current icon (emoji or colored dot) rendered as a clickable button
- Static emoji list embedded in the component (no external dependency needed)

Categories and emojis:
- **Objects**: 📋 📊 📈 💼 🎯 ⭐ 💡 🔔 📌 🏷️ 📁 📂 💰 🏆 🎨
- **People**: 👥 👤 🤝 💪 🙌 👋 ✋ 🫂
- **Status**: ✅ ❌ ⚡ 🔥 ❄️ 🚀 ⏰ 🔒 🔓
- **Shapes**: 🔴 🟢 🔵 🟡 🟣 ⬛ 🔶 🔷

### 2. Update inline rename in `DealsSidebar.tsx` ViewItem (lines 605-624)

- Change `onRename` callback signature to `onRename: (newName: string, icon?: string | null) => void`
- Add local `newIcon` state initialized from `view.icon`
- Place `EmojiIconPicker` to the left of the name input
- On submit, pass both `newName` and `newIcon`

### 3. Update rename dialog in `ViewSettingsDropdown.tsx` (lines 94-112)

- Add `newIcon` state initialized from `activeView.icon`
- Place `EmojiIconPicker` to the left of the name input inside the Dialog
- Update `onRename` prop signature to include icon: `onRename?: (id: string, newName: string, icon?: string | null) => void`
- Pass icon in `handleRenameSubmit`

### 4. Update parent callbacks in `DealsSidebar.tsx` (view mapping, ~line 272-290)

- Update the `onRename` handler to call `updateView.mutate` with both `name` and `icon` in the `updates` object

## Component Design — `EmojiIconPicker`

```text
┌──────────────────────────┐
│ [Current Icon ▾]         │  ← Popover trigger (button)
├──────────────────────────┤
│ Objects                  │
│ 📋 📊 📈 💼 🎯 ⭐ 💡 🔔 │
│ People                   │
│ 👥 👤 🤝 💪 🙌          │
│ Status                   │
│ ✅ ❌ ⚡ 🔥 🚀 ⏰       │
│ Shapes                   │
│ 🔴 🟢 🔵 🟡 🟣          │
├──────────────────────────┤
│ [✕ Remove icon]          │
└──────────────────────────┘
```

Props: `currentIcon: string | null`, `viewName: string` (for fallback dot color), `onSelect: (icon: string | null) => void`

## Files Changed

| File | Change |
|------|--------|
| `src/components/opportunities/EmojiIconPicker.tsx` | NEW — Popover emoji grid picker |
| `src/components/opportunities/DealsSidebar.tsx` | Update `onRename` signature, add icon state to inline rename, wire `EmojiIconPicker` |
| `src/components/opportunities/ViewSettingsDropdown.tsx` | Add icon state + `EmojiIconPicker` to rename dialog, update callback signature |

## Technical Notes

- No new dependencies — uses existing `@radix-ui/react-popover` and native emoji characters
- The `icon` column is already `text | null` in the database, so any emoji string works
- `useUpdateSavedView` already handles `icon` in the updates partial — no hook changes needed

