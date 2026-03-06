

# Enhance TodayCard: Clickable Events with Contact Info

## Problem
Events in the TodayCard are static — clicking does nothing. They also lack context about associated contacts/companies.

## Changes

### 1. Enrich event query with contact/company data
**File: `src/hooks/useCalendarEvents.ts`**

Update the select query to join contact and company names:
```sql
*, calendar:calendars(id, name, color), contact:contacts(id, name), company:companies(id, name)
```

### 2. Make events clickable in TodayCard
**File: `src/components/command-center/TodayCard.tsx`**

- Import `useNavigate` from react-router-dom
- Wrap each event row in a clickable element that navigates to `/dashboard/scheduling` (the calendars page)
- Add hover styling (`cursor-pointer`, `hover:bg-muted/50`)
- Display contact/company name below the time range when available (e.g. "Vera Silva · Empresa X")
- Make tasks clickable too, navigating to their relevant page

### Result
Each event row will show:
```
| ▎ Reunião de Objetivos                    |
|   18:00 – 18:30 · Vera Silva              |
```

Clicking navigates to the scheduling/calendar page where the user can view and edit the full event.

