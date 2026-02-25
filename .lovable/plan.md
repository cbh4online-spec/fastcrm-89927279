

# Make EntityDetailsPanel Fields Editable

## Problem

The right-side "Detalhes" panel (`EntityDetailsPanel`) currently renders all fields as read-only text using `FieldRow`. Users cannot edit Email, Telefone, Fonte, Empresa, LinkedIn, or Instagram directly from this panel.

## Solution

Add an `onUpdate` callback prop to `EntityDetailsPanel` and replace `FieldRow` with `EditableFieldRow` — a new inline component that uses click-to-edit behavior (similar to `InlineFieldEditor`). When a user clicks on a field value (or the "—" placeholder), it becomes an input. On blur/Enter it saves; on Escape it cancels.

## Architecture

```text
EntityDetailsPanel
  props: + onUpdate?: (field: string, value: string) => void
  │
  ├─ LeadDetails    → receives onUpdate
  │   ├─ EditableFieldRow "email"      → onSave → onUpdate('email', val)
  │   ├─ EditableFieldRow "phone"      → onUpdate('phone', val)
  │   ├─ EditableFieldRow "source"     → onUpdate('source', val)
  │   ├─ EditableFieldRow "company"    → onUpdate('company', val)
  │   ├─ EditableFieldRow "linkedin_url" → onUpdate('linkedin_url', val)
  │   └─ EditableFieldRow "instagram_url" → onUpdate('instagram_url', val)
  │
  ├─ ContactDetails → receives onUpdate (same pattern)
  └─ CompanyDetails → receives onUpdate (same pattern)
```

## Changes

### 1. `src/components/entity/EntityDetailsPanel.tsx`

- Add `onUpdate?: (field: string, value: unknown) => void` to `EntityDetailsPanelProps`
- Create `EditableFieldRow` component inside the file: displays value normally, on click switches to an `<input>`, commits on blur/Enter, cancels on Escape. For link fields, shows value as link when not editing but still allows click-to-edit via a pencil icon.
- Replace all `FieldRow` calls in `LeadDetails`, `ContactDetails`, and `CompanyDetails` with `EditableFieldRow` that includes a `fieldKey` prop
- Pass `onUpdate` down to each entity-specific sub-component

### 2. `src/components/crm/LeadDetailWithSidebar.tsx` (line 490)

- Pass `onUpdate` to `EntityDetailsPanel`:
  ```tsx
  <EntityDetailsPanel 
    entityType="lead" 
    entity={lead as any} 
    onUpdate={(field, value) => handleFieldChange(field as keyof Lead, value)} 
  />
  ```

### 3. `src/components/companies/CompanyDetailWithSidebar.tsx`

- Same pattern: pass `onUpdate` connecting to the company update handler

### 4. `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx`

- Same pattern: pass `onUpdate` connecting to the contact update handler

## EditableFieldRow Behavior

- **Display mode**: Shows icon + label + value (or "—"), with a subtle pencil icon on hover
- **Link fields**: Value remains clickable as a link; pencil icon triggers edit mode
- **Edit mode**: Replaces value with `<input>` (type based on field: email, url, tel, text)
- **Save**: On blur or Enter key
- **Cancel**: On Escape key
- **Tags**: Remain non-editable in this panel (edited in dedicated section)

