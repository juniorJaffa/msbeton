# Biometria — WebAuthn / FIDO2 dokumentácia

Implementácia biometrického prihlásenia podľa bankového vzoru (George SLSP / Tatrabanka IB).

---

## Dve oddelené biometrie — NIKDY nemiešať

| | Admin biometria | Klient biometria |
|---|---|---|
| Súbor | `adminAuth.ts` | `clientAuth.ts` |
| localStorage kľúč | `msbeton_webauthn_cred` | `msbeton_client_webauthn` |
| Overenie | **Client-side only** | **Server-side** (`@simplewebauthn/server`) |
| Public key uložený | Iba v zariadení (Keychain) | DB (`clients.webauthnCredentials[]`) |
| Credential user | `"msbeton-admin"` (pevný) | `loginId` klienta (napr. `"20"`) |
| Revoke | `clearBiometric()` lokálne | DELETE endpoint + `clearClientBiometric()` |

### Prečo sú oddelené

Oba typy biometrie registrujú WebAuthn credential s rovnakým `rpId = hostname`. Zariadenie (Secure Enclave / TPM) ukladá viac credentialov pre jedno rpId. Odlíšenie je v:
1. **localStorage kľúč** — iný pre admin vs klient
2. **`user.id`** — iná hodnota → iný credential v Keychain
3. **Overenie** — admin client-side challenge (bez servera), klient server-side challenge (DB)

---

## Klient biometria — banking-app vzor

### Prvý login (registrácia biometrie)

1. Klient zadá `loginId` + heslo na `/prihlasenie`
2. Server overí (`POST /api/client/login`) → vráti session
3. `ClientLogin.tsx` detekuje: `isBiometricAvailable() && !hasClientBiometric()` → zobrazí `screen = "bio-register"`
4. Klient klikne "Aktivovať biometriu" → `registerClientBiometric(session.id, session.clientId, displayName)`
5. **Server flow:**
   - `POST /api/client/webauthn/reg-challenge` → server generuje challenge (uložená v `regChallenges` Map, TTL 120s)
   - `navigator.credentials.create(...)` → zariadenie vygeneruje kľúčový pár, privátny kľúč ostane v Secure Enclave
   - `POST /api/client/webauthn/reg-complete` → server overí attestation, uloží `{id, publicKey, counter, createdAt}` do `clients[].webauthnCredentials[]` v DB
6. `localStorage.setItem("msbeton_client_webauthn", JSON.stringify({credId, loginId}))` — iba pointer, nie secret

### Ďalší login (auto-trigger)

1. Klient navštívi `/prihlasenie` (alebo je presmerovaný po logout)
2. `ClientLogin.tsx` useEffect — **POVINNÉ PORADIE kontrol:**

```typescript
if (clientAuth.getLoggedClient()) { setLocation("/#calculator"); return; }
if (isAdminLoggedIn()) return;  // ← KRITICKÉ — zastaviť ak admin prihlásený
if (isBiometricAvailable() && hasClientBiometric()) {
  setScreen("bio-pending");
  authenticateClientBiometric().then(result => {
    if (result.ok && result.session) {
      clientAuth.updateSession(result.session);
      setLocation("/#calculator");
    } else if (!hasClientBiometric()) {
      setScreen("form"); // stale credential → auto-vymazaný → formulár
    } else {
      setScreen("bio-failed");
    }
  });
}
```

3. `authenticateClientBiometric()` — **server flow:**
   - `POST /api/client/webauthn/auth-challenge` (body: `{loginId}`) → server generuje challenge, vrátne `allowCredentials` s uloženými credential IDs
   - Ak `allowCredentials.length === 0` → `clearClientBiometric()` + error "Biometria nie je registrovaná"
   - `navigator.credentials.get(...)` → zariadenie podpíše challenge privátnym kľúčom (Face ID / Touch ID)
   - `POST /api/client/webauthn/auth-complete` → server verifikuje podpis voči uloženému public key, kontroluje counter (anti-replay)
   - Úspech → aktualizuje counter v DB, zapíše `biometricAuthLog` entry, vrátia session

### Logout — banking pattern

```typescript
// clientAuth.logout()
localStorage.removeItem("msbeton_client_session"); // session preč
// msbeton_client_webauthn ZOSTÁVA → credential prežije logout
window.dispatchEvent(new Event("client-session-changed"));
```

Navbar po logout detekuje `hasClientBiometric()` → `window.location.href = "/prihlasenie"` → mount → auto-trigger bio → bezproblémové re-prihlásenie bez hesla.

### Zabudnúť zariadenie

Klient klikne "Zabudnúť toto zariadenie":
1. `forgetClientBiometric()` → `DELETE /api/client/webauthn/credential/:credId` (body: `{clientInternalId}`)
2. Server vymaže credential z `clients[].webauthnCredentials[]` v DB
3. `clearClientBiometric()` → vymaže `msbeton_client_webauthn` z localStorage

---

## Server-side WebAuthn — implementácia (`client.ts`)

### Konfigurácia

```typescript
const rpId = new URL(process.env.APP_URL).hostname; // "msbeton.sk" alebo "localhost"
const expectedOrigins = rpId === "localhost"
  ? ["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"]
  : [process.env.APP_URL];
```

### Challenge stores

```typescript
const regChallenges  = new Map<string, {challenge: string; expires: number}>(); // key: clientInternalId
const authChallenges = new Map<string, {challenge: string; expires: number}>(); // key: loginId
const CHALLENGE_TTL  = 120_000; // 2 minúty
```

`popChallenge()` — single-use (vymaže po prečítaní), kontroluje TTL.

### Credential uložený v DB

```typescript
interface WebAuthnCredential {
  id: string;        // credentialId (base64url)
  publicKey: string; // COSE public key (base64url) — z @simplewebauthn verifyRegistrationResponse
  counter: number;   // anti-replay counter
  createdAt: string; // ISO timestamp
}
// Uložené v clients[].webauthnCredentials[] — max 5 per klient (.slice(-5))
```

### Anti-replay counter

Pri každom úspešnom `auth-complete`:
```typescript
webauthnCredentials: c.webauthnCredentials.map(cr =>
  cr.id === stored.id ? { ...cr, counter: verification.authenticationInfo.newCounter } : cr
)
```
`@simplewebauthn/server` automaticky overuje `newCounter > storedCounter` — replay attack = zlyhanie verifikácie.

### Biometric audit log

```typescript
interface BiometricAuthEntry {
  ts: string;      // ISO timestamp
  ok: boolean;     // úspech / zlyhanie
  ip: string;      // CF-Connecting-IP alebo req.ip
  credId?: string; // prvých 8 znakov credentialId (nie full — privacy)
}
// clients[].biometricAuthLog[] — max 20 entries (.slice(-20))
```

Zapisuje sa pri:
- **Úspech** — inline s counter updatem v jednom DB write
- **Fail: neznáme zariadenie** — `appendBioLog()` fire-and-forget
- **Fail: crypto verification** — `appendBioLog()` fire-and-forget

`appendBioLog()` je async helper, zlyhanie loga nesmie blokovať 401 response.

---

## Admin biometria — implementácia (`adminAuth.ts`)

**Čisto client-side, žiadny server.** Credential verifikácia prebieha v prehliadači (challenge je lokálne generovaný `randomBytes(32)`, nie server nonce → nie je kryptograficky bezpečné voči serveru, ale admin session je JWT z `/api/admin/login`, nie z WebAuthn).

```
Admin bio flow:
1. navigator.credentials.create({user: {id: "msbeton-admin"}}) → uloží credId do msbeton_webauthn_cred
2. Pri ďalšom prihlásení: navigator.credentials.get() → ak OK → POST /api/admin/biometric-token → JWT
```

`/api/admin/biometric-token` je rate-limited (rovnako ako `/api/admin/login`). JWT je vydaný bez overenia WebAuthn na serveri — bezpečnostný predpoklad: ak zariadenie povolí WebAuthn, admin je prítomný fyzicky.

`hasStoredCredential()` navyše kontroluje `DEVICE_FP_KEY` (platform + screen + hardwareConcurrency) — credential z iného zariadenia/profilu je ignorovaný.

---

## Admin UI pre klientskú biometriu

### KlientiTab.tsx — per-klient

- **Karta v liste:** zelený badge `🖐 N` (počet zariadení) — `c.webauthnCredentials?.length > 0`
- **Expanded detail — sekcia Biometria:**
  - Stav: `N zariad.` (zelený) alebo `Neregistrovaná` (šedý)
  - Log tabuľka: posledných 8 zápisov — timestamp, `✓`/`✗` badge, IP maskovaná (`xxx.xxx.*.*`)
  - Tlačidlo "Zrušiť biometriu" → `DELETE /api/admin/clients/:id/webauthn` → vymaže `webauthnCredentials: []` + `biometricAuthLog: []`

### ServerTab.tsx — globálne štatistiky

Fetchuje `GET /api/admin/biometric-stats` (chránený JWT) paralelne so `server-status`.

Zobrazuje (dark navy widget):
- `X / Y klientov` má biometriu registrovanú
- Dnes úspešné / zamietnuté bio loginy
- Posledná aktivita (timestamp)
- **Červený pulsujúci alert** keď >3 zlyhaní za hodinu per klient (potenciálny útok)

Endpoint logika: číta `clients[]` z DB, počíta z `biometricAuthLog` zápisov za posledných 24h / 1h.

---

## Bezpečnostné invarianty

1. **Credential ID nie je secret** — je to verejný identifikátor. Secret je privátny kľúč (nikdy neopustí Secure Enclave).
2. **Challenge je single-use** — `popChallenge()` vymaže challenge pri prvom prečítaní. Replay útok = expired challenge.
3. **Counter striktne rastie** — `@simplewebauthn/server` odmieta counter ≤ uložená hodnota. Klon zariadenia = zlyhanie.
4. **`userVerification: "required"`** — zariadenie musí overiť používateľa (Face ID / PIN). `uv=false` = odmietnutie.
5. **IP logovanie** — každý pokus (úspech aj fail) zaznamenáva IP. Admin vidí v KlientiTab detail.
6. **Rate limit auth-challenge** — 20 pokusov/minútu per IP (`checkRate("webauthn-auth:${ip}", 20, 60_000)`).
7. **Admin session nikdy nevymaže klient credential** — `adminAuth.logout()` maže iba `msbeton_admin_token`, nie `msbeton_client_webauthn`.

---

## Zoznam opravených bugov

### Bug: Admin biometria spúšťala klientskú bio obrazovku

**Symptóm:** Admin prihlásený → navštívi `/prihlasenie` → zobrazí sa "Biometria zlyhala".

**Príčina:** `clientAuth.getLoggedClient()` kontroluje `msbeton_client_session`. Admin session je `msbeton_admin_token` → `getLoggedClient()` vracia null → klientská biometria sa auto-triggerla aj pre admina.

**Fix:** `ClientLogin.tsx` useEffect — pridaný `if (isAdminLoggedIn()) return;` pred bio triggerom.

```typescript
// PRED (bug):
if (clientAuth.getLoggedClient()) { redirect; return; }
if (hasClientBiometric()) { autoTrigger(); }  // ← spúšťalo sa aj pre admina

// PO (fix):
if (clientAuth.getLoggedClient()) { redirect; return; }
if (isAdminLoggedIn()) return;  // ← admin = stop
if (hasClientBiometric()) { autoTrigger(); }
```

### Bug: Stale credential → dead-end bio-failed obrazovka

**Symptóm:** Bio credential registrovaný na inom zariadení/browseri → `authenticateClientBiometric()` hodí `NotAllowedError` → `clearClientBiometric()` sa zavolá → ale obrazovka zostane na `bio-failed`. "Skúsiť znova" vráti "Žiadna uložená biometria" znova.

**Fix:** Po návrate z `authenticateClientBiometric()`:
```typescript
// PRED (bug):
.then(result => result.ok ? redirect : setScreen("bio-failed"))

// PO (fix):
.then(result => {
  if (result.ok && result.session) { redirect; }
  else if (!hasClientBiometric()) { setScreen("form"); } // ← stale → formulár
  else { setScreen("bio-failed"); }
})
```

`retryBiometric()` má rovnakú logiku + guard: `if (!hasClientBiometric()) { setScreen("form"); return; }`.
