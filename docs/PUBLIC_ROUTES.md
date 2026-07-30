# Public route noun map (AURA-194)

Client-facing paths — keep short and stable.

| Path | Noun | Purpose |
|------|------|---------|
| `/p/{token}` | Quote | Public proposal (packages, accept) |
| `/q/{token}` | Questionnaire | Public questionnaire |
| `/c/{token}` | Contract | Public agreement sign |
| `/g/{token}` | Gallery | Public gallery (photos, favorites, download) |
| `/pay/{id}` | Payment | Public payment link |
| `/book/{slug}` | Booking | Public session request |
| `/cancel/{token}` | Cancel | Public booking cancel |
| `/h/{slug}` | Homepage | Studio public homepage |
| `/s/{token}` | Sub-album | Shared album — nav + back to gallery; download inherits parent PIN |

**Gallery PIN (AURA-106):** PIN gates **original downloads only**, not viewing. Media access model (signed R2 URLs) → [`CLOUDFLARE_R2.md`](./CLOUDFLARE_R2.md)#access-model-aura-106.

Custom hostnames for `/h` are **out of scope** for now — see [`CUSTOM_DOMAIN.md`](./CUSTOM_DOMAIN.md) (AURA-238).
