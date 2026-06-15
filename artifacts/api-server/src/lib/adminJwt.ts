import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const SECRET = process.env.ADMIN_JWT_SECRET ?? "dev-insecure-change-in-prod";

// Hierarchia: admin (superadmin msbeton) > manager (Správca) > reader (Čítateľ)
export type AdminRole = "admin" | "manager" | "reader";

export function signAdminToken(role: AdminRole = "admin"): string {
  return jwt.sign({ role }, SECRET, { expiresIn: "30d" });
}

// Overí JWT a uloží rolu do req.adminRole. Povolí admin/manager/reader.
export function requireAdminJwt(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(auth.slice(7), SECRET) as { role?: string };
    const role = payload.role === "reader" ? "reader" : payload.role === "manager" ? "manager" : "admin";
    (req as Request & { adminRole?: string }).adminRole = role;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// Mutačná ochrana — admin-čitateľ (reader) NESMIE meniť dáta. Vráti 403.
// Musí byť ZA requireAdminJwt (číta req.adminRole).
export function requireWrite(req: Request, res: Response, next: NextFunction): void {
  if ((req as Request & { adminRole?: string }).adminRole === "reader") {
    res.status(403).json({ error: "Read-only: admin-čitateľ nemôže meniť dáta" });
    return;
  }
  next();
}

// Iba superadmin (msbeton). Správca/čítateľ → 403. Pre citlivé akcie:
// povyšovanie adminov, mazanie klientov, server destruktívne, revoke biometrie.
export function requireSuper(req: Request, res: Response, next: NextFunction): void {
  if ((req as Request & { adminRole?: string }).adminRole !== "admin") {
    res.status(403).json({ error: "Iba superadmin (msbeton) môže túto akciu vykonať" });
    return;
  }
  next();
}
