const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

export function nanoid(size = 5): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  let id = "";
  for (let i = 0; i < size; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}

export function generateSlug(filename: string, suffix?: string): string {
  let base = filename.replace(/\.(html?|md|markdown)$/i, "");
  base = base.toLowerCase();
  base = base.replace(/[^a-z0-9]+/g, "-");
  base = base.replace(/^-+|-+$/g, "");
  
  if (base.length < 5) {
    base = base.padEnd(5, "0");
  }

  if (suffix) {
    return `${base}-${suffix}`;
  }
  
  return base;
}
