

# Fix: Chat drawer won't close

## Root Cause

The `useEffect` on line 90-94 re-opens the drawer every time `drawerOpen` changes. When the user clicks close (setting `drawerOpen = false`), the effect fires because `drawerOpen` is in its dependency array, sees `messages.length >= 4 && !drawerOpen` is true, and immediately sets `drawerOpen = true` again.

## Fix

Remove `drawerOpen` from the dependency array and only trigger auto-open once. The simplest approach: track whether the drawer was auto-opened with a ref, so the effect only fires once and never fights the user's close action.

**File:** `src/components/command-center/AIQuestionBox.tsx`

- Add a `useRef(false)` called `autoOpenedRef`
- Change the useEffect to only auto-open if `autoOpenedRef.current` is false, then set it to true
- Reset `autoOpenedRef.current = false` in `handleNewConversation`
- Remove `drawerOpen` from the dependency array

This is a one-line-level fix in a single file.

