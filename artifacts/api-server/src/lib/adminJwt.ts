import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const SECRET = process.env.ADMIN_JWT_SECRET ?? "dev-insecure-change-in-prod";

export type AdminRole = "admin" | "reader";

export function signAdminToken(role: AdminRole = "admin"): string {
  return jwt.sign({ role }, SECRET, { expiresIn: "30d" });
}

// Overí JWT a uloží rolu do req.adminRole. Povolí admin aj reader (čítanie).
export function requireAdminJwt(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(auth.slice(7), SECRET) as { role?: string };
    (req as Request & { adminRole?: string }).adminRole = payload.role === "reader" ? "reader" : "admin";
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
