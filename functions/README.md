# Aura Cloud Functions (Firebase) — optional future

Local MVP uses Next.js API routes + `.data/`. Email automations were removed from the product.

When migrating to Firebase, typical Functions would be:

| Function | Trigger | Behavior |
|----------|---------|----------|
| `processUpload` | Storage finalize | Generate thumb, web, watermarked derivatives |
| `applyWatermark` | Preset change | Re-render watermarked derivatives |
| `signedDownload` | HTTPS | Verify PIN, stream original or zip |
| `archiveGallery` | Callable (admin) | Build zip + client details, purge Storage |

No SendGrid / reminder-email functions — out of scope.
