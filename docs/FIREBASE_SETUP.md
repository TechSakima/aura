# Firebase setup — Aura (`aura-photo-manager`)

## Already done in the repo

- Web config in `.env.local`
- `.firebaserc` → `aura-photo-manager`
- `firebase.json` Hosting (Next.js frameworks backend, `us-central1`)
- `firestore.rules` / `storage.rules` (authenticated admin; public traffic uses Admin SDK via API)
- Login tries Firebase Auth first, then local password fallback
- Data store uses **Firestore** when `serviceAccountKey.json` is present; otherwise `.data/`

## What you still need to do

### 1. Service account (required for Firestore + deploy backend)

1. Firebase Console → Project settings → **Service accounts**
2. **Generate new private key**
3. Save the file as:

```
C:\Users\EnochWHarker\Documents\repos\Aura\serviceAccountKey.json
```

(Do not commit it — already gitignored.)

### 2. Enable Authentication

1. Build → **Authentication** → Get started
2. Sign-in method → enable **Email/Password**
3. Users → **Add user** (your studio login), e.g. `admin@aura.studio` + a strong password

Authorized domains already include `localhost`, `*.web.app`, `*.firebaseapp.com`.

### 3. Create Firestore database

1. Build → **Firestore Database** → Create database
2. Start in **production mode** (we deploy rules from the repo)
3. Pick a region close to you (remember it)

Then from the project folder:

```bash
npx firebase login
npx firebase deploy --only firestore:rules,storage
```

### 4. Enable Storage

1. Build → **Storage** → Get started
2. Use the default bucket (`aura-photo-manager.firebasestorage.app`)

### 5. Deploy Hosting (Next.js)

```bash
npm install
npx firebase experiments:enable webframeworks
npx firebase deploy
```

First deploy may ask you to accept Blaze (pay-as-you-go) for the frameworks/Cloud Functions backend — required for Next.js SSR/API routes on Firebase Hosting.

## Verify

With the service account file in place and `npm run dev`:

```bash
curl http://localhost:3000/api/status
```

Expect `"firebaseAdmin": true` and `"dataBackend": "firestore"`.
