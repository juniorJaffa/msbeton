// Detekcia platformy pre WebAuthn biometriu.
//
// KRITICKÉ: iOS Safari (a desktop Safari) povolia navigator.credentials.get()/create()
// IBA v rámci "transient user activation" — t.j. priamo z onClick handlera, do ~5 s od
// tapnutia. Volanie z useEffect/onload (bez dotyku) → NotAllowedError.
//
// Chrome (desktop aj Android), Edge, Firefox sú benevolentné a často povolia auto-spustenie
// aj bez gesta. Preto:
//   - canAutoTriggerBio() === true  → smieme skúsiť bio ticho na mount (zero-tap)
//   - canAutoTriggerBio() === false → MUSÍME počkať na tap používateľa (one-tap lock screen)

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPhone / iPod / iPad (vrátane iPadOS, ktorý sa hlási ako MacIntel s touch)
  return /iP(hone|od|ad)/.test(ua)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // Safari = obsahuje "Safari", ale nie Chrome/Chromium/Android/CriOS/FxiOS/EdgiOS
  return /safari/i.test(ua) && !/chrome|chromium|crios|fxios|edgios|android/i.test(ua);
}

// Smieme spustiť biometriu automaticky (bez tapnutia) na tejto platforme?
// false pre WebKit (iOS všetky prehliadače + desktop Safari) — tam treba user gesto.
export function canAutoTriggerBio(): boolean {
  return !isIOS() && !isSafari();
}
