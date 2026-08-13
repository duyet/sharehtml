import { isStorageUnavailableError } from "../src/utils/document-storage.js";

describe("isStorageUnavailableError", () => {
  it("matches the R2 disabled-bucket error so callers can answer 503", () => {
    // The exact message the R2 binding throws when R2 is off for the account.
    const err = new Error("get: Please enable R2 through the Cloudflare Dashboard. (10042)");
    expect(isStorageUnavailableError(err)).toBe(true);
  });

  it("does not match ordinary application errors", () => {
    // These must keep returning 500 — treating a bug as a storage outage would
    // hide it behind a misleading status.
    expect(isStorageUnavailableError(new Error("doc.title is not a function"))).toBe(false);
    expect(isStorageUnavailableError(new TypeError("fetch failed"))).toBe(false);
  });

  it("ignores non-Error throwables", () => {
    expect(isStorageUnavailableError("enable R2")).toBe(false);
    expect(isStorageUnavailableError(null)).toBe(false);
  });
});
