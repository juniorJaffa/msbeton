import type { Client } from "./adminData";

// ── Smart avatar ────────────────────────────────────────────────────────────
// Prod analýza (61 klientov): ~9 má telefón/číslo v firstName (→ avatar "0"/"+"),
// ~6 sú šablóny "Zľava X%". charAt(0) na nich zlyháva. Smart fallback + farba.
// Zdieľané medzi Klienti listom a Objednávky listom (konzistentné UIUX).
export const AVATAR_PALETTE = [
  { bg: "bg-rose-100",    fg: "text-rose-700" },
  { bg: "bg-orange-100",  fg: "text-orange-700" },
  { bg: "bg-amber-100",   fg: "text-amber-700" },
  { bg: "bg-emerald-100", fg: "text-emerald-700" },
  { bg: "bg-teal-100",    fg: "text-teal-700" },
  { bg: "bg-sky-100",     fg: "text-sky-700" },
  { bg: "bg-indigo-100",  fg: "text-indigo-700" },
  { bg: "bg-fuchsia-100", fg: "text-fuchsia-700" },
];
function hashStr(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
// začína + alebo číslicou a obsahuje prevažne čísla/medzery → telefón, nie meno
function isPhoneLike(s: string): boolean { const t = s.trim(); return /^[+\d]/.test(t) && /\d{4,}/.test(t.replace(/\s/g, "")); }
function firstLetter(s: string | undefined): string { const m = (s ?? "").trim().match(/\p{L}/u); return m ? m[0].toUpperCase() : ""; }

export type AvatarKind = "owner" | "template" | "phone" | "initial";
export interface AvatarInfo { kind: AvatarKind; char: string; mono: string; palette: { bg: string; fg: string } }

// Jadro — z rozložených polí (firstName/lastName/company)
function buildAvatar(firstName: string, lastName: string, company: string, seed: string, isOwner = false): AvatarInfo {
  const palette = AVATAR_PALETTE[hashStr(seed || `${firstName}${lastName}${company}`) % AVATAR_PALETTE.length];
  if (isOwner) return { kind: "owner", char: "", mono: "", palette };
  if (/^z[ľl]ava/i.test(firstName.trim())) return { kind: "template", char: "", mono: "", palette };
  const fn = firstName.trim(), ln = lastName.trim(), co = company.trim();
  const fnOk = fn && !isPhoneLike(fn);
  const lnOk = ln && !isPhoneLike(ln);
  if (fnOk) {
    const mono = lnOk ? firstLetter(fn) + firstLetter(ln) : firstLetter(fn);
    return { kind: "initial", char: firstLetter(fn), mono, palette };
  }
  if (lnOk) return { kind: "initial", char: firstLetter(ln), mono: firstLetter(ln), palette };
  if (co && !isPhoneLike(co)) return { kind: "initial", char: firstLetter(co), mono: firstLetter(co), palette };
  return { kind: "phone", char: "", mono: "", palette };
}

// Pre Klienta (má rozdelené firstName/lastName)
export function clientAvatar(c: Client): AvatarInfo {
  return buildAvatar(c.firstName || "", c.lastName || "", c.company || "", c.loginId || c.id || "", c.isOwner);
}

// Pre Objednávku — len celé meno + firma. Rozdelí meno na prvé slovo + zvyšok pre monogram.
export function nameAvatar(fullName: string, company: string, seed: string): AvatarInfo {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const rest = parts.slice(1).join(" ");
  return buildAvatar(first, rest, company, seed);
}
