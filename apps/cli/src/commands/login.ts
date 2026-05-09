import { Command } from "commander";
import { loginWithAccess } from "../auth/access.js";
import { loginWithClerk, detectClerkDeployment } from "../auth/clerk.js";
import { printSetupHint } from "../config/help.js";
import { getConfig, isConfigured } from "../config/store.js";

export const loginCmd = new Command("login")
  .description("Log in for CLI requests")
  .action(async () => {
    try {
      if (!isConfigured()) {
        console.error("Error: Not configured. Run: npx @duyet/sharehtml config set-url <url>");
        printSetupHint();
        process.exit(1);
      }

      const { workerUrl } = getConfig();
      console.log(`Logging in to ${workerUrl}...`);

      const isClerk = await detectClerkDeployment(workerUrl);
      if (isClerk) {
        await loginWithClerk(workerUrl);
      } else {
        await loginWithAccess(workerUrl);
      }

      console.log("Login complete.");
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });
