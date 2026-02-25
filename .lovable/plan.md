

# Fix: Ask FastCRM Page Not Opening

## Root Cause Analysis

After thorough investigation, all the routing and components are correctly wired:
- Route `/dashboard/ask` exists at line 374 of `App.tsx`
- `AskPage.tsx` renders `AskFastCRMInline` inside `DashboardLayout`
- TopBar ⌘K and Ask button both call `navigate("/dashboard/ask")`
- `AskFastCRMInline` component compiles and has all imports

The console logs reveal the page IS rendering (`AskPage` appears in the component tree), but then the URL changes back to `/dashboard`. This indicates a **runtime error inside the component tree** that causes React to unmount and fall back.

The most likely culprit: `useWorkspaceInstance()` hook is used by `useAskFastCRM()` which is called inside `AskFastCRMInline`. If the `workspaceClient` or workspace instance hasn't resolved yet when the Ask page mounts, the hook could throw, causing React's error boundary to catch it and redirect.

## Fix Plan

### 1. Add error boundary protection to AskPage

**Edit: `src/pages/AskPage.tsx`**

Wrap the `AskFastCRMInline` in an `ErrorBoundary` component to catch runtime crashes and display a fallback instead of silently redirecting. Also add a guard for workspace loading state.

### 2. Guard AskFastCRMInline against missing workspace

**Edit: `src/components/ask-fastcrm/AskFastCRMInline.tsx`**

Add a null guard at the top of the component: if `useWorkspace().currentWorkspace` is null, show a loading skeleton instead of calling `useAskFastCRM()` which depends on the workspace being available.

### 3. Add Ask to SidebarV1 navigation

Since the user is using SidebarV1 (shell v2 feature flag is not enabled), the "Ask" item is only in `nav.v2.ts`. Need to also add it to the V1 sidebar config so users can see and click it.

**Edit: `src/components/layout/SidebarV1.tsx`** (or its nav config)

Add an "Ask" nav item with the Sparkles icon pointing to `/dashboard/ask`.

## Files to Edit

| File | Change |
|---|---|
| `src/pages/AskPage.tsx` | Add workspace loading guard and error boundary |
| `src/components/ask-fastcrm/AskFastCRMInline.tsx` | Guard against null workspace before calling hooks |
| `src/components/layout/SidebarV1.tsx` | Add "Ask" nav item for V1 sidebar users |

