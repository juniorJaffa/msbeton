import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env["SMTP_HOST"];
  const port = Number(process.env["SMTP_PORT"] ?? 587);
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];
  const from = process.env["SMTP_FROM"] ?? "MS-BETON <noreply@msbeton.sk>";

  if (!host || !user || !pass) return null;

  return { transport: nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }), from };
}

export async function sendRegistrationEmail(opts: {
  toEmail: string;
  clientName: string;
  clientId: string;
  password: string;
  loginUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const conn = createTransport();
  if (!conn) return { ok: false, error: "SMTP not configured" };

  const { toEmail, clientName, clientId, password, loginUrl = "https://demo.msbeton.sk/prihlasenie" } = opts;

  const html = `
<!DOCTYPE html>
<html lang="sk">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Registrácia klienta – MS-BETON</title></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1)">
    <div style="background:#001D3D;padding:28px 32px;text-align:center">
      <h1 style="color:#EDC531;font-size:28px;margin:0;letter-spacing:2px">MS-BETON</h1>
      <p style="color:#fff;margin:6px 0 0;font-size:13px;opacity:.7">Kalkulačka betónu</p>
    </div>
    <div style="padding:32px">
      <h2 style="color:#001D3D;margin:0 0 8px">Vitajte, ${clientName}!</h2>
      <p style="color:#555;margin:0 0 24px">Váš klientský účet bol vytvorený. Nižšie sú prihlasovacie údaje pre kalkulačku betónu.</p>
      <div style="background:#f8f8f8;border-radius:8px;padding:20px 24px;margin-bottom:24px;border-left:4px solid #EDC531">
        <p style="margin:0 0 8px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px">Prihlasovacie údaje</p>
        <p style="margin:0 0 6px;font-size:16px"><strong>ID:</strong> <span style="font-family:monospace;background:#fff;padding:2px 8px;border-radius:4px;border:1px solid #ddd">${clientId}</span></p>
        <p style="margin:0;font-size:16px"><strong>Heslo:</strong> <span style="font-family:monospace;background:#fff;padding:2px 8px;border-radius:4px;border:1px solid #ddd">${password}</span></p>
      </div>
      <a href="${loginUrl}" style="display:inline-block;background:#EDC531;color:#001D3D;text-decoration:none;font-weight:bold;padding:12px 28px;border-radius:8px;font-size:15px">Prihlásiť sa do kalkulačky</a>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0">
      <p style="color:#999;font-size:12px;margin:0">MS-BETON, spol. s r.o. · Turie 468, 013 12 Turie · peter@msbeton.sk</p>
    </div>
  </div>
</body>
</html>`;

  try {
    await conn.transport.sendMail({
      from: conn.from,
      to: toEmail,
      subject: "Váš klientský účet v MS-BETON kalkulačke",
      html,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
