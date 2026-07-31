# Cloudflare R2 for Aura media

Gallery originals, derivatives, videos, watermarks, and logos use **Cloudflare R2** (zero egress). Firebase keeps Auth, Firestore, and App Hosting.

Backlog: Phase 21 in [`AURA_ISSUES.md`](./AURA_ISSUES.md).

Official token docs: [R2 Authentication](https://developers.cloudflare.com/r2/api/tokens/).

## 1. Enable R2 + create the bucket

1. Open [R2 Overview](https://dash.cloudflare.com/?to=/:account/r2/overview).
2. Accept pay-as-you-go (free monthly allotment applies).
3. **Create bucket** → name it **`aura-media`** → leave location as default unless you need a jurisdiction.
4. On the R2 overview, copy **Account ID** (Account details). That is `R2_ACCOUNT_ID`.

Until R2 is enabled, the API returns `10042` and Aura keeps using Firebase Storage.

## 2. Manage API Tokens → create credentials

These are **R2-specific** tokens (S3 Access Key + Secret). They are **not** the same as a normal Cloudflare API token under My Profile.

1. Stay on [R2 Overview](https://dash.cloudflare.com/?to=/:account/r2/overview).
2. In **Account details**, find **API Tokens** → click **Manage**.
3. Click **Create Account API token**  
   - Prefer **Account** token for Aura (survives if a user is removed; needs Super Admin).  
   - **User** token also works for solo setup.
4. Name it something clear, e.g. `aura-media-app`.
5. **Permissions:** choose **Object Read & Write**  
   - That is enough for Aura (upload, download, delete, signed URLs).  
   - Do **not** need Admin / Data Catalog for this.
6. **Scope (optional but recommended):** apply to bucket **`aura-media` only** (not all buckets).
7. Create the token.

### Copy these two values immediately

Cloudflare shows them **once**:

| Cloudflare label | Aura `.env` variable |
|------------------|----------------------|
| **Access Key ID** | `R2_ACCESS_KEY_ID` |
| **Secret Access Key** | `R2_SECRET_ACCESS_KEY` |

If you leave the page without copying the secret, create a new token (you cannot view the secret again).

You now have four values:

```bash
R2_ACCOUNT_ID=           # from R2 Account details
R2_ACCESS_KEY_ID=        # Access Key ID from the token screen
R2_SECRET_ACCESS_KEY=    # Secret Access Key (shown once)
R2_BUCKET=aura-media     # exact bucket name
```

Aura does **not** need you to paste the S3 endpoint into `.env` — the app builds  
`https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` automatically.

## 3. Put credentials in Aura

### Local

Add the four lines to your project `.env` (never commit that file). Then:

```bash
npm install
```

Restart `npm run dev`. With all four set, **new uploads go to R2**.

Then run **§4 Verify**. Production secrets are **§5**.

## 4. Verify

```bash
npm run r2:smoke
```

That puts / gets / deletes `studios/_aura-smoke/…` then cleans up. Expect `PASS: R2 read/write works`.

If it fails with **Access Key ID length … expected 32**, re-copy `R2_ACCESS_KEY_ID` from Cloudflare (R2 → Manage API Tokens). Do not invent characters; create a new token if unsure.

Manual check: upload a test photo in admin Delivery → R2 → **aura-media** → keys under `studios/...`.

## 4b. CORS (browser → R2 direct GET/PUT)

Client zip and direct upload (AURA-356/361) need **GET + PUT** CORS.

1. Run `npm run r2:cors` — if Access Denied, copy the printed JSON.
2. Cloudflare → R2 → **aura-media** → **Settings** → **CORS policy** → paste → Save.

Without CORS, zip falls back to individual downloads and direct upload fails.

## 4c. Migrate existing Firebase objects (AURA-359)

```bash
npm run r2:migrate                 # dry-run
npm run r2:migrate -- --execute    # copy + size-verify
# optional later (after 360 cutover is solid):
# npm run r2:migrate -- --execute --delete
```

Idempotent: skips keys already on R2 with the same size.

## 5. Production (Firebase App Hosting)

`apphosting.yaml` already maps `R2_*`. Create the three secrets (values from `.env.local`, never commit):

```bash
# PowerShell examples — pipe value, do not echo it
Get-Content .env.local | ForEach-Object { if ($_ -match '^R2_ACCOUNT_ID=(.*)$') { $matches[1] } } | npx firebase apphosting:secrets:set R2_ACCOUNT_ID --data-file - --force
Get-Content .env.local | ForEach-Object { if ($_ -match '^R2_ACCESS_KEY_ID=(.*)$') { $matches[1] } } | npx firebase apphosting:secrets:set R2_ACCESS_KEY_ID --data-file - --force
Get-Content .env.local | ForEach-Object { if ($_ -match '^R2_SECRET_ACCESS_KEY=(.*)$') { $matches[1] } } | npx firebase apphosting:secrets:set R2_SECRET_ACCESS_KEY --data-file - --force
```

Then deploy App Hosting so runtime picks up the secrets + `R2_BUCKET=aura-media`.

## 6. What you do *not* need right now

- Custom domain / public bucket for browse (AURA-357 may add CDN later)
- Workers binding (S3 API from Next is enough)
- CORS for browser→R2 **upload** (server-side upload for now; **GET CORS** is needed for client zip — §4b)
- Migrating old Firebase files (AURA-359 later)

## Cutover checklist

- [x] R2 enabled + bucket `aura-media`
- [x] Account ID + Access Key ID + Secret Access Key in `.env.local`
- [x] `npm run r2:smoke` PASS
- [x] `apphosting.yaml` R2 env block enabled (`R2_BUCKET=aura-media` + secret refs)
- [x] App Hosting secrets set + granted to backend `aura`
- [ ] Deploy App Hosting so prod runtime loads R2 secrets
- [x] R2 CORS policy (see §4b) for client-side bulk zip
- [x] AURA-355 signed downloads · AURA-356 client zip · AURA-357 signed browse
- [x] AURA-359 migrate (Firebase kept until cutover)
- [x] AURA-360 cutover (prod R2 writes required)
- [x] AURA-362 DoD (`/api/media` redirects to signed R2 when configured)
- [ ] Optional: `MEDIA_DUAL_READ=0` + `npm run r2:migrate -- --execute --delete` when ready
- [ ] AURA-361 direct upload (optional)

## Architecture (target)

```text
Upload → App Hosting (Sharp) → R2 original + derivatives
Browse → R2 signed URLs (direct or via /api/media 302)
PIN OK → signed R2 GET for originals (direct to client)
Bulk   → signed URL list + client-side zip (no App Hosting buffer)
```

## Access model (AURA-106)

**Product decision: signed / expiring URLs** — not secrecy-of-URL alone.

| Surface | Access | TTL |
|---------|--------|-----|
| Gallery discovery | Unguessable `publicToken` (`/g/{token}`) | — |
| Browse (thumb / web / wm) | R2 signed GET minted at read time (AURA-357); page refresh re-signs | **6h** |
| Legacy `/api/media/…` | **302 →** signed R2 GET (AURA-362); `/originals/` always **403** | **1h** |
| Originals download | `POST …/download` after access check → signed R2 GET; client fetches R2 directly | **15m** |
| R2 bucket | Private — no anonymous public GET | — |

### PIN = download-only

- Gallery **view** (grid, lightbox, favorites) is gated by **gallery token** only.
- **PIN** (when set) is checked only on the **download** API before minting original signed URLs.
- Previews are not PIN-gated. Expired galleries may still show meta; downloads stay blocked (`mutate`).

### Media proxy (AURA-386)

`/api/media` requires HMAC query params (`exp` + `sig`) minted server-side. Path-only requests get **403**. Prefer gallery/admin API browse URLs (`resolveBrowseMediaUrl` → R2 signed GET when configured). Stored photo fields may still hold stable `/api/media/…` paths without query — reminted on read.
