import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Skráti IP pre zobrazenie — IPv6 je dlhé a nečitateľné, ukáž len prvý:…:posledný blok.
// IPv4 necháva celé. Slúži len ako diagnostický doplnok — identita je zariadenie, nie IP.
export function shortIp(ip?: string): string {
  if (!ip || ip === "?" || ip === "unknown") return "";
  if (ip.includes(":")) {
    const parts = ip.split(":").filter(Boolean);
    if (parts.length <= 2) return ip;
    return `${parts[0]}:…:${parts[parts.length - 1]}`;
  }
  return ip;
}

// Formátuje telefónne číslo na jednotný formát 0XXX XXX XXX.
// Akceptuje aj medzinárodný prefix +421 alebo 00421 a normalizuje na 0XXX.
export function formatPhone(value: string): string {
  if (!value) return "";
  const stripped = value.replace(/[\s\-\(\)]/g, "");
  if (!stripped) return "";

  let digits: string;
  if (stripped.startsWith("+421")) {
    digits = "0" + stripped.slice(4).replace(/\D/g, "");
  } else if (stripped.startsWith("00421")) {
    digits = "0" + stripped.slice(5).replace(/\D/g, "");
  } else if (/^421\d{9}$/.test(stripped)) {
    digits = "0" + stripped.slice(3);
  } else {
    digits = stripped.replace(/\D/g, "");
  }

  digits = digits.slice(0, 10);
  if (!digits) return "";
  const a = digits.slice(0, 4), b = digits.slice(4, 7), c = digits.slice(7, 10);
  return [a, b, c].filter(Boolean).join(" ");
}

export function isValidSvkPhone(value: string): boolean {
  // Normalizuj +421/00421 → 0XXX rovnako ako formatPhone
  const formatted = formatPhone(value);
  const digits = formatted.replace(/\D/g, "");
  // SVK mobilné: 09XX XXX XXX (10 číslic, začína 09)
  // SVK pevné: 02/03/04/05 (10 číslic)
  return digits.length === 10 && /^0[2-9]/.test(digits);
}
