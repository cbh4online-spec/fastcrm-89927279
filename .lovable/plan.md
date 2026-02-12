

## Add FastClub Link to Landing Page Navigation

**Goal**: Add a "FastClub" entry to the navigation menu in the FastCRM landing page header, linking to the dedicated section on the page.

---

### Technical Details

**File**: `src/components/landing-fastcrm/LandingStickyHeader.tsx`

**Change**: Add a new entry to the `navLinks` array:

```text
{ href: "#fastclub", label: "FastClub" }
```

This will automatically appear in both the desktop navigation bar and the mobile drawer menu, since both already iterate over the `navLinks` array. The link will smooth-scroll to the FastClub section on the page.

**File**: `src/components/landing-fastcrm/LandingFastClubSection.tsx`

**Change**: Add `id="fastclub"` to the root `<section>` element so the anchor link scrolls to it correctly.

