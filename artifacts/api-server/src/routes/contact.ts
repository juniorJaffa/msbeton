import { Router } from "express";
import { sendContactEmail } from "../lib/mailer";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { name, phone, email, message } = req.body ?? {};
    if (!name || !message) {
      return res.status(400).json({ ok: false, error: "Chýba meno alebo správa" });
    }
    const result = await sendContactEmail({ name: String(name), phone: String(phone ?? ""), email: String(email ?? ""), message: String(message) });
    if (!result.ok) {
      req.log.error({ err: result.error }, "Contact email failed");
      return res.status(500).json({ ok: false, error: "Odoslanie zlyhalo" });
    }
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Contact route error");
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

export default router;
