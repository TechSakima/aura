-- Aura D1 schema. Mirrors Firestore documents that are still written, plus
-- the two D1 rows the cutover needs before they exist in Firestore:
-- users (magic-link login) and idempotency_keys (shared 15-minute replay).
--
-- `body` is the Firestore document JSON, camelCase, without a second copy of
-- the primary key when that key is the document id. Columns are only the
-- unique keys, indexes, and foreign keys from the Leave Firebase schema step,
-- plus the tenant id and the fields those constraints sit on. Backfill writes
-- both. Do not store image bytes here (D1 row cap is 2 MB).
--
-- Deletes of R2 objects and Google Calendar events stay in application code.
-- The three metadata foreign keys use ON DELETE RESTRICT so SQL does not
-- remove those rows out from under that cleanup.
--
-- Plan noun                    table                    Firestore collection
-- studios                      studios                  studios
-- members                      studio_members           studioMembers
-- users                        users                    (none yet)
-- auth sessions                auth_sessions            sessions
-- projects                     projects                 projects
-- project sessions             project_sessions         projectSessions
-- galleries                    galleries                galleries
-- photos                       photos                   photos
-- comments                     comments                 comments
-- favorites                    gallery_favorites        galleryFavorites
-- sub-albums                   sub_albums               subAlbums
-- quotes                       proposals                proposals
--   collection id stays `proposals` (AURA-200)
-- bookings                     booking_requests         bookingRequests
-- payments                     payment_transactions     paymentTransactions
--                              invoices                 invoices
--                              payment_links            paymentLinks
-- contracts                    contracts                contracts
--                              contract_templates       contractTemplates
-- questionnaires               questionnaire_responses  questionnaireResponses
--                              questionnaire_templates  questionnaireTemplates
-- messages                     contact_messages         contactMessages
-- notifications                notifications            notifications
-- analytics                    analytics_events         analyticsEvents
-- rate limits                  rate_limits              rateLimits
-- email outbox                 email_outbox             emailOutbox
-- watermark jobs               watermark_jobs           watermarkJobs
-- tombstones                   deleted_docs             deletedDocs
-- homepage slugs               homepage_slugs           homepageSlugs
-- idempotency keys             idempotency_keys         (none yet; unique scope+key)
--
-- Still written by the studio workspace, so a later copy has somewhere to land:
-- package_templates, watermark_presets, idea_cards, shot_list_templates,
-- shoot_plans, session_types.
--
-- Not mirrored: retired `clients` / `shoots`, legacy `studio`, legacy `aura`.

-- studios
CREATE TABLE studios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

-- members. Unique key: member uid. Foreign key: member → studio.
CREATE TABLE studio_members (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  studio_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  body TEXT NOT NULL,
  CONSTRAINT fk_studio_members_studio
    FOREIGN KEY (studio_id) REFERENCES studios (id)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
) STRICT;

-- users. Unique key: user email. No Firestore collection yet.
-- magic_link_* is the D1 user row (hash only, short expiry, ready after one link).
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL CHECK (length(trim(email)) > 0),
  magic_link_token_hash TEXT,
  magic_link_expires_at TEXT,
  magic_link_ready INTEGER NOT NULL DEFAULT 0 CHECK (magic_link_ready IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE UNIQUE INDEX idx_users_email ON users (email COLLATE NOCASE);

-- auth sessions. Index: sessions by token (the Firestore doc id).
CREATE TABLE auth_sessions (
  token TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  email TEXT NOT NULL,
  studio_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

-- projects
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

-- project sessions. Foreign key: session → project.
CREATE TABLE project_sessions (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  body TEXT NOT NULL,
  CONSTRAINT fk_project_sessions_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
) STRICT;

-- galleries. Unique key: gallery public token.
CREATE TABLE galleries (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  public_token TEXT NOT NULL CHECK (length(public_token) > 0),
  body TEXT NOT NULL
) STRICT;

CREATE UNIQUE INDEX idx_galleries_public_token ON galleries (public_token);

-- photos. Foreign key: photo → gallery.
-- Index: gallery id + sort order, with id last so a keyset (sort_order, id)
-- can use this same index.
CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  gallery_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  body TEXT NOT NULL,
  CONSTRAINT fk_photos_gallery
    FOREIGN KEY (gallery_id) REFERENCES galleries (id)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
) STRICT;

CREATE INDEX idx_photos_gallery_sort ON photos (gallery_id, sort_order, id);

-- comments
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

-- favorites
CREATE TABLE gallery_favorites (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

-- sub-albums
CREATE TABLE sub_albums (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

-- quotes (Firestore collection id stays proposals)
CREATE TABLE proposals (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

-- bookings
CREATE TABLE booking_requests (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

-- payments. Unique keys: Stripe checkout session id and payment intent id.
-- The same id may also sit on the invoice for that charge; uniqueness is per
-- table, which is what stops a second payment row.
CREATE TABLE payment_transactions (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  body TEXT NOT NULL
) STRICT;

CREATE UNIQUE INDEX idx_payment_transactions_stripe_checkout
  ON payment_transactions (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL
    AND stripe_checkout_session_id <> '';

CREATE UNIQUE INDEX idx_payment_transactions_stripe_payment_intent
  ON payment_transactions (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL
    AND stripe_payment_intent_id <> '';

CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  body TEXT NOT NULL
) STRICT;

CREATE UNIQUE INDEX idx_invoices_stripe_checkout
  ON invoices (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL
    AND stripe_checkout_session_id <> '';

CREATE UNIQUE INDEX idx_invoices_stripe_payment_intent
  ON invoices (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL
    AND stripe_payment_intent_id <> '';

CREATE TABLE payment_links (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

-- contracts
CREATE TABLE contracts (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

CREATE TABLE contract_templates (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

-- questionnaires
CREATE TABLE questionnaire_responses (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

CREATE TABLE questionnaire_templates (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

-- messages
CREATE TABLE contact_messages (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

-- notifications
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

-- analytics. Index: studio id + time (`at`, the Firestore field).
CREATE TABLE analytics_events (
  id TEXT PRIMARY KEY,
  studio_id TEXT,
  at TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

CREATE INDEX idx_analytics_studio_time ON analytics_events (studio_id, at);

-- rate limits. Doc id is sha256(key) sliced to 40 hex chars. count / resetAt
-- are epoch-ms integers, matching the Firestore bucket.
CREATE TABLE rate_limits (
  id TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  body TEXT NOT NULL
) STRICT;

-- email outbox. next_attempt_at is the retry clock the cron already uses.
CREATE TABLE email_outbox (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  status TEXT NOT NULL,
  next_attempt_at TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

-- watermark jobs
CREATE TABLE watermark_jobs (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  status TEXT NOT NULL,
  next_attempt_at TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

-- tombstones. id = `${collection}__${docId}` (deletedDocKey).
CREATE TABLE deleted_docs (
  id TEXT PRIMARY KEY,
  studio_id TEXT,
  collection TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  deleted_at TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

-- homepage slugs. Unique key: the slug, which is the Firestore doc id.
CREATE TABLE homepage_slugs (
  slug TEXT PRIMARY KEY CHECK (length(slug) > 0),
  studio_id TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

-- idempotency keys. Unique (scope, key). expires_at is the 15-minute replay.
CREATE TABLE idempotency_keys (
  scope TEXT NOT NULL CHECK (length(scope) > 0),
  key TEXT NOT NULL CHECK (length(key) > 0),
  status INTEGER NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  PRIMARY KEY (scope, key)
) STRICT;

-- Still-written studio workspace collections.
CREATE TABLE package_templates (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

CREATE TABLE watermark_presets (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

CREATE TABLE idea_cards (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

CREATE TABLE shot_list_templates (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

CREATE TABLE shoot_plans (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;

CREATE TABLE session_types (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  body TEXT NOT NULL
) STRICT;
