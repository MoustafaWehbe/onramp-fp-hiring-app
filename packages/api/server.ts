import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { app } from "./app";
import { initializeDatabase } from "./src/lib/db";
import { listEnabledProviders } from "./src/lib/oauth/providers";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

/**
 * Say out loud which provider sign-ins are live.
 *
 * A provider with no credentials is not an error — it is simply switched off,
 * and the sign-in forms omit its button rather than offering one that can only
 * fail. But switched-off and broken look identical from the browser: no
 * button, no request, no message. Naming it at boot is the difference between
 * "Google sign-in is off because nobody set GOOGLE_CLIENT_ID" and an afternoon
 * spent hunting a rendering bug that was never there.
 */
function logOAuthProviders(): void {
  const enabled = listEnabledProviders();

  if (enabled.length === 0) {
    console.info(
      "OAuth sign-in: no providers configured — the \"Continue with…\" buttons are hidden. " +
        "Set GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET or GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET " +
        "in .env to enable them (see docs/oauth-sign-in.md).",
    );
    return;
  }

  console.info(`OAuth sign-in enabled for: ${enabled.join(", ")}`);
}

async function start(): Promise<void> {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.info(`API server running on http://localhost:${PORT}`);
      console.info(`Health check: http://localhost:${PORT}/health`);
      logOAuthProviders();
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
