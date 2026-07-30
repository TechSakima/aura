import { describe, expect, it } from "vitest";
import { cascadeProjectRename } from "./rename-project";
import type { AuraDatabase } from "@/lib/types";

function stubDb(partial: Partial<AuraDatabase>): AuraDatabase {
  return {
    studio: { id: "s1" } as AuraDatabase["studio"],
    projects: [],
    sessions: [],
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
  };
}

describe("cascadeProjectRename (AURA-102)", () => {
  it("updates auto titles only in auto mode", () => {
    const db = stubDb({
      galleries: [
        {
          id: "g1",
          studioId: "s1",
          projectId: "p1",
          title: "Ada gallery",
        } as AuraDatabase["galleries"][number],
        {
          id: "g2",
          studioId: "s1",
          projectId: "p1",
          title: "Ada custom album",
        } as AuraDatabase["galleries"][number],
      ],
      invoices: [
        {
          id: "i1",
          studioId: "s1",
          projectId: "p1",
          title: "Deposit — Ada",
        } as AuraDatabase["invoices"][number],
        {
          id: "i2",
          studioId: "s1",
          projectId: "p1",
          title: "Balance — Ada",
        } as AuraDatabase["invoices"][number],
      ],
    });

    cascadeProjectRename(db, "p1", "Ada", "Bea", "auto");

    expect(db.galleries[0]!.title).toBe("Bea gallery");
    expect(db.galleries[1]!.title).toBe("Ada custom album");
    expect(db.invoices[0]!.title).toBe("Deposit — Bea");
    expect(db.invoices[1]!.title).toBe("Balance — Bea");
  });

  it("rewrites custom titles when mode is all", () => {
    const db = stubDb({
      galleries: [
        {
          id: "g1",
          studioId: "s1",
          projectId: "p1",
          title: "Ada highlight reel",
        } as AuraDatabase["galleries"][number],
      ],
      paymentLinks: [
        {
          id: "l1",
          studioId: "s1",
          projectId: "p1",
          title: "Ada leftover",
          description: "Pay Ada",
        } as AuraDatabase["paymentLinks"][number],
      ],
    });

    cascadeProjectRename(db, "p1", "Ada", "Bea", "all");

    expect(db.galleries[0]!.title).toBe("Bea highlight reel");
    expect(db.paymentLinks[0]!.title).toBe("Bea leftover");
    expect(db.paymentLinks[0]!.description).toBe("Pay Bea");
  });
});
