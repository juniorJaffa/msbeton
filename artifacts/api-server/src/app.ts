import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
export { loginRateLimit } from "./lib/rateLimits";

const app: Express = express();

const allowedOrigins = [
  "https://msbeton.sk",
  "https://www.msbeton.sk",
  "http://localhost:5173",
  "http://localhost:5174", // Vite dev fallback (keď 5173 je obsadený)
  "http://localhost:5175",
];

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error("CORS not allowed"));
  },
  credentials: true,
}));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// 5mb — objednávky/klienti sa ukladajú ako celé JSONB pole (rastie s počtom záznamov).
// Default 100kb už nestačí (112 objednávok ≈ 124K) → PUT by padal s 413.
// 25MB: klienti s fotkami (base64 JPEG ~500KB/foto × max ~20 klientov s fotkami = ~10MB + metadata)
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use("/api", router);

export default app;
