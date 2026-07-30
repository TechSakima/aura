# Resend for Aura email

Aura sends transactional mail (contact form, quotes, galleries, bookings, payments) through **one platform Resend account**. Studios do not create their own Resend accounts in v1.

Official docs: [Resend Domains](https://resend.com/docs/dashboard/domains/introduction) · [Receiving](https://resend.com/docs/dashboard/receiving/introduction) · [Webhooks](https://resend.com/docs/webhooks/introduction)

Backlog: Phase 19 in [`AURA_ISSUES.md`](./AURA_ISSUES.md).

---

## Mental model

```text
Tier 1 (required)     Form / notify → Resend send → studio or client inbox
Tier 2 (retry)        Failed sends → emailOutbox → cron or opportunistic drain → Resend again
Tier 3 (inbound)      Client emails slug@inbound… → Resend MX → webhook → Aura → studio inbox
```

| Who | What they see |
|-----|----------------|
| **From** | Studio display name, but mailbox is Aura’s verified address (`RESEND_FROM_EMAIL`) |
| **Reply-To** (contact → studio) | The client’s email — Reply in the studio’s mail app goes to the client |
| **Reply-To** (transactional → client) | `p-{projectId}@inbound…` when project + inbound domain are set (AURA-372); else owner email. Display name = studio |
| **Deliver to** | Settings → Notifications → Contact (defaults to owner email) |

**Thread drift caveat:** If the studio replies From their personal mailbox (instead of keeping Reply-To on the project inbound address), the client’s next reply can leave Aura’s inbound route.

Never commit API keys or webhook secrets. Put them in **`.env.local`** (local) and App Hosting secrets (prod).

---

## Final `.env` checklist (all tiers)

```bash
# --- Tier 1: required ---
NEXT_PUBLIC_APP_URL=https://aura.stroburm.app
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=Aura <notify@aura.stroburm.app>

# --- Tier 2: outbox cron (optional but recommended in prod) ---
CRON_SECRET=long-random-string

# --- Tier 3: inbound receiving (optional product surface) ---
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxx
RESEND_INBOUND_DOMAIN=inbound.aura.stroburm.app
```

| Variable | Tier | Where it comes from |
|----------|------|---------------------|
| `NEXT_PUBLIC_APP_URL` | 1 | Your public site URL (email links) |
| `RESEND_API_KEY` | 1 | Resend → API Keys |
| `RESEND_FROM_EMAIL` | 1 | You choose; must be on a **verified sending** domain |
| `CRON_SECRET` | 2 | You generate (password manager / `openssl rand -hex 32`) |
| `RESEND_WEBHOOK_SECRET` | 3 | Resend → Webhooks → signing secret (`whsec_…`) |
| `RESEND_INBOUND_DOMAIN` | 3 | Host that has Resend **receiving** MX (no `@`) |

Restart Next after changing env. Prod: set the same keys in Firebase App Hosting.

---

## Tier 1 — Sending (required)

Without this, contact forms and most notify emails do not leave the server.

### Step 1 — Create the Resend account

1. Go to [resend.com](https://resend.com) → sign up / log in.
2. Use the team/workspace that will own **Aura platform** mail (not a single studio).

### Step 2 — Add and verify a **sending** domain

Prefer a dedicated subdomain so you don’t fight existing mail on the apex:

- Good: `aura.stroburm.app`, `mail.yourdomain.com`, `notify.yourdomain.com`
- Avoid putting sending DNS on a domain that already has complex MX unless you know what you’re doing.

1. Resend dashboard → **[Domains](https://resend.com/domains)** → **Add Domain**.
2. Enter the domain/subdomain → create.
3. Resend shows DNS records (typically **SPF**, **DKIM**, sometimes **DMARC**).
4. In your DNS host (Cloudflare, Route53, etc.), create those records **exactly** as shown.
5. Back in Resend → **Verify** (or wait for auto-verify). Status must be **Verified**.

Until Verified, sends will fail or stay in sandbox limits.

### Step 3 — Create an API key

1. Resend → **[API Keys](https://resend.com/api-keys)** → **Create API Key**.
2. Name it e.g. `aura-app`.
3. Permission: **Sending access** (or full access if you also manage webhooks via API).
4. Copy the key immediately (`re_…`). You won’t see it again.

### Step 4 — Choose the From address

Pick a mailbox on the **verified sending domain**, e.g.:

```text
notify@aura.stroburm.app
```

In `.env.local`:

```bash
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=Aura <notify@aura.stroburm.app>
NEXT_PUBLIC_APP_URL=https://aura.stroburm.app
```

Format: `Display Name <email@verified-domain>`.  
Aura may swap the display name to the studio’s name at send time; the address part stays yours.

### Step 5 — Smoke test Tier 1

1. Run the app with `.env.local` loaded.
2. Admin → **Settings → Notifications → Contact**
   - Set **Deliver to** (or leave blank → owner email).
   - Enable website / gallery form toggles as needed.
   - Optional: enable **Auto-reply** (client confirmation email).
3. Open a public contact surface (homepage Contact or gallery Message).
4. Send a test message.
5. Check:
   - Studio inbox (Deliver to) received it.
   - **Reply** goes to the test client address.
   - Admin bell / Dashboard → Messages shows the message (if Contact message notify is on).

If it fails with “Couldn’t send”, check server logs for `[notify] email failed` / missing key / unverified domain.

---

## Tier 2 — Outbox retry + cron

When Resend blips, Aura **keeps** the contact message and queues `emailOutbox` with backoff. Drain happens:

- Opportunistically when someone loads the **dashboard** or posts another contact.
- On a schedule via **`POST /api/cron/email-outbox`** (recommended in production).

### Step 1 — Generate a secret

```bash
# macOS / Linux
openssl rand -hex 32

# PowerShell
[Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]]).ToLower()
```

Or use any long random string from a password manager.

```bash
CRON_SECRET=your-long-random-string
```

### Step 2 — Call the drain endpoint

**Production URL** (example):

```http
POST https://aura.stroburm.app/api/cron/email-outbox
Authorization: Bearer your-long-random-string
```

Expect JSON like `{ "ok": true, "processed": N, "sent": N, "dead": N, "authSessionsDeleted": N, "galleriesExpired": N }` (AURA-112 maintenance bundle).

### Step 3 — Schedule it

Pick one:

| Option | Idea |
|--------|------|
| **Cloud Scheduler / cron job** | Every 1–5 minutes, HTTP POST with the Bearer header |
| **GitHub Action `schedule`** | Same POST to production |
| **External ping service** | Authenticated POST only — don’t expose without `CRON_SECRET` |

Without cron, email retries still run when admins use the dashboard; cron also expires past-due galleries and purges auth sessions (AURA-112 / AURA-110).

---

## Tier 3 — Inbound receiving (all-tier setup)

Lets people email Aura-managed addresses; Aura stores the message, forwards to the studio, and notifies in-app.

**Aura routes by local-part** on `RESEND_INBOUND_DOMAIN`:

| Address pattern | Resolves to |
|-----------------|-------------|
| `{homepageSlug}@inbound…` | Studio whose homepage slug matches |
| `s-{studioId}@inbound…` | That studio id (stable) |
| `p-{projectId}@inbound…` | Studio + project (AURA-371) — stored on `contactMessages`, notify → project |
| `sess-{sessionId}@inbound…` | Studio + session (+ project when known) |

Example: studio homepage slug `wildflower` →  
`wildflower@inbound.aura.stroburm.app`

Catch-all local-parts — no per-address provisioning in Resend. Client transactional mail sets Reply-To to `p-{projectId}@…` when possible (**AURA-372**).

**Send reply (AURA-374):** Project → Messages → **Send** posts a one-shot Resend email (From = studio display / platform address, Reply-To = project inbound). Not an Inbox — no threads UI.

Use a **subdomain** for receiving (e.g. `inbound.aura.stroburm.app`) so you don’t replace MX on the main company domain.

### Step 1 — Enable receiving on a domain

1. Resend → **[Domains](https://resend.com/domains)** → open the domain (or add `inbound.yourdomain.com`).
2. Find **Receiving** / **Enable Receiving** and turn it **on**.
3. Resend shows an **MX** record (host + value + priority).
4. Add that MX in DNS for the inbound host.
5. In Resend, confirm **I’ve added the record** and wait until receiving shows **Verified**.

Also note: API key must be allowed to call **receiving** APIs (same key as Tier 1 is usually fine if not over-restricted).

### Step 2 — Set the inbound domain in env

Host only — no `@`, no path:

```bash
RESEND_INBOUND_DOMAIN=inbound.aura.stroburm.app
```

Must match the host clients will type after `@`.

### Step 3 — Deploy a public webhook URL

Aura’s endpoint (already in the app):

```text
https://<your-public-host>/api/webhooks/resend
```

- Production: use the real App Hosting URL.
- Local: Resend cannot reach `localhost`. Use a tunnel ([ngrok](https://ngrok.com), Cloudflare Tunnel, VS Code port forwarding) and point the webhook at  
  `https://<tunnel>/api/webhooks/resend`.

### Step 4 — Create the webhook in Resend

1. Resend → **[Webhooks](https://resend.com/webhooks)** → **Add Webhook**.
2. **Endpoint URL:** `https://<your-public-host>/api/webhooks/resend`
3. **Events:** select **`email.received`** (that’s the one Aura handles for inbound).
4. Save.

### Step 5 — Copy the signing secret

1. Open the webhook you just created.
2. Copy **Signing secret** (`whsec_…`).
3. Put it in env:

```bash
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxx
```

If you lose it, create a new webhook or rotate from the dashboard and update env.

### Step 6 — Smoke test Tier 3

1. Confirm a studio has homepage slug `teststudio` (or use `s-<studioId>@…`).
2. From any mailbox, send mail to:  
   `teststudio@inbound.aura.stroburm.app`  
   (or your real `RESEND_INBOUND_DOMAIN`).
3. Within a few seconds:
   - Resend Receiving shows the message.
   - Webhook delivery succeeds (Webhooks dashboard).
   - Studio **Deliver to** gets a forwarded copy (Reply-To = original sender).
   - Admin **Messages** / notification bell updates.

If webhook returns `unmatched`, the To local-part didn’t match a slug or `s-{id}`.  
If `Invalid signature`, `RESEND_WEBHOOK_SECRET` doesn’t match that webhook.

---

## Recommended order of work

1. **Tier 1** — domain verify + API key + From → test contact form.  
2. **Tier 2** — add `CRON_SECRET` + schedule drain in prod.  
3. **Tier 3** — receiving MX + webhook + secrets → test `slug@inbound…`.

---

## Ops notes

- **One platform domain** for sending; studios don’t configure SPF/DKIM themselves.
- **Inbound subdomain** is separate DNS (MX) from sending (SPF/DKIM). Same Resend account can own both.
- Contact messages are stored even if Resend fails; Tier 2 retries delivery.
- Inbound HTML is stripped to plain text before store/forward — never executed.
- Rotate `RESEND_API_KEY` / `RESEND_WEBHOOK_SECRET` / `CRON_SECRET` if leaked; update App Hosting + `.env.local`.

---

## Quick troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Contact “Couldn’t send” / skipped | Missing `RESEND_API_KEY` or domain not Verified |
| Mail goes to spam | Incomplete SPF/DKIM/DMARC on sending domain |
| No retry overnight | No cron hitting `/api/cron/email-outbox` |
| Webhook 400 Invalid signature | Wrong `RESEND_WEBHOOK_SECRET` or not raw body (Aura already uses raw text) |
| Webhook `unmatched` | Wrong `RESEND_INBOUND_DOMAIN` or slug / `s-id` typo |
| Local inbound never fires | Webhook still pointed at localhost — use a tunnel |
