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
  try {
    _gitHash = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    _gitHash = "unknown";
  }
  return _gitHash;
}

router.get("/version", (_req, res) => {
  res.json({ hash: getGitHash() });
});

export default router;
