

## Fix Logo Click to Scroll to Top

**Problem**: Clicking the FastCRM logo in the header navigates via React Router `Link to="/"` but does not scroll the page back to the top.

**Solution**: Replace the `Link` with a click handler that scrolls to the top of the page smoothly, since clicking the logo on the landing page should reposition to the start rather than triggering a route navigation (the user is already on `/`).

---

### Technical Details

**File**: `src/components/landing-fastcrm/LandingStickyHeader.tsx`

**Change**: Replace the logo `<Link to="/">` with a `<button>` or `<a href="#">` that calls `window.scrollTo({ top: 0, behavior: 'smooth' })` on click. This avoids unnecessary route changes and provides a smooth scroll-to-top experience.

