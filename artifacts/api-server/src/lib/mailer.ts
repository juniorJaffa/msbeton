import nodemailer from "nodemailer";

// ── Shared email shell ─────────────────────────────────────────────────────────
function emailShell(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:#edeef0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#edeef0;padding:32px 16px">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;width:100%">

<!-- HEADER -->
<tr><td style="background:#001D3D;border-radius:14px 14px 0 0;padding:40px 40px 32px;text-align:center">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding-bottom:14px">
      <!-- Logo hex icon -->
      <table cellpadding="0" cellspacing="0" role="presentation">
        <tr><td style="background:rgba(237,197,49,0.12);border:2px solid rgba(237,197,49,0.35);border-radius:14px;padding:10px 18px">
          <span style="color:#EDC531;font-size:13px;font-weight:900;letter-spacing:3px;text-transform:uppercase">&#9899; MS&#183;BETON</span>
        </td></tr>
      </table>
    </td></tr>
    <tr><td align="center">
      <h1 style="margin:0;color:#EDC531;font-size:34px;font-weight:900;letter-spacing:5px;line-height:1">MS&#183;BETON</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.65);font-size:12px;letter-spacing:2px;font-weight:600">spol. s r.o.</p>
      <p style="margin:10px 0 0;color:rgba(255,255,255,0.35);font-size:10px;letter-spacing:3px;text-transform:uppercase">Kalkulačka betónu</p>
    </td></tr>
  </table>
</td></tr>

<!-- GOLD LINE -->
<tr><td style="background:linear-gradient(90deg,#c9a820,#EDC531,#c9a820);height:3px;font-size:0;line-height:0">&nbsp;</td></tr>

<!-- BODY -->
<tr><td style="background:#ffffff;padding:36px 40px">
${bodyHtml}
</td></tr>

<!-- GOOGLE REVIEW -->
<tr><td style="background:#fffcee;border-top:2px solid rgba(237,197,49,0.25);padding:30px 40px;text-align:center">
  <p style="margin:0 0 10px;font-size:26px;letter-spacing:5px;line-height:1">&#11088;&#11088;&#11088;&#11088;&#11088;</p>
  <p style="margin:0 0 6px;color:#1a1400;font-size:15px;font-weight:800">Páčilo sa vám?</p>
  <p style="margin:0 0 20px;color:#999;font-size:13px;line-height:1.55">Krátke hodnotenie na Google nám veľmi pomôže.<br>Zaberá to 30 sekúnd &mdash; ďakujeme!</p>
  <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto">
  <tr><td style="background:#EDC531;border-radius:8px;box-shadow:0 3px 10px rgba(237,197,49,0.45)">
    <a href="https://g.page/r/CeTg2gjXL3dWEBM/review" target="_blank"
       style="display:inline-block;color:#001D3D;text-decoration:none;font-weight:900;font-size:14px;letter-spacing:0.3px;padding:14px 30px">
      &#11088;&nbsp; Ohodnoťte MS&#8209;BETON na Google
    </a>
  </td></tr>
  </table>
</td></tr>

<!-- FOOTER -->
<tr><td style="background:#001D3D;border-radius:0 0 14px 14px;padding:22px 40px;text-align:center">
  <p style="margin:0 0 3px;color:rgba(255,255,255,0.55);font-size:12px;font-weight:700;letter-spacing:0.5px">MS-BETON, spol. s r.o.</p>
  <p style="margin:0 0 10px;color:rgba(255,255,255,0.28);font-size:10px;letter-spacing:0.3px">Turie 468, 013 12 Turie &nbsp;·&nbsp; IČO: 55747591 &nbsp;·&nbsp; IČ DPH: SK2122074603</p>
  <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto">
    <tr>
      <td><a href="https://msbeton.sk" style="color:#EDC531;text-decoration:none;font-size:11px">msbeton.sk</a></td>
      <td style="color:rgba(255,255,255,0.2);font-size:11px;padding:0 8px">&middot;</td>
      <td><a href="mailto:info@msbeton.sk" style="color:#EDC531;text-decoration:none;font-size:11px">info@msbeton.sk</a></td>
    </tr>
  </table>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function createTransport() {
  const host = process.env["SMTP_HOST"];
  const port = Number(process.env["SMTP_PORT"] ?? 587);
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];
  const from = process.env["SMTP_FROM"] ?? "MS-BETON <noreply@msbeton.sk>";

  if (!host || !user || !pass) return null;

  return { transport: nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }), from };
}

export async function sendOrderNotification(order: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const conn = createTransport();
  if (!conn) return { ok: false, error: "SMTP not configured" };

  const tabLabel: Record<string, string> = { pumpa: "Pumpa", mix: "Domiešavač", vlastnadoprava: "Vlastná doprava" };
  const tab = tabLabel[String(order.tab ?? "")] ?? String(order.tab ?? "—");
  const priceMode = order.priceMode === "hotovost" ? "Hotovosť" : "Faktúra";
  const eur = (v: unknown) => v != null ? `${Number(v).toFixed(2)} €` : "—";
  const row = (label: string, val: string, bold = false) =>
    `<tr><td style="padding:5px 0;color:#888;width:140px;vertical-align:top">${label}</td><td style="padding:5px 0;color:#333;${bold ? "font-weight:bold" : ""}">${val}</td></tr>`;

  const html = `<!DOCTYPE html><html lang="sk"><head><meta charset="UTF-8">
<title>Nová objednávka – MS-BETON</title></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:#001D3D;padding:20px 28px">
    <h1 style="color:#EDC531;font-size:22px;margin:0">&#128203; Nová objednávka</h1>
    <p style="color:#fff;margin:4px 0 0;font-size:13px;opacity:.6">MS-BETON kalkulačka · ${new Date().toLocaleString("sk-SK")}</p>
  </div>
  <div style="padding:24px 28px">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${row("Klient", String(order.clientName ?? "—"), true)}
      ${order.company ? row("Firma", String(order.company)) : ""}
      ${order.phone ? row("Telefón", String(order.phone)) : ""}
      ${order.email ? row("Email", String(order.email)) : ""}
      <tr><td colspan="2" style="padding:6px 0;border-top:1px solid #eee"></td></tr>
      ${row("Typ dopravy", tab, true)}
      ${row("Betón", String(order.concreteType ?? "—"))}
      ${row("Množstvo", `${order.quantity ?? "—"} m³${order.totalQty && order.totalQty !== order.quantity ? ` (celk. ${order.totalQty} m³)` : ""}`)}
      ${order.address ? row("Adresa", String(order.address)) : ""}
      ${order.km ? row("Vzdialenosť", `${order.km} km`) : ""}
      <tr><td colspan="2" style="padding:6px 0;border-top:1px solid #eee"></td></tr>
      ${row("Platba", priceMode)}
      ${row("Cena bez DPH", eur(order.totalBezDph))}
      <tr><td style="padding:6px 0;color:#888">Cena s DPH</td><td style="padding:6px 0;font-weight:bold;font-size:16px;color:#EDC531">${eur(order.totalSDph)}</td></tr>
      ${order.note ? `<tr><td colspan="2" style="padding:6px 0;border-top:1px solid #eee"></td></tr>${row("Poznámka", `<em>${order.note}</em>`)}` : ""}
    </table>
  </div>
  <div style="background:#f8f8f8;padding:12px 28px;border-top:1px solid #eee">
    <p style="color:#999;font-size:11px;margin:0">MS-BETON, spol. s r.o. · Turie 468, 013 12 Turie · objednavky@msbeton.sk</p>
  </div>
</div>
</body></html>`;

  try {
    await conn.transport.sendMail({
      from: conn.from,
      to: "objednavky@msbeton.sk",
      subject: `Objednávka – ${order.clientName ?? "klient"} · ${tab} · ${eur(order.totalSDph)}`,
      html,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// Potvrdenie objednávky KLIENTOVI — "prijali sme, pracujeme na nej, budeme kontaktovať".
// Používa emailShell (jednotná hlavička + Google review CTA + footer).
export async function sendOrderConfirmation(toEmail: string, order: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const conn = createTransport();
  if (!conn) return { ok: false, error: "SMTP not configured" };

  const tabFullLabel: Record<string, string> = { pumpa: "Betónová pumpa", mix: "Domiešavač", vlastnadoprava: "Vlastná doprava" };
  const tabIcon: Record<string, string> = { pumpa: "&#9650;", mix: "&#9711;", vlastnadoprava: "&#9658;" };
  const tabKey = String(order.tab ?? "");
  const tabLabel = tabFullLabel[tabKey] ?? tabKey;
  const tabIco = tabIcon[tabKey] ?? "&bull;";
  const priceMode = order.priceMode === "hotovost" ? "Hotovosť" : "Faktúra";
  const eur = (v: unknown) => v != null ? `${Number(v).toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : "—";
  const name = String(order.clientName ?? "").trim();
  const now = new Date();
  const fmtDate = `${String(now.getDate()).padStart(2,"0")}.${String(now.getMonth()+1).padStart(2,"0")}.${now.getFullYear()} o ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

  // Farba triedy betónu podľa pevnosti
  const concType = String(order.concreteType ?? "—");
  const clsM = concType.match(/C(\d+)/);
  const cls = clsM ? parseInt(clsM[1]) : 0;
  const concColor = cls >= 35 ? "#001D3D" : cls >= 25 ? "#1e40af" : cls >= 16 ? "#2563eb" : "#6b7280";

  // Kategória (riečny / drvené kamenivo) — zobraziť ak je rôzna od typu
  const concCat = String(order.concreteCategory ?? "").trim();
  const showCat = concCat && concCat !== concType;

  // Riadok tabuľky objednávky
  const row = (label: string, val: string) =>
    `<tr>
      <td style="padding:9px 0;color:#6b7280;font-size:13px;width:130px;vertical-align:middle;border-bottom:1px solid #e8e6e1">${label}</td>
      <td style="padding:9px 0;color:#1a1a2c;font-size:13px;font-weight:600;vertical-align:middle;border-bottom:1px solid #e8e6e1">${val}</td>
    </tr>`;

  const qtyStr = order.totalQty && Number(order.totalQty) !== Number(order.quantity)
    ? `${order.quantity} m&sup3; <span style="color:#9ca3af;font-size:12px;font-weight:400">(celk. ${order.totalQty} m&sup3;)</span>`
    : `${order.quantity ?? "—"} m&sup3;`;

  const body = `
<!-- Pozdrav -->
<p style="margin:0 0 4px;font-size:16px;color:#1a1a2c">${name ? `Dobr&yacute; de&nacute;, <strong>${name}</strong>,` : "Dobr&yacute; de&nacute;,"}</p>
<p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.7">ďakujeme za Va&scaron;u objedn&aacute;vku! <strong style="color:#1a1a2c">Pracujeme na nej</strong> a čoskoro V&aacute;s budeme kontaktova&#x165; ohľadom term&iacute;nu dod&aacute;nia.</p>

<!-- Stav potvrdenej objednávky -->
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px">
<tr><td style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;padding:14px 18px">
  <table cellpadding="0" cellspacing="0" role="presentation"><tr>
    <td style="width:36px;height:36px;background:#16a34a;border-radius:50%;text-align:center;vertical-align:middle;font-size:0;line-height:0">
      <span style="color:#fff;font-size:20px;font-weight:900;line-height:1">&#10003;</span>
    </td>
    <td style="padding-left:12px;vertical-align:middle">
      <p style="margin:0;color:#166534;font-size:14px;font-weight:800">Objedn&aacute;vka prijat&aacute;</p>
      <p style="margin:2px 0 0;color:#4ade80;font-size:12px">${fmtDate}</p>
    </td>
  </tr></table>
</td></tr>
</table>

<!-- Typ dopravy -->
<table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px">
<tr><td style="background:#001D3D;border-radius:8px;padding:10px 18px">
  <span style="color:#EDC531;font-size:14px;font-weight:800;letter-spacing:0.3px">${tabIco}&nbsp; ${tabLabel}</span>
</td></tr>
</table>

<!-- Karta objednávky -->
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 22px;background:#f5f4f1;border-radius:12px">
<tr><td style="padding:4px 22px 0">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

    <!-- Betón — farebný badge triedy pevnosti -->
    <tr>
      <td style="padding:12px 0 10px;color:#6b7280;font-size:13px;width:130px;vertical-align:middle;border-bottom:1px solid #e8e6e1">Bet&oacute;n</td>
      <td style="padding:12px 0 10px;vertical-align:middle;border-bottom:1px solid #e8e6e1">
        <span style="background:${concColor};color:#fff;padding:3px 12px;border-radius:6px;font-weight:700;font-size:13px;letter-spacing:0.3px">${concType}</span>
      </td>
    </tr>
    ${showCat ? row("Kateg&oacute;ria", concCat) : ""}
    ${row("Mno&#382;stvo", qtyStr)}
    ${order.address ? row("Adresa dod&aacute;vky", String(order.address)) : ""}
    ${order.km ? row("Vzdialenos&#x165;", `${order.km}&thinsp;km`) : ""}
    ${row("Platba", priceMode)}
    ${order.totalBezDph ? row("Bez DPH", eur(order.totalBezDph)) : ""}

  </table>
  <!-- Cena celkom — výrazná -->
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-top:2px solid #dbd9d4">
  <tr>
    <td style="padding:16px 0;color:#6b7280;font-size:13px">Cena celkom</td>
    <td style="padding:16px 0;text-align:right;color:#001D3D;font-size:28px;font-weight:900;line-height:1;font-variant-numeric:tabular-nums">${eur(order.totalSDph)}</td>
  </tr>
  </table>
</td></tr>
</table>

<!-- Kontakt — zlatý ľavý pruh -->
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr><td style="background:#f5f4f1;border-left:4px solid #EDC531;border-radius:0 8px 8px 0;padding:14px 18px">
  <p style="margin:0;color:#555;font-size:13px;line-height:1.8">
    M&aacute;te ot&aacute;zku? Zavolajte n&aacute;m:<br>
    <a href="tel:+421909205205" style="color:#001D3D;font-weight:900;text-decoration:none;font-size:15px">+421&thinsp;909&thinsp;205&thinsp;205</a>
    &nbsp;&middot;&nbsp;
    <a href="mailto:objednavky@msbeton.sk" style="color:#001D3D;text-decoration:none;font-weight:600">objednavky@msbeton.sk</a>
  </p>
</td></tr>
</table>`;

  const html = emailShell(body);

  try {
    await conn.transport.sendMail({
      from: conn.from,
      to: toEmail,
      subject: "Prijali sme Vašu objednávku – MS-BETON",
      html,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
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

  const { toEmail, clientName, clientId, password, loginUrl = "https://msbeton.sk/prihlasenie" } = opts;

  const body = `
<h2 style="margin:0 0 6px;color:#001D3D;font-size:22px;font-weight:900">Vitajte, ${clientName}! 🎉</h2>
<p style="margin:0 0 24px;color:#666;font-size:15px;line-height:1.6">Váš klientský účet bol vytvorený. Tu sú prihlasovacie údaje do kalkulačky betónu — s cenami nastavenými priamo pre vás.</p>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 16px">
<tr><td style="background:#f8f9fb;border:2px solid #EDC531;border-radius:10px;padding:20px 24px">
  <p style="margin:0 0 14px;color:#999;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Prihlasovacie údaje</p>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td style="padding:4px 0;color:#888;font-size:13px;width:70px">ID</td>
      <td><span style="font-family:monospace;background:#fff;border:1px solid #e0e0e0;border-radius:5px;padding:3px 10px;font-size:16px;font-weight:700;color:#001D3D">${clientId}</span></td>
    </tr>
    <tr>
      <td style="padding:4px 0;color:#888;font-size:13px">Heslo</td>
      <td><span style="font-family:monospace;background:#fff;border:1px solid #e0e0e0;border-radius:5px;padding:3px 10px;font-size:16px;font-weight:700;color:#001D3D">${password}</span></td>
    </tr>
  </table>
</td></tr>
</table>

<table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 24px">
<tr><td style="background:#EDC531;border-radius:8px">
  <a href="${loginUrl}" style="display:inline-block;color:#001D3D;text-decoration:none;font-weight:900;font-size:15px;letter-spacing:0.5px;padding:14px 32px">Prihlásiť sa do kalkulačky &rarr;</a>
</td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr><td style="background:#f0f7ff;border-radius:8px;border-left:4px solid #001D3D;padding:14px 18px">
  <p style="margin:0;color:#444;font-size:13px;line-height:1.5">&#128161; <strong>Tip:</strong> Odporúčame si heslo po prvom prihlásení zmeniť v sekcii Môj profil.</p>
</td></tr>
</table>`;

  const html = emailShell(body);

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

export async function sendPasswordResetEmail(opts: {
  toEmail: string;
  clientName: string;
  resetUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const conn = createTransport();
  if (!conn) return { ok: false, error: "SMTP not configured" };
  const { toEmail, clientName, resetUrl } = opts;

  const body = `
<h2 style="margin:0 0 6px;color:#001D3D;font-size:22px;font-weight:900">&#128274; Reset hesla</h2>
<p style="margin:0 0 20px;color:#666;font-size:15px;line-height:1.6">Dobrý deň, <strong>${clientName}</strong>. Dostali sme požiadavku na reset hesla pre váš účet.</p>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 24px">
<tr><td style="background:#fff8e6;border:2px solid #EDC531;border-radius:10px;padding:18px 22px">
  <p style="margin:0;color:#7a5f00;font-size:14px;line-height:1.5">&#9201; Kliknite na tlačidlo nižšie a nastavte si nové heslo. Odkaz je platný <strong>1 hodinu</strong>.</p>
</td></tr>
</table>

<table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 28px">
<tr><td style="background:#EDC531;border-radius:8px">
  <a href="${resetUrl}" style="display:inline-block;color:#001D3D;text-decoration:none;font-weight:900;font-size:15px;letter-spacing:0.5px;padding:14px 32px">Nastaviť nové heslo &rarr;</a>
</td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr><td style="border-top:1px solid #f0f0f0;padding-top:20px">
  <p style="margin:0;color:#aaa;font-size:12px;line-height:1.6">Ak ste o reset nepožiadali, tento email ignorujte — váš účet je v bezpečí. Odkaz vyprší automaticky po 1 hodine.</p>
</td></tr>
</table>`;

  const html = emailShell(body);
  try {
    await conn.transport.sendMail({ from: conn.from, to: toEmail, subject: "Reset hesla – MS-BETON kalkulačka", html });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// Admin reset — 6-ciferný overovací kód na firemný email
export async function sendAdminResetCodeEmail(opts: {
  toEmail: string;
  code: string;
}): Promise<{ ok: boolean; error?: string }> {
  const conn = createTransport();
  if (!conn) return { ok: false, error: "SMTP not configured" };
  const { toEmail, code } = opts;

  const body = `
<h2 style="margin:0 0 6px;color:#001D3D;font-size:22px;font-weight:900">&#128737; Obnova admin hesla</h2>
<p style="margin:0 0 20px;color:#666;font-size:15px;line-height:1.6">Dostali sme požiadavku na obnovu hesla do <strong>administrácie MS-BETON</strong>. Použite overovací kód nižšie.</p>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 24px">
<tr><td style="background:#001D3D;border-radius:10px;padding:22px;text-align:center">
  <p style="margin:0 0 8px;color:#EDC531;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700">Overovací kód</p>
  <p style="margin:0;color:#fff;font-size:38px;font-weight:900;letter-spacing:10px;font-family:'Courier New',monospace">${code}</p>
</td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 24px">
<tr><td style="background:#fff8e6;border:2px solid #EDC531;border-radius:10px;padding:16px 20px">
  <p style="margin:0;color:#7a5f00;font-size:14px;line-height:1.5">&#9201; Kód je platný <strong>10 minút</strong>. Zadajte ho v prihlasovacom okne a nastavte nové heslo.</p>
</td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr><td style="border-top:1px solid #f0f0f0;padding-top:20px">
  <p style="margin:0;color:#aaa;font-size:12px;line-height:1.6">Ak ste o obnovu nepožiadali, <strong>ihneď</strong> tento email ignorujte a heslo zostáva nezmenené.</p>
</td></tr>
</table>`;

  const html = emailShell(body);
  try {
    await conn.transport.sendMail({ from: conn.from, to: toEmail, subject: "Obnova admin hesla – overovací kód", html });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function sendContactEmail(opts: {
  name: string; phone: string; email: string; message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const conn = createTransport();
  if (!conn) return { ok: false, error: "SMTP not configured" };

  const { name, phone, email, message } = opts;
  const row = (label: string, val: string) =>
    `<tr><td style="padding:5px 0;color:#888;width:120px;vertical-align:top">${label}</td><td style="padding:5px 0;color:#333">${val}</td></tr>`;

  const html = `<!DOCTYPE html><html lang="sk"><head><meta charset="UTF-8">
<title>Dopyt z webu – MS-BETON</title></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:#001D3D;padding:20px 28px">
    <h1 style="color:#EDC531;font-size:20px;margin:0">&#9993; Dopyt z webu</h1>
    <p style="color:#fff;margin:4px 0 0;font-size:13px;opacity:.6">MS-BETON · ${new Date().toLocaleString("sk-SK")}</p>
  </div>
  <div style="padding:24px 28px">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${row("Meno", name)}
      ${phone ? row("Telefón", phone) : ""}
      ${email ? row("Email", `<a href="mailto:${email}" style="color:#001D3D">${email}</a>`) : ""}
      <tr><td colspan="2" style="padding:6px 0;border-top:1px solid #eee"></td></tr>
      ${row("Správa", `<span style="white-space:pre-line">${message.replace(/</g, "&lt;")}</span>`)}
    </table>
  </div>
  <div style="background:#f8f8f8;padding:12px 28px;border-top:1px solid #eee">
    <p style="color:#999;font-size:11px;margin:0">MS-BETON, spol. s r.o. · Turie 468, 013 12 Turie · info@msbeton.sk</p>
  </div>
</div>
</body></html>`;

  try {
    await conn.transport.sendMail({
      from: conn.from,
      to: "info@msbeton.sk",
      replyTo: email || undefined,
      subject: `Dopyt z webu – ${name}`,
      html,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function sendCredentialsEmail(opts: {
  toEmail: string;
  clientName: string;
  loginId: string;
  resetUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const conn = createTransport();
  if (!conn) return { ok: false, error: "SMTP not configured" };
  const { toEmail, clientName, loginId, resetUrl } = opts;

  const body = `
<h2 style="margin:0 0 6px;color:#001D3D;font-size:22px;font-weight:900">Váš prístup je pripravený! &#127881;</h2>
<p style="margin:0 0 24px;color:#666;font-size:15px;line-height:1.6">Dobrý deň, <strong>${clientName}</strong>. Tu sú vaše prihlasovacie údaje do kalkulačky MS-BETON — betón objednáte za 5 minút.</p>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 24px">
<tr><td style="background:#f8f9fb;border:2px solid #EDC531;border-radius:10px;padding:22px 26px">
  <p style="margin:0 0 8px;color:#aaa;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Prihlasovacie ID</p>
  <p style="margin:0;color:#001D3D;font-size:30px;font-weight:900;letter-spacing:2px;font-family:monospace">${loginId}</p>
</td></tr>
</table>

<p style="margin:0 0 20px;color:#666;font-size:14px;line-height:1.6">Pre nastavenie hesla kliknite na tlačidlo nižšie. Odkaz je platný <strong>1 hodinu</strong>.</p>

<table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 28px">
<tr><td style="background:#EDC531;border-radius:8px;box-shadow:0 4px 12px rgba(237,197,49,0.35)">
  <a href="${resetUrl}" style="display:inline-block;color:#001D3D;text-decoration:none;font-weight:900;font-size:15px;letter-spacing:0.5px;padding:15px 34px">Nastaviť heslo a prihlásiť sa &rarr;</a>
</td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr><td style="background:#f0f7ff;border-radius:8px;border-left:4px solid #001D3D;padding:14px 18px">
  <p style="margin:0;color:#444;font-size:13px;line-height:1.5">&#128161; <strong>Vedeli ste?</strong> V kalkulačke vidíte ceny a zľavy nastavené priamo pre vás — bez nutnosti volať alebo písať email.</p>
</td></tr>
</table>`;

  const html = emailShell(body);
  try {
    await conn.transport.sendMail({ from: conn.from, to: toEmail, subject: "Prihlasovacie údaje – MS-BETON kalkulačka", html });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
