import type { DocumentRow } from "../types.js";

/**
 * True when an error came from the R2 binding being unusable rather than from
 * the request itself — for example the bucket being disabled at the account
 * level, which R2 reports as error code 10042.
 */
export function isStorageUnavailableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.message.includes("(10042)") || err.message.includes("enable R2");
}

export function getLegacyDocumentKey(id: string, filename: string): string {
  return `${id}/${filename}`;
}

export function getRenderedDocumentKey(id: string, filename: string): string {
  return `${id}/rendered/${filename}`;
}

export function getSourceDocumentKey(id: string, filename: string): string {
  return `${id}/source/${filename}`;
}

export async function getRenderedObject(
  bucket: R2Bucket,
  id: string,
  doc: Pick<DocumentRow, "filename" | "rendered_filename">,
): Promise<R2ObjectBody | null> {
  const renderedFilename = doc.rendered_filename || doc.filename;
  const legacyKey = getLegacyDocumentKey(id, renderedFilename);
  const preferredKey = doc.rendered_filename
    ? getRenderedDocumentKey(id, renderedFilename)
    : legacyKey;

  const preferredObject = await bucket.get(preferredKey);
  if (preferredObject) {
    return preferredObject;
  }

  if (preferredKey !== legacyKey) {
    const legacyObject = await bucket.get(legacyKey);
    if (legacyObject) {
      return legacyObject;
    }
  }

  return null;
}

export async function getSourceObject(
  bucket: R2Bucket,
  id: string,
  doc: Pick<DocumentRow, "source_filename">,
): Promise<R2ObjectBody | null> {
  if (!doc.source_filename) {
    return null;
  }

  return bucket.get(getSourceDocumentKey(id, doc.source_filename));
}
