import { readFileSync } from "fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const sa = JSON.parse(readFileSync(new URL("../serviceAccountKey.json", import.meta.url)));
const app =
  getApps()[0] ||
  initializeApp({
    credential: cert(sa),
    projectId: sa.project_id,
  });
const db = getFirestore(app);
const ref = db.collection("aura").doc("database");
const existing = await ref.get();
if (existing.exists) {
  console.log("Firestore already seeded.");
  process.exit(0);
}

const now = new Date().toISOString();
const watermarkId = nanoid();
const seed = {
  studio: {
    name: "Aura Studio",
    adminEmail: "admin@aura.studio",
    adminPasswordHash: bcrypt.hashSync("aura-admin", 10),
    defaultWatermarkPresetId: watermarkId,
    brandTagline: "Photography, delivered with care",
    printPartners: [
      {
        id: nanoid(),
        name: "Mixbook",
        url: "https://www.mixbook.com",
        note: "Beautiful albums and layflat books with strong color.",
      },
      {
        id: nanoid(),
        name: "Mpix",
        url: "https://www.mpix.com",
        note: "Reliable pro-quality prints and wall art.",
      },
    ],
  },
  watermarkPresets: [
    {
      id: watermarkId,
      name: "Studio text mark",
      mode: "text",
      text: "AURA",
      position: "center",
      opacity: 0.28,
    },
  ],
  packageTemplates: [
    {
      id: nanoid(),
      name: "Weddings",
      defaultPricing: [
        {
          id: nanoid(),
          name: "Signature",
          price: 4200,
          description: "Full coverage + gallery",
          highlighted: true,
        },
      ],
      contractTerms: "Retainer reserves your date. Gallery online 60 days.",
      inclusions: ["Online gallery for 60 days", "Sneak peek", "High-res downloads"],
      intakeQuestions: [
        { id: nanoid(), label: "Wedding date", type: "text", required: true },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ],
  clients: [],
  shoots: [],
  proposals: [],
  galleries: [],
  photos: [],
  comments: [],
  subAlbums: [],
  analyticsEvents: [],
  sessions: [],
  ideaCards: [],
  shotListTemplates: [],
  shootPlans: [],
};

await ref.set(seed);
console.log("Firestore seeded at aura/database");
