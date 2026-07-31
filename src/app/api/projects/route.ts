import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import {
  parseAdminListPage,
  slicePage,
} from "@/lib/admin-list-page";
import { allocateProjectAdminSlug } from "@/lib/admin-slug";
import {
  listProjectsForStudio,
  listSessionsForStudio,
  updateStudioDb,
} from "@/lib/db/store";
import { publicToken } from "@/lib/tokens";
import type { Project } from "@/lib/types";

/**
 * Canonical projects list/create (AURA-155).
 * AURA-268: scoped project reads + pagination; `options=1` for selects.
 */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const projects = await listProjectsForStudio(admin.studioId);

  if (url.searchParams.get("options") === "1") {
    const includeArchived = url.searchParams.get("includeArchived") === "1";
    const options = projects
      .filter((p) => includeArchived || p.stage !== "archived")
      .map((p) => ({ id: p.id, name: p.name, email: p.email || "" }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ projects: options });
  }

  const { offset, limit } = parseAdminListPage(url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const stageFilter = (url.searchParams.get("stage") || "").trim();
  const workflowFilter = (url.searchParams.get("workflowStep") || "").trim();
  const includeArchived =
    url.searchParams.get("includeArchived") === "1" ||
    stageFilter === "archived";
  const withSessions = url.searchParams.get("sessions") === "1";

  let filtered = projects.filter((p) => {
    if (!includeArchived && p.stage === "archived") return false;
    if (stageFilter && (p.stage || "inquiry") !== stageFilter) return false;
    if (
      workflowFilter &&
      (p.workflowStep || "inquiry") !== workflowFilter
    ) {
      return false;
    }
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q) ||
      (p.phone || "").includes(q)
    );
  });
  filtered = filtered.sort((a, b) => {
    const aAt = a.updatedAt || a.createdAt || "";
    const bAt = b.updatedAt || b.createdAt || "";
    return bAt.localeCompare(aAt);
  });

  const page = slicePage(filtered, offset, limit);

  if (!withSessions) {
    return NextResponse.json({
      projects: page.items,
      total: page.total,
      hasMore: page.hasMore,
      offset,
      limit,
    });
  }

  const sessions = await listSessionsForStudio(admin.studioId);
  const sessionsByProject = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const list = sessionsByProject.get(s.projectId) || [];
    list.push(s);
    sessionsByProject.set(s.projectId, list);
  }

  return NextResponse.json({
    projects: page.items.map((p) => ({
      ...p,
      sessions: sessionsByProject.get(p.id) || [],
    })),
    total: page.total,
    hasMore: page.hasMore,
    offset,
    limit,
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.name) {
    return NextResponse.json(
      { error: "Name required" },
      { status: 400 },
    );
  }
  const now = new Date().toISOString();
  const project: Project = {
    id: nanoid(),
    studioId: admin.studioId,
    name: String(body.name),
    email: String(body.email || "").trim(),
    phone: body.phone ? String(body.phone).trim() : undefined,
    notes: body.notes ? String(body.notes) : undefined,
    type: body.type ? String(body.type) : "Session",
    stage: body.stage || "inquiry",
    projectDate: body.projectDate ? String(body.projectDate) : undefined,
    paidAmount: typeof body.paidAmount === "number" ? body.paidAmount : 0,
    cancelToken: publicToken(24),
    createdAt: now,
    updatedAt: now,
  };
  await updateStudioDb(admin.studioId, (db) => {
    project.adminSlug = allocateProjectAdminSlug(db, project.name, project.id);
    db.projects.unshift(project);
  });
  return NextResponse.json({ project, sessions: [] });
}
