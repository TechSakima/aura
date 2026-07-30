import {
  ADMIN_PALETTE_PAGES,
  filterAdminPaletteItems,
  projectToPaletteItem,
} from "./admin-command-palette";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`admin-command-palette.test: ${msg}`);
}

const projects = [
  projectToPaletteItem({ id: "1", name: "Ada Wedding", email: "ada@x.com" }),
  projectToPaletteItem({ id: "2", name: "Ben Portrait", email: "ben@y.com" }),
  projectToPaletteItem({ id: "3", name: "Zoe", email: "" }),
];
const all = [...ADMIN_PALETTE_PAGES, ...projects];

const empty = filterAdminPaletteItems(all, "");
assert(empty.some((i) => i.group === "page"), "empty query includes pages");
assert(
  empty.filter((i) => i.group === "project").length === 3,
  "empty query lists projects up to limit",
);

const byName = filterAdminPaletteItems(all, "ada");
assert(byName[0]?.id === "project-1", "name match ranks project first");

const byEmail = filterAdminPaletteItems(all, "ben@y");
assert(byEmail[0]?.id === "project-2", "email match finds project");

const pageHit = filterAdminPaletteItems(all, "book");
assert(pageHit[0]?.id === "page-bookings", "page prefix match");

console.log("admin-command-palette.test: all assertions passed");
