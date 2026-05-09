import { detectClerkDeployment } from "./clerk.js";
import { getConfig, getAuthToken, isConfigured } from "../config/store.js";

export async function deploymentRequiresLogin(): Promise<boolean> {
  if (!isConfigured()) {
    throw new Error("Not configured. Run: npx @duyet/sharehtml config set-url <url>");
  }

  if (getAuthToken()) {
    return false;
  }

  const { workerUrl } = getConfig();

  if (await detectClerkDeployment(workerUrl)) {
    return true;
  }

  const response = await fetch(workerUrl, { redirect: "manual" });
  if (response.ok) {
    return false;
  }

  const location = response.headers.get("location") || "";
  return response.status >= 300 && response.status < 400 &&
    (location.includes("cloudflareaccess.com") || location.includes("/cdn-cgi/access/login"));
}
