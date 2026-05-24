# R2 CORS configuration

The bulletin drawer uploads user-selected background tracks directly to
Cloudflare R2 via presigned PUT URLs (see `lib/storage/r2.ts` →
`presignPutUrl`). That bypass exists because Vercel's serverless
runtime caps request bodies at 4.5 MB on every paid plan — far below
the size of a typical bed track (10–30 MB WAVs are common).

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

## Why this is safe

- Presigned URLs are scoped to a single `key` (path), single `PUT`
  method, and expire after 5 minutes. A leaked URL can only upload to
  exactly the path it was minted for, once, briefly.
- Only authenticated users can request presign URLs (the route checks
  `getSession()`).
- File size is validated server-side before the URL is issued (50 MB
  cap in `/api/uploads/bg-presign`).
