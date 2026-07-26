import os from "os";
import path from "path";

/** Transient Sharp / upload scratch only — never the system of record. */
export const TMP_DIR = path.join(os.tmpdir(), "aura-tmp");
export const TMP_ORIGINALS_DIR = path.join(TMP_DIR, "originals");
export const TMP_DERIVATIVES_DIR = path.join(TMP_DIR, "derivatives");
export const TMP_WATERMARKS_DIR = path.join(TMP_DIR, "watermarks");

/** @deprecated Local durable paths removed — use Firebase Storage. */
export const DATA_DIR = TMP_DIR;
export const UPLOADS_DIR = TMP_DIR;
export const ORIGINALS_DIR = TMP_ORIGINALS_DIR;
export const DERIVATIVES_DIR = TMP_DERIVATIVES_DIR;
export const WATERMARKS_DIR = TMP_WATERMARKS_DIR;
export const DB_PATH = path.join(TMP_DIR, "unused-aura.json");
