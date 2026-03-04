

# Fix: Storage Bucket `c2c-photos` Not Found

## Problem
The edge function logs show `StorageApiError: Bucket not found` when trying to upload AI-generated images to `c2c-photos`. The bucket was never created via migration. This causes image generation (listing images, 360° views, category icons) to silently fail.

The blank screen error is likely unrelated to the edge function itself — it may be a frontend crash from unhandled promise rejection when the function returns an error. Need to verify frontend error handling too.

## Fix

### 1. Database Migration — Create `c2c-photos` storage bucket
Create the missing bucket with public read access and authenticated upload:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('c2c-photos', 'c2c-photos', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "c2c photos public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'c2c-photos');

CREATE POLICY "c2c photos authenticated upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'c2c-photos');

CREATE POLICY "c2c photos service role upload" ON storage.objects
FOR INSERT TO service_role
WITH CHECK (bucket_id = 'c2c-photos');
```

### 2. Frontend error resilience
Check that `C2CCreateListing.tsx` handles errors from `useGenerateListingImage` and `useGenerate360` gracefully (the hooks already have `onError: handleAIError` so toasts should show). The blank screen may be from a different route — will verify.

## Files to change
- New SQL migration for `c2c-photos` bucket
- Potentially minor frontend fixes if blank screen persists after bucket fix

