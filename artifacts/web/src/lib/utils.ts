import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formátuje telefónne číslo na jednotný formát XXX XXX XXX / +421 XXX XXX XXX
export function formatPhone(value: string): string {
  const stripped = value.replace(/\s+/g, "");
  if (!stripped) return "";

  const intl = stripped.match(/^(\+\d{2,3})(.*)/);
  if (intl) {
    const prefix = intl[1];
    const local = intl[2].replace(/\D/g, "").slice(0, 9);
    if (!local) return prefix;
    const a = local.slice(0, 3), b = local.slice(3, 6), c = local.slice(6, 9);
    return prefix + " " + [a, b, c].filter(Boolean).join(" ");
  }

  const digits = stripped.replace(/\D/g, "").slice(0, 10);
  if (!digits) return "";
  // Slovak/Czech: 0XXX XXX XXX (4+3+3)
  const a = digits.slice(0, 4), b = digits.slice(4, 7), c = digits.slice(7, 10);
  return [a, b, c].filter(Boolean).join(" ");
}
