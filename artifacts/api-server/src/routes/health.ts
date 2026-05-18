import { Router, type IRouter } from "express";
import { execSync } from "child_process";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

let _gitHash: string | null = null;
function getGitHash(): string {
  if (_gitHash) return _gitHash;
  const candidates = [process.cwd(), "/var/www/msbeton", "/app"];
  for (const cwd of candidates) {
    try {
      const h = execSync("git rev-parse --short HEAD", { cwd, encoding: "utf8", timeout: 2000 }).trim();
      if (h) { _gitHash = h; return _gitHash; }
    } catch { /* try next */ }
  }
  return "unknown"; // intentionally not cached — retry on next request
}

router.get("/version", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ hash: getGitHash() });
});

export default router;
