import { Command } from "commander";
import { stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { createInterface } from "node:readline";
import {
  deployContent,
  deployDocument,
  findDocumentByFilename,
  getDocument,
  getDocumentUrl,
  updateContent,
  updateDocument,
} from "../api/client.js";
import { readStdin } from "../utils/stdin.js";
import { deploymentRequiresLogin } from "../auth/capabilities.js";
import { getDocumentMapping, removeDocumentMapping, setDocumentMapping, getAuthToken } from "../config/store.js";
import { updateDocumentSharing } from "./share-utils.js";
import { renderedFilenameToHtml } from "../utils/document-render.js";

function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((r) =>
    rl.question(question + " (y/n) ", (a) => {
      rl.close();
      r(a.trim().toLowerCase() === "y");
    }),
  );
}

function generateFilename(opts: { slug?: string; title?: string; type?: "html" | "markdown" | "code" }): string {
  const ext = opts.type === "markdown" ? ".md" : opts.type === "code" ? ".txt" : ".html";
  if (opts.slug) {
    return `${opts.slug}${ext}`;
  }
  if (opts.title) {
    const slugified = opts.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `${slugified}${ext}`;
  }
  return `stdin${ext}`;
}

export const deployCmd = new Command("deploy")
  .aliases(["publish", "public"])
  .description("Deploy an HTML, Markdown, or code file and get a shareable link")
  .argument("[file]", "Path to HTML, Markdown, or code file")
  .option("-t, --title <title>", "Document title (defaults to filename)")
  .option("-u, --update", "Update existing document without prompting")
  .option("--share", "Make the document shareable after deploy")
  .option("--private", "Keep the document private after deploy")
  .option("--slug <slug>", "Custom slug for the document")
  .option("--content <html>", "HTML content string (alternative to file path)")
  .option("--type <type>", "Content type: html, markdown, code (default: html)")
  .option("--language <lang>", "Language for code highlighting (with --type code)")
  .option("--tags <tags>", "Comma-separated tags for the document")
  .option("--name <name>", "Custom filename (for URL sources)")
  .action(async (file: string | undefined, opts: {
    title?: string;
    update?: boolean;
    share?: boolean;
    private?: boolean;
    slug?: string;
    content?: string;
    type?: "html" | "markdown" | "code";
    language?: string;
    tags?: string;
    name?: string;
  }) => {
    if (opts.share && opts.private) {
      console.error("Error: choose either --share or --private, not both");
      process.exit(1);
    }

    // Parse tags
    const tags = opts.tags ? opts.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

    let contentString: string | undefined;
    let isNonFileSource = false;

    if (opts.content) {
      contentString = opts.content;
      isNonFileSource = true;
    } else if (!file && !process.stdin.isTTY) {
      const buffer = await readStdin();
      if (buffer.length === 0) {
        console.error("Error: No content received from stdin");
        process.exit(1);
      }
      contentString = buffer.toString("utf-8");
      isNonFileSource = true;
    } else if (file && (file.startsWith("http://") || file.startsWith("https://"))) {
      console.log(`Fetching ${file}...`);
      try {
        const response = await fetch(file);
        if (!response.ok) {
          console.error(`Error: Failed to fetch URL: ${response.status} ${response.statusText}`);
          process.exit(1);
        }
        const contentLength = response.headers.get("content-length");
        if (contentLength) {
          const size = parseInt(contentLength, 10);
          if (size > 10 * 1024 * 1024) {
            console.error(`Error: Remote file too large (${(size / 1024 / 1024).toFixed(1)}MB). Maximum is 10MB.`);
            process.exit(1);
          }
        }
        contentString = await response.text();
        isNonFileSource = true;
      } catch (err) {
        console.error(`Error: Failed to fetch URL - ${(err as Error).message}`);
        process.exit(1);
      }
    }

    if (isNonFileSource) {
      const filename = opts.name ?? (file && (file.startsWith("http://") || file.startsWith("https://"))
        ? new URL(file).pathname.split("/").filter(Boolean).pop() ?? "index.html"
        : generateFilename(opts));
      const sourceKind = opts.type ?? "html";
      const sourceLanguage = opts.language;

      try {
        const supportsPrivateDocuments = await deploymentRequiresLogin();
        if (opts.private && !supportsPrivateDocuments) {
          throw new Error("Private documents require Cloudflare Access on this deployment.");
        }

        const isAuthenticated = getAuthToken() !== undefined;
        // Only check for existing documents if authenticated (anonymous users can't update)
        const existing = isAuthenticated ? await findDocumentByFilename(filename, "source") : null;
        if (existing && !opts.update) {
          const existingUrl = getDocumentUrl(existing.id);
          console.error(`Document already exists at ${existingUrl}`);
          console.error(`Re-run with --update to overwrite.`);
          process.exit(1);
        }

        if (existing) {
          console.log(`Updating ${filename}...`);
          const result = await updateContent(existing.id, contentString!, filename, {
            title: opts.title,
            sourceKind,
            sourceLanguage,
            tags,
          });
          let isShared = result.isShared;
          if ((opts.share || opts.private) && supportsPrivateDocuments) {
            const updated = await updateDocumentSharing(existing.id, Boolean(opts.share));
            isShared = updated.isShared;
          }
          console.log(`\nUpdated! ${result.url}`);
          console.log(`  Size: ${(result.size / 1024).toFixed(1)}KB`);
          console.log(`  Comments: ${result.commentsUrl}`);
          console.log(`  Delete:   ${result.deleteUrl}`);
        } else {
          console.log(`Deploying ${filename}...`);
          const result = await deployContent(contentString!, filename, {
            title: opts.title,
            slug: opts.slug,
            sourceKind,
            sourceLanguage,
            tags,
          });
          let isShared = result.isShared;
          if ((opts.share || opts.private) && supportsPrivateDocuments) {
            const updated = await updateDocumentSharing(result.id, Boolean(opts.share));
            isShared = updated.isShared;
          }
          console.log(`\nDeployed! ${result.url}`);
          console.log(`  Size: ${(result.size / 1024).toFixed(1)}KB`);
          console.log(`  Comments: ${result.commentsUrl}`);
          console.log(`  Delete:   ${result.deleteUrl}`);
          if (!opts.share && !opts.private && !isShared) {
            const lookupFilename = renderedFilenameToHtml(filename);
            console.log(`  next:  run 'npx @duet/sharehtml share ${lookupFilename}' to make it shareable`);
          }
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
      return;
    }

    if (!file) {
      console.error("Error: provide a file path, pipe content via stdin, or use --content");
      process.exit(1);
    }

    const filePath = resolve(file);

    try {
      const stats = await stat(filePath);
      if (!stats.isFile()) {
        console.error(`Error: ${file} is not a file`);
        process.exit(1);
      }
    } catch {
      console.error(`Error: ${file} not found`);
      process.exit(1);
    }

    try {
      const supportsPrivateDocuments = await deploymentRequiresLogin();
      if (opts.private && !supportsPrivateDocuments) {
        throw new Error("Private documents require Cloudflare Access on this deployment.");
      }

      const filename = basename(filePath);
      const lookupFilename = renderedFilenameToHtml(filename);
      const mappedDocumentId = getDocumentMapping(filePath);
      const isAuthenticated = getAuthToken() !== undefined;
      let existing = null;

      // Only check for existing documents if authenticated (anonymous users can't update)
      if (isAuthenticated) {
        if (mappedDocumentId) {
          try {
            existing = await getDocument(mappedDocumentId);
          } catch {
            removeDocumentMapping(filePath);
          }
        }

        if (!existing) {
          existing = await findDocumentByFilename(filename, "source");
        }

        if (!existing && lookupFilename !== filename) {
          existing = await findDocumentByFilename(lookupFilename, "rendered");
        }
      }

      if (existing) {
        const existingUrl = getDocumentUrl(existing.id);

        if (!opts.update) {
          const yes = await confirm(
            `Document '${filename}' already exists at ${existingUrl}. Update it?`,
          );
          if (!yes) {
            console.log("Aborted.");
            return;
          }
        }

        console.log(`Updating ${file}...`);
        const result = await updateDocument(existing.id, filePath, opts.title, tags);
        let isShared = result.isShared;
        if ((opts.share || opts.private) && supportsPrivateDocuments) {
          const updated = await updateDocumentSharing(existing.id, Boolean(opts.share));
          isShared = updated.isShared;
        }
        setDocumentMapping(filePath, result.id);
        console.log(`\nUpdated! ${result.url}`);
        console.log(`  id:       ${result.id}`);
        console.log(`  title:    ${result.title}`);
        console.log(`  size:     ${(result.size / 1024).toFixed(1)}KB`);
        console.log(`  share:    ${isShared ? "shareable" : "private"}`);
        console.log(`  html:     ${result.url}`);
        console.log(`  comments: ${result.commentsUrl}`);
        console.log(`  delete:   ${result.deleteUrl}`);
        console.log(`  source: ${result.url}/source`);
      } else {
        console.log(`Deploying ${file}...`);
        const result = await deployDocument(filePath, opts.title, opts.slug, tags);
        let isShared = result.isShared;
        if ((opts.share || opts.private) && supportsPrivateDocuments) {
          const updated = await updateDocumentSharing(result.id, Boolean(opts.share));
          isShared = updated.isShared;
        }
        setDocumentMapping(filePath, result.id);
        console.log(`\nDeployed! ${result.url}`);
        console.log(`  id:    ${result.id}`);
        console.log(`  title: ${result.title}`);
        console.log(`  size:  ${(result.size / 1024).toFixed(1)}KB`);
        console.log(`  share: ${isShared ? "shareable" : "private"}`);
        console.log(`  html:  ${result.url}`);
        console.log(`  source: ${result.url}/source`);
        if (!opts.share && !opts.private && !isShared) {
          console.log(`  next:  run 'npx @duet/sharehtml share ${lookupFilename}' to make it shareable`);
        }
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });
