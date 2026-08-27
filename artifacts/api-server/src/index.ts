import app from "./app";
import { logger } from "./lib/logger";
import fs from "node:fs";

// Loguj každý start/restart do súboru (viditeľné v histórii aj bez PM2 CLI)
function logStartup(status: "START" | "ERROR", detail?: string) {
  try {
    const line = `${new Date().toISOString()} ${status} pid=${process.pid} worker=${process.env["NODE_APP_INSTANCE"] ?? "0"} port=${process.env["PORT"] ?? "?"} ${detail ?? ""}\n`;
    fs.appendFileSync("/var/log/msbeton-deployments.log", line);
  } catch { /* neignoruj chyby loga — nechce crashovať kvôli logu */ }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logStartup("ERROR", String(err));
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  logStartup("START");
  // PM2 wait_ready: signalizuje že process je ready pre traffic (graceful reload)
  if (process.send) process.send("ready");
});
