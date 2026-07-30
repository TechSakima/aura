/**
 * Dual-collection merge rules (AURA-153).
 *
 * Canonical: `projects` and `projectSessions` win. Legacy `clients`/`shoots`
 * fill gaps only — never overwrite canonical rows.
 *
 * Delete safety: cascade deletes must remove from BOTH canonical and legacy
 * collections (delete-project / delete-shoot do) or deleted rows would
 * resurrect on next persist when normalizeDb re-adds them from legacy.
 *
 * Run: node --experimental-strip-types --experimental-transform-types src/lib/db/normalize.test.ts
 * (requires tsconfig paths or run from repo root with Node 22+ type stripping)
 */

import { normalizeDb, projectRoundTripPreserved } from "./normalize";
import type { AuraDatabase } from "@/lib/types";

function baseDb(partial: Partial<AuraDatabase>): AuraDatabase {
  const now = new Date().toISOString();
  return {
    studio: {
      id: "s1",
      name: "Studio",
      ownerEmail: "a@b.c",
      timeZone: "America/Denver",
      dateFormat: "mm/dd/yyyy",
      createdAt: now,
      updatedAt: now,
    },
    projects: [],
    sessions: [],
    clients: [],
    shoots: [],
    packageTemplates: [],
    proposals: [],
    galleries: [],
    photos: [],
    comments: [],
    subAlbums: [],
    watermarkPresets: [],
    analyticsEvents: [],
    ideaCards: [],
    shotListTemplates: [],
    shootPlans: [],
    notifications: [],
    paymentLinks: [],
    invoices: [],
    paymentTransactions: [],
    contractTemplates: [],
    contracts: [],
    questionnaireTemplates: [],
    questionnaireResponses: [],
    sessionTypes: [],
    bookingRequests: [],
    ...partial,
  } as AuraDatabase;
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`normalize.test: ${msg}`);
}

const canonicalWins = normalizeDb(
  baseDb({
    projects: [
      {
        id: "p1",
        studioId: "s1",
        name: "Canonical",
        email: "c@x.com",
        type: "Wedding",
        stage: "booked",
        paidAmount: 100,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ],
    clients: [
      {
        id: "p1",
        studioId: "s1",
        name: "Legacy",
        email: "c@x.com",
        type: "Session",
        stage: "inquiry",
        paidAmount: 0,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ],
    sessions: [],
    shoots: [],
  }),
);
assert(canonicalWins.projects.length === 1, "projects deduped");
assert(canonicalWins.projects[0]!.name === "Canonical", "canonical project wins");
assert(canonicalWins.projects[0]!.stage === "booked", "canonical stage wins");

const legacyFills = normalizeDb(
  baseDb({
    projects: [],
    clients: [
      {
        id: "p1",
        studioId: "s1",
        name: "Only legacy",
        email: "c@x.com",
        type: "Portrait",
        stage: "inquiry",
        paidAmount: 0,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ],
    sessions: [],
    shoots: [],
  }),
);
assert(legacyFills.projects.length === 1, "legacy client becomes project");
assert(legacyFills.projects[0]!.name === "Only legacy", "legacy fills gap");

const sessionCanonicalWins = normalizeDb(
  baseDb({
    projects: [
      {
        id: "p1",
        studioId: "s1",
        name: "P",
        email: "a@b.c",
        type: "Wedding",
        stage: "booked",
        paidAmount: 0,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ],
    clients: [],
    sessions: [
      {
        id: "sess1",
        studioId: "s1",
        projectId: "p1",
        type: "Engagement",
        status: "booked",
        startsAt: "2026-06-01T10:00:00Z",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ],
    shoots: [
      {
        id: "sess1",
        studioId: "s1",
        projectId: "p1",
        type: "Old",
        status: "inquiry",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ],
  }),
);
assert(sessionCanonicalWins.sessions.length === 1, "sessions deduped");
assert(sessionCanonicalWins.sessions[0]!.type === "Engagement", "canonical session wins");

const shootFills = normalizeDb(
  baseDb({
    projects: [
      {
        id: "p1",
        studioId: "s1",
        name: "P",
        email: "a@b.c",
        type: "Wedding",
        stage: "booked",
        paidAmount: 0,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ],
    clients: [],
    sessions: [],
    shoots: [
      {
        id: "sess1",
        studioId: "s1",
        projectId: "p1",
        type: "Legacy only",
        status: "delivered",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ],
  }),
);
assert(shootFills.sessions.length === 1, "legacy shoot becomes session");
assert(shootFills.sessions[0]!.type === "Legacy only", "shoot fills gap");

assert(
  projectRoundTripPreserved({
    id: "p1",
    studioId: "s1",
    name: "P",
    email: "a@b.c",
    type: "Wedding",
    stage: "booked",
    paidAmount: 0,
    workflowStep: "deposit",
    cancelToken: "tok123",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  }),
  "projectRoundTripPreserved workflowStep/cancelToken",
);

// AURA-199: normalize field preservation (session)
const sessionPreserved = normalizeDb(
  baseDb({
    projects: [],
    clients: [],
    sessions: [
      {
        id: "s1",
        studioId: "s1",
        projectId: "p1",
        type: "Engagement",
        status: "booked",
        startsAt: "2026-06-01T10:00:00Z",
        endsAt: "2026-06-01T11:00:00Z",
        googleEventId: "gcal1",
        proposalId: "prop1",
        galleryId: "gal1",
        intakeAnswers: { q1: "a1" },
        wizardSkippedPrep: true,
        wizardSkippedProposal: false,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ],
    shoots: [],
  }),
);
assert(
  sessionPreserved.sessions[0]!.endsAt === "2026-06-01T11:00:00Z",
  "session endsAt preserved",
);
assert(sessionPreserved.sessions[0]!.googleEventId === "gcal1", "googleEventId preserved");
assert(sessionPreserved.sessions[0]!.proposalId === "prop1", "proposalId preserved");
assert(sessionPreserved.sessions[0]!.galleryId === "gal1", "galleryId preserved");
assert(
  sessionPreserved.sessions[0]!.intakeAnswers?.q1 === "a1",
  "intakeAnswers preserved",
);
assert(
  sessionPreserved.sessions[0]!.wizardSkippedPrep === true,
  "wizardSkippedPrep preserved",
);

// AURA-199: no dual-write — normalize does not create clients/shoots from projects/sessions
const noDualWrite = normalizeDb(
  baseDb({
    projects: [
      {
        id: "p1",
        studioId: "s1",
        name: "P",
        email: "a@b.c",
        type: "Wedding",
        stage: "booked",
        paidAmount: 0,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ],
    clients: [],
    sessions: [
      {
        id: "s1",
        studioId: "s1",
        projectId: "p1",
        type: "E",
        status: "booked",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ],
    shoots: [],
  }),
);
assert(noDualWrite.projects.length === 1, "projects from canonical");
assert(noDualWrite.sessions.length === 1, "sessions from canonical");
assert(noDualWrite.clients === noDualWrite.projects, "clients alias = projects (in-memory only)");
const shootsAlias = noDualWrite.shoots || [];
assert(
  shootsAlias.length === 1 && shootsAlias[0]!.id === "s1",
  "shoots alias = sessions (in-memory only)",
);

console.log("normalize.test: all assertions passed");
