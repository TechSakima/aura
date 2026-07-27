import { nanoid } from "nanoid";
import type { AuraDatabase, Studio } from "@/lib/types";

export function createEmptyStudio(opts: {
  id?: string;
  name: string;
  ownerEmail: string;
}): Studio {
  const now = new Date().toISOString();
  return {
    id: opts.id || nanoid(),
    name: opts.name.trim() || "My Studio",
    ownerEmail: opts.ownerEmail.toLowerCase(),
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
    createdAt: now,
    updatedAt: now,
  };
}

/** Fresh workspace for a newly signed-up studio. */
export function createStudioDatabase(studio: Studio): AuraDatabase {
  const now = new Date().toISOString();
  const watermarkId = nanoid();
  const weddingPkg = nanoid();
  const maternityPkg = nanoid();
  const miniPkg = nanoid();
  const studioId = studio.id;

  return {
    studio: {
      ...studio,
      defaultWatermarkPresetId: watermarkId,
    },
    watermarkPresets: [
      {
        id: watermarkId,
        studioId,
        name: "Studio text mark",
        mode: "text",
        text: studio.name.slice(0, 24).toUpperCase() || "STUDIO",
        position: "bottom-right",
        opacity: 0.35,
        scale: 0.14,
      },
    ],
    packageTemplates: [
      {
        id: weddingPkg,
        studioId,
        name: "Weddings",
        defaultPricing: [
          {
            id: nanoid(),
            name: "Essential",
            price: 2800,
            description: "8 hours coverage, online gallery, sneak peek",
          },
          {
            id: nanoid(),
            name: "Signature",
            price: 4200,
            description: "10 hours, second shooter, heirloom album credit",
            highlighted: true,
          },
          {
            id: nanoid(),
            name: "Legacy",
            price: 5800,
            description: "Full day, engagement session, premium album",
          },
        ],
        inclusions: [
          "Online gallery for 60 days",
          "Sneak peek within 48 hours",
          "High-resolution downloads",
          "Print partner guidance",
        ],
        contractTerms:
          "A non-refundable retainer reserves your date. Remaining balance is due 14 days before the event. Images are delivered via online gallery for 60 days. Copyright remains with the photographer; personal print/use rights are granted to the clients.",
        intakeQuestions: [
          {
            id: nanoid(),
            label: "Wedding date",
            type: "date",
            required: true,
          },
          {
            id: nanoid(),
            label: "Ceremony & reception venues",
            type: "textarea",
            required: true,
          },
          {
            id: nanoid(),
            label: "Must-have moments",
            type: "textarea",
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: maternityPkg,
        studioId,
        name: "Maternity",
        defaultPricing: [
          {
            id: nanoid(),
            name: "Studio Session",
            price: 450,
            description: "60 minutes, 25 edited images",
            highlighted: true,
          },
          {
            id: nanoid(),
            name: "Outdoor Session",
            price: 550,
            description: "75 minutes, 35 edited images",
          },
        ],
        inclusions: [
          "Styled guidance",
          "Online gallery for 60 days",
          "Print-ready downloads",
        ],
        contractTerms:
          "Session fee is due at booking. Reschedules require 48 hours notice. Gallery remains online for 60 days.",
        intakeQuestions: [
          {
            id: nanoid(),
            label: "Due date",
            type: "date",
            required: true,
          },
          {
            id: nanoid(),
            label: "Preferred location vibe",
            type: "select",
            options: ["Soft studio", "Golden outdoor", "Urban"],
            required: true,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: miniPkg,
        studioId,
        name: "Mini-Sessions",
        defaultPricing: [
          {
            id: nanoid(),
            name: "Mini",
            price: 225,
            description: "20 minutes, 10 edited images",
            highlighted: true,
          },
        ],
        inclusions: ["Timed slot", "Online gallery", "Social-ready sneak peeks"],
        contractTerms:
          "Mini-session slots are non-transferable. Arrival more than 10 minutes late may shorten the session.",
        intakeQuestions: [
          {
            id: nanoid(),
            label: "Who will be photographed?",
            type: "text",
            required: true,
          },
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
    ideaCards: [],
    shotListTemplates: [
      {
        id: nanoid(),
        studioId,
        name: "Wedding full day",
        shootType: "Weddings",
        items: [
          {
            id: nanoid(),
            label: "Getting ready details",
            category: "Documentary",
            section: "Documentary",
            mustHave: true,
          },
          {
            id: nanoid(),
            label: "Dress on hanger",
            category: "Detail",
            section: "Detail",
            mustHave: true,
          },
          {
            id: nanoid(),
            label: "Rings",
            category: "Close-up",
            section: "Close-up",
            mustHave: true,
          },
          {
            id: nanoid(),
            label: "First look",
            category: "Couple",
            section: "Couple",
            mustHave: true,
          },
          {
            id: nanoid(),
            label: "Ceremony aisle",
            category: "Wide",
            section: "Wide",
            mustHave: true,
          },
          {
            id: nanoid(),
            label: "Vows",
            category: "Close-up",
            section: "Close-up",
            mustHave: true,
          },
          {
            id: nanoid(),
            label: "Family formals",
            category: "Group",
            section: "Group",
            mustHave: true,
          },
          {
            id: nanoid(),
            label: "Wedding party",
            category: "Group",
            section: "Group",
            mustHave: true,
          },
          {
            id: nanoid(),
            label: "Couples portraits",
            category: "Couple",
            section: "Couple",
            mustHave: true,
          },
          {
            id: nanoid(),
            label: "Backdrop portraits",
            category: "Backdrop showcase",
            section: "Backdrop showcase",
            mustHave: false,
          },
          {
            id: nanoid(),
            label: "Golden hour",
            category: "Couple",
            section: "Couple",
            mustHave: false,
          },
          {
            id: nanoid(),
            label: "Reception entrance",
            category: "Reception",
            section: "Reception",
            mustHave: true,
          },
          {
            id: nanoid(),
            label: "First dance",
            category: "Reception",
            section: "Reception",
            mustHave: true,
          },
          {
            id: nanoid(),
            label: "Cake cutting",
            category: "Reception",
            section: "Reception",
            mustHave: false,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ],
    shootPlans: [],
  };
}

/** @deprecated use createStudioDatabase */
export function createSeedDatabase(): AuraDatabase {
  const studio = createEmptyStudio({
    name: "Aura Studio",
    ownerEmail: "admin@aura.studio",
  });
  return createStudioDatabase(studio);
}
