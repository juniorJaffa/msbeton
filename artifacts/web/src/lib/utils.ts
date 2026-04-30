import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
