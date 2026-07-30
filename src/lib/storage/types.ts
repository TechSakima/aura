export type MediaAcl = "private" | "public";

export type MediaBackend = "r2" | "firebase";

export type PutMediaResult = {
  path: string;
  /** Browse URL — proxy during cutover; may become signed/CDN later. */
  url: string;
  backend: MediaBackend;
};

export type SignedDownloadOpts = {
  expiresInSec?: number;
  /** Suggested download filename (Content-Disposition). */
  filename?: string;
};

export interface MediaStore {
  readonly backend: MediaBackend;
  put(opts: {
    buffer: Buffer;
    objectPath: string;
    contentType: string;
    acl: MediaAcl;
  }): Promise<PutMediaResult>;
  getBuffer(objectPath: string): Promise<Buffer>;
  delete(objectPath: string): Promise<void>;
  getSignedDownloadUrl(
    objectPath: string,
    opts?: SignedDownloadOpts,
  ): Promise<string>;
}
