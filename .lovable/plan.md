
## Fix Pricing Section CTA Buttons Visibility

**Problem**: The CTA buttons on the pricing cards (Free, Business, Enterprise) use a thin outline style with very low-opacity borders and text, making them nearly invisible against the dark card backgrounds.

**Solution**: Improve button contrast and visibility by:

1. **Free plan button** — Use a solid green-tinted style matching the plan color, with dark text
2. **Business plan button** — Use a solid blue style matching its plan color, with white text
3. **Professional plan button** — Already uses primary color (visible), keep as-is
4. **Enterprise plan button** — Use a solid amber/gold style matching the plan color, with dark text

This ensures every CTA is immediately visible and color-coded to its plan.

---

### Technical Details

**File**: `src/components/landing-fastcrm/LandingPricingSection.tsx`

**Changes**:
- Remove the generic outline approach for non-highlighted buttons (lines 250-270)
- Replace with plan-specific solid background colors using each plan's `color` property
- Use appropriate text colors (dark text on light buttons, white text on dark buttons)
- Add stronger hover states for each button
- The Professional card button remains unchanged (already uses primary color and is visible)
