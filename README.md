# Aura

Solo-studio photography PWA: CRM, proposals (with intake), **Photoshoot Helper**, sneak peeks, 60-day galleries, watermarks, PIN downloads, sub-shares, analytics, and archive/purge.

Email notifications are **not** part of the product — share gallery/proposal links manually.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Open studio admin**.

**Default login:** `admin@aura.studio` / `aura-admin`

Data persists in `.data/` (gitignored). **No Firebase required** for local use.

## Firebase (`aura-photo-manager`)

Web config is in `.env.local`. Hosting targets Firebase (`firebase.json`).

**You still need to:** drop `serviceAccountKey.json` in the repo root, enable Email/Password Auth + create a user, create Firestore + Storage, then deploy rules/hosting.

Full checklist: [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)

## Product surfaces

| Area | Route |
|------|--------|
| Admin | `/admin` |
| Shoot helper | `/admin/shoots/[id]/helper` |
| Ideas / shot lists | `/admin/ideas`, `/admin/shot-lists` |
| Public proposal | `/p/[token]` |
| Main gallery | `/g/[token]` |
| Sneak peek | `/g/[token]/peek` |
| Sub-album | `/s/[token]` |

## Design system

- Tokens: `src/styles/tokens.css`
- UI: `src/components/ui/*`
- Cursor rules: `.cursor/rules/aura-*.mdc`
