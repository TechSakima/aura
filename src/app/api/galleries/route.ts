import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/db/store";
import { hashPin, PinValidationError } from "@/lib/pin";
import { publicToken } from "@/lib/tokens";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readDb();
  return NextResponse.json({
    galleries: db.galleries.map(({ downloadPinHash: _, ...g }) => g),
    shoots: db.shoots,
    clients: db.clients.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
    })),
    watermarkPresets: db.watermarkPresets,
    photoCounts: db.photos.reduce<Record<string, number>>((acc, p) => {
      acc[p.galleryId] = (acc[p.galleryId] || 0) + 1;
      return acc;
    }, {}),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.shootId || !body.title || !body.pin) {
    return NextResponse.json(
      { error: "shootId, title, and a 4-digit pin are required" },
      { status: 400 },
    );
  }

  try {
    const pinHash = await hashPin(String(body.pin));
    const now = new Date();
    const live = body.goLive !== false;
    const liveAt = live ? now.toISOString() : undefined;
    const expiresAt = new Date(
      now.getTime() + 60 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const gallery = {
      id: nanoid(),
      shootId: String(body.shootId),
      publicToken: publicToken(),
      title: String(body.title),
      downloadPinHash: pinHash,
      commentsEnabled: Boolean(body.commentsEnabled),
      watermarkEnabled: body.watermarkEnabled !== false,
      watermarkPresetId: body.watermarkPresetId,
      selectLimit: body.selectLimit != null ? Number(body.selectLimit) : undefined,
      expiresAt,
      liveAt,
      status: live ? ("live" as const) : ("draft" as const),
      favoritePhotoIds: [] as string[],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const db = await readDb();
    if (!db.shoots.some((s) => s.id === gallery.shootId)) {
      return NextResponse.json({ error: "Shoot not found" }, { status: 400 });
    }

    await updateDb((d) => {
      d.galleries.unshift(gallery);
      const shoot = d.shoots.find((s) => s.id === gallery.shootId);
      if (shoot) {
        shoot.galleryId = gallery.id;
        if (live) shoot.status = "delivered";
        shoot.updatedAt = now.toISOString();
      }
    });

    return NextResponse.json({
      gallery: { ...gallery, downloadPinHash: undefined, pin: String(body.pin) },
    });
  } catch (e) {
    if (e instanceof PinValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
