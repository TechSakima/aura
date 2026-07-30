import type { AuraDatabase, Studio } from "@/lib/types";

/** Strip secrets / credentials from studio for export (AURA-347). */
export function studioProfileForExport(studio: Studio) {
  const { googleCalendarRefreshToken: _token, homepage, ...rest } = studio;
  return {
    ...rest,
    googleCalendarConnected: Boolean(studio.googleCalendarRefreshToken?.trim()),
    homepage: homepage
      ? {
          enabled: homepage.enabled,
          slug: homepage.slug,
          biography: homepage.biography,
          showBiography: homepage.showBiography,
          showSocialLinks: homepage.showSocialLinks,
          showWebsite: homepage.showWebsite,
          showEmail: homepage.showEmail,
          showPhone: homepage.showPhone,
          showAddress: homepage.showAddress,
          showBooking: homepage.showBooking,
          showContactForm: homepage.showContactForm,
          layout: homepage.layout,
          sortOrder: homepage.sortOrder,
          hasPassword: Boolean(homepage.passwordHash),
        }
      : undefined,
  };
}

export function buildStudioExport(db: AuraDatabase) {
  const projects = db.projects.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    notes: p.notes,
    type: p.type,
    stage: p.stage,
    projectDate: p.projectDate,
    paidAmount: p.paidAmount,
    workflowStep: p.workflowStep,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  const sessions = db.sessions.map((s) => ({
    id: s.id,
    projectId: s.projectId,
    type: s.type,
    status: s.status,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    galleryId: s.galleryId,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));

  const photoCountByGallery = new Map<string, number>();
  for (const photo of db.photos) {
    if (!photo.galleryId) continue;
    photoCountByGallery.set(
      photo.galleryId,
      (photoCountByGallery.get(photo.galleryId) || 0) + 1,
    );
  }

  const galleries = db.galleries.map((g) => ({
    id: g.id,
    projectId: g.projectId,
    sessionId: g.sessionId,
    title: g.title,
    status: g.status,
    photoCount: photoCountByGallery.get(g.id) || 0,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
    expiresAt: g.expiresAt,
  }));

  return {
    exportedAt: new Date().toISOString(),
    format: "aura-studio-export-v1",
    mediaNote:
      "Photo and video files are not included. Download originals from each gallery while links are live.",
    studio: studioProfileForExport(db.studio),
    projects,
    sessions,
    galleries,
    sessionTypes: db.sessionTypes.map((t) => ({
      id: t.id,
      name: t.name,
      durationMinutes: t.durationMinutes,
      basePrice: t.basePrice,
      depositAmount: t.depositAmount,
      active: t.active,
    })),
    counts: {
      projects: projects.length,
      sessions: sessions.length,
      galleries: galleries.length,
      photos: db.photos.length,
    },
  };
}
