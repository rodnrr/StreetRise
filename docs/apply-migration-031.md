# Apply migration 031 — blog-images storage bucket

Migration file: `supabase/migrations/031_blog_images_storage.sql`
Live project: `mldatfcwnmvrmxumzxyb`

Creates the `blog-images` Supabase Storage bucket used by the **Upload** button
on `/admin/blog` (public read, admin-only write). Until it is applied, the
Upload button fails with a "Bucket not found" error — pasting a URL into the
cover field keeps working either way.

## Steps (Supabase dashboard, works from a phone)

1. Open the Supabase dashboard → project → **SQL Editor**.
2. Paste the full contents of `supabase/migrations/031_blog_images_storage.sql`
   and run it. Expected result: "Success. No rows returned".
3. Verify — run:

   ```sql
   select id, public from storage.buckets where id = 'blog-images';
   ```

   Expected: one row, `public = true`.

4. Verify the policies — run:

   ```sql
   select policyname from pg_policies
   where tablename = 'objects' and policyname like 'blog_images%';
   ```

   Expected: 4 rows (`blog_images_public_read`, `blog_images_admin_insert`,
   `blog_images_admin_update`, `blog_images_admin_delete`).

5. Smoke test: in `/admin/blog`, edit any post, tap **Upload**, pick a photo.
   The cover URL field should fill in with a
   `…/storage/v1/object/public/blog-images/covers/….jpg` URL; open that URL in
   a browser tab to confirm the image renders, then save the post.

Uploaded objects live under the `covers/` prefix with timestamped names, so
re-uploading never overwrites an existing image that a live post may still
reference. Old unused objects can be deleted in the dashboard under
**Storage → blog-images**.
