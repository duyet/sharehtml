import { Command } from "commander";
import { addDocumentTag, removeDocumentTag, getDocumentTags, getAllTags } from "../api/client.js";
import { resolveDocumentReference } from "./share-utils.js";

export const tagCmd = new Command("tag")
  .description("Manage tags on a document")
  .argument("[document]", "Document ID or filename")
  .option("--add <tag>", "Add a tag")
  .option("--remove <tag>", "Remove a tag")
  .option("--list", "List tags for a document")
  .option("--all", "List all your tags")
  .action(async (document: string | undefined, opts: { add?: string; remove?: string; list?: boolean; all?: boolean }) => {
    try {
      if (opts.all) {
        const tags = await getAllTags();
        if (tags.length === 0) {
          console.log("No tags found.");
          return;
        }
        for (const { tag, count } of tags) {
          console.log(`  ${tag} (${count})`);
        }
        return;
      }

      if (!document) {
        console.error("Error: document argument is required unless using --all");
        process.exit(1);
      }

      const doc = await resolveDocumentReference(document);
      if (!doc) {
        console.error(`Error: Document not found: ${document}`);
        process.exit(1);
      }

      if (opts.add) {
        await addDocumentTag(doc.id, opts.add);
        console.log(`Added tag "${opts.add}" to ${doc.title}`);
        return;
      }

      if (opts.remove) {
        await removeDocumentTag(doc.id, opts.remove);
        console.log(`Removed tag "${opts.remove}" from ${doc.title}`);
        return;
      }

      // Default: list tags
      const tags = await getDocumentTags(doc.id);
      if (tags.length === 0) {
        console.log(`No tags on ${doc.title}`);
        return;
      }
      console.log(`Tags on ${doc.title}:`);
      for (const tag of tags) {
        console.log(`  ${tag}`);
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });
