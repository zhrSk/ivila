ivila custom admin v1

Replace/add only the files contained in this zip.
Do NOT delete app/(payload)/admin yet. The proxy keeps /admin as the public URL and rewrites it to ivila-panel after authentication.

After deploy:
1) Open https://ivila.vercel.app/admin
2) Existing payload-token session should open the custom ivila dashboard.
3) Click "ثبت فایل جدید" and test saving a draft property with a point selected on the map.

Important:
- Payload remains the backend/API/auth layer.
- Native Payload Admin is bypassed because of current Next.js 16 rendering instability.
- Image upload is intentionally deferred until Vercel Blob is connected.
