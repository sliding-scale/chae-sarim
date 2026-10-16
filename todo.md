# Todo

## Compress profile photos before upload

Personal and company photos display at 72×72 pixels, but the file picker uploads the original (often a multi-megabyte phone photo). Personal photos go to Clerk via `user.setProfileImage`. Company photos are stored in Convex as the original file. The 5 MB check only rejects oversized files.

Compress in the browser, in the file change handler, before preview and before save. Use the compressed file for both uploads.

- Decode with `createImageBitmap(file, { imageOrientation: "from-image" })` so phone photos stay upright.
- Scale so the long edge is at most 512 pixels. Skip the resize when the image is already smaller.
- Export photos (JPEG) as `image/jpeg` at quality `0.82`.
- Export logos with transparency (PNG or WebP) as `image/webp` at about `0.9`, and fall back to PNG if `toBlob` returns null.
- Leave GIFs unchanged, and leave files that are already under both the pixel cap and about 200 KB.
- Run the 5 MB check on the compressed file.

Keep accepting JPEG, PNG, and WebP. iPhone HEIC files often cannot be decoded in Chrome, so compression cannot fix those.
