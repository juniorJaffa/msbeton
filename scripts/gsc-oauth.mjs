#!/usr/bin/env node
/**
 * GSC OAuth2 — získa refresh token pre Google Search Console API
 *
 * Prerekvizity (urob raz v GCP):
 *   GCP Console → APIs & Services → Credentials → Create Credentials
 *   → OAuth client ID → Desktop app → stiahni JSON
 *
 * Spustenie:
 *   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/gsc-oauth.mjs
 */

import http from "http";
import { URL } from "url";

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = "http://localhost:9999/callback";
const SCOPE         = "https://www.googleapis.com/auth/webmasters.readonly";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌  Chýbajú env premenné: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET");
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: "code",
    scope:         SCOPE,
    access_type:   "offline",
    prompt:        "consent",
  }).toString();

console.log("\n🔗  Otvor v prehliadači (Google účet s GSC prístupom):\n");
console.log(authUrl);
console.log("\n⏳  Čakám na callback na http://localhost:9999/callback ...\n");

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost:9999");
  if (!u.pathname.startsWith("/callback")) { res.end(); return; }

  const code = u.searchParams.get("code");
  if (!code) {
    res.end("<h1>❌ Chýba code parameter</h1>");
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        grant_type:    "authorization_code",
      }).toString(),
    });

    const tokens = await tokenRes.json();

    if (!tokens.refresh_token) {
      console.error("❌  Refresh token chýba v odpovedi:", tokens);
      res.end("<h1>❌ Refresh token chýba — skús znova s prompt=consent</h1>");
      server.close();
      return;
    }

    console.log("\n✅  REFRESH TOKEN:\n");
    console.log(tokens.refresh_token);
    console.log("\n📋  Pridaj do ecosystem.config.cjs:\n");
    console.log(`  GSC_CLIENT_ID:     '${CLIENT_ID}',`);
    console.log(`  GSC_CLIENT_SECRET: '${CLIENT_SECRET}',`);
    console.log(`  GSC_REFRESH_TOKEN: '${tokens.refresh_token}',`);
    console.log(`  GSC_SITE_URL:      'sc-domain:msbeton.sk',\n`);

    res.end("<h1>✅ Hotovo! Refresh token je v termináli. Zavri záložku.</h1>");
    server.close();
    process.exit(0);
  } catch (e) {
    console.error("❌  Chyba pri výmene kódu:", e);
    res.end("<h1>❌ Chyba — pozri terminál</h1>");
    server.close();
    process.exit(1);
  }
});

server.listen(9999, () => {});
