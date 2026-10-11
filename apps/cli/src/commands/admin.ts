import { Command } from "commander";
import { adminListDocuments, adminListReports, adminSetDisabled } from "../api/client.js";

function fail(err: unknown): never {
  console.error(`Error: ${(err as Error).message}`);
  process.exit(1);
}

function parseLimit(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const limit = Number.parseInt(value, 10);
  if (!Number.isFinite(limit) || limit <= 0) throw new Error("--limit must be a positive number");
  return limit;
}

export const adminCmd = new Command("admin").description(
  "Moderation commands (requires your email in the server's ADMIN_EMAILS)",
);

adminCmd
  .command("disable")
  .description("Take down a document; viewers get HTTP 451")
  .argument("<id>", "Document ID")
  .option("-r, --reason <reason>", "Reason stored with the takedown", "abuse")
  .action(async (id: string, opts: { reason: string }) => {
    try {
      const doc = await adminSetDisabled(id, true, opts.reason);
      console.log(`Disabled ${doc.id}: ${doc.title}`);
      console.log(`  reason: ${doc.disabled_reason}`);
    } catch (err) {
      fail(err);
    }
  });

adminCmd
  .command("enable")
  .description("Restore a disabled document")
  .argument("<id>", "Document ID")
  .action(async (id: string) => {
    try {
      const doc = await adminSetDisabled(id, false);
      console.log(`Enabled ${doc.id}: ${doc.title}`);
    } catch (err) {
      fail(err);
    }
  });

adminCmd
  .command("reports")
  .description("List recent abuse reports")
  .option("-n, --limit <n>", "Maximum reports to show")
  .action(async (opts: { limit?: string }) => {
    try {
      const reports = await adminListReports(parseLimit(opts.limit));
      if (reports.length === 0) {
        console.log("No reports.");
        return;
      }
      for (const report of reports) {
        const status = report.doc_disabled_at ? "disabled" : report.doc_title === null ? "deleted" : "live";
        console.log(`${report.created_at}  ${report.doc_id}  [${report.reason}]  ${status}  by ${report.reporter}`);
        if (report.doc_title) console.log(`  title: ${report.doc_title}  owner: ${report.doc_owner_email}`);
        if (report.details) console.log(`  details: ${report.details}`);
      }
    } catch (err) {
      fail(err);
    }
  });

adminCmd
  .command("docs")
  .description("List recently published documents for review")
  .option("-n, --limit <n>", "Maximum documents to show")
  .action(async (opts: { limit?: string }) => {
    try {
      const documents = await adminListDocuments(parseLimit(opts.limit));
      for (const doc of documents) {
        const flags = [
          doc.is_shared === 1 ? "link" : doc.is_shared === 2 ? "emails" : "private",
          doc.listed ? "listed" : null,
          doc.disabled_at ? "disabled" : null,
          doc.expires_at ? `expires ${doc.expires_at}` : null,
        ].filter(Boolean);
        console.log(`${doc.created_at}  ${doc.id}  ${doc.title}  (${doc.owner_email})  ${flags.join(", ")}`);
      }
    } catch (err) {
      fail(err);
    }
  });
