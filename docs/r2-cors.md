# R2 CORS configuration

The bulletin drawer uploads user-selected background tracks and the voice
cloning modal uploads voice samples directly to Cloudflare R2 via presigned
PUT URLs (see `lib/storage/r2.ts` → `presignPutUrl`). That bypass exists
because Vercel's serverless runtime caps request bodies at 4.5 MB on every
paid plan — below the size of many practical WAV files.

For browser → R2 PUT to work, the bucket must allow CORS from the
app's origins. The Cloudflare R2 console accepts this JSON:

```json
[
  {
    "AllowedOrigins": [
      "https://www.aurapress.app",
      "https://aurapress.app",
      "https://ll-website-7318.vercel.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## How to apply

1. Cloudflare dashboard → R2 → click the bucket (`aura-audio` or whatever
   `R2_BUCKET` is set to).
2. Settings → CORS Policy.
3. Click **Add CORS Policy**, paste the JSON above (adjust origins if
   the production domain ever changes), Save.

No redeploy needed on Vercel — CORS is a R2-side concern.

## Verifying

Open the production app, generate a bulletin with a local file as
background, and confirm:
- Browser DevTools → Network tab: a `PUT` to
  `<account>.r2.cloudflarestorage.com/<bucket>/bg-tracks/...` returns
  200. If you see 403/CORS errors, the policy didn't take effect.
- Repeat from the voice cloning modal and confirm the `PUT` under
  `voice-clones/...` returns 200. The server downloads that private object,
  sends it to the configured Fish Audio clone endpoint, and deletes it after the attempt completes.

## Temporary voice-sample lifecycle

The application deletes voice samples after every clone attempt and also
cleans up partial browser uploads when possible. Configure an R2 lifecycle
rule that expires objects under `voice-clones/` after one day as a final
safety net for browser disconnects that occur before the clone request.

## Why this is safe

- Presigned URLs are scoped to a single `key` (path), single `PUT`
  method, and expire after 5 minutes. A leaked URL can only upload to
  exactly the path it was minted for, once, briefly.
- Only authenticated users can request presign URLs (the route checks
  `getSession()`).
- File size is validated server-side before the URL is issued (50 MB
  cap in `/api/uploads/bg-presign`).
