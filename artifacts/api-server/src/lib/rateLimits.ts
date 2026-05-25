import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Príliš veľa pokusov, skúste za 15 minút" },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "unknown"),
});
