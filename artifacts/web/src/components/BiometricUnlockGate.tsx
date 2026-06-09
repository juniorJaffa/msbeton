import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Fingerprint, ArrowRight, X } from "lucide-react";
import {
  clientAuth, isBiometricAvailable, hasClientBiometric,
  authenticateClientBiometric, clearClientBiometric,
} from "@/lib/clientAuth";
import { isLoggedIn as isAdminLoggedIn } from "@/lib/adminAuth";
import { canAutoTriggerBio } from "@/lib/bioPlatform";

const DISMISS_KEY = "msbeton_bio_gate_dismissed";

type GateState = "hidden" | "locked" | "pending" | "failed";

// Globálny biometrický zámok pre KLIENTSKU biometriu.
// Zobrazí sa pri otvorení ľubovoľnej verejnej stránky (homepage, cenník…) keď:
//   - existuje uložená klientska biometria na zariadení
//   - klient NIE JE prihlásený
//   - admin NIE JE prihlásený (admin má vlastný kontext)
//   - nie sme na /prihlasenie ani /admin/* (tie majú vlastný lock screen)
//   - používateľ ho v tejto session nezavrel ("Pokračovať bez prihlásenia")
//
// Banking vzor: jeden tap na Face ID → prihlásenie. Na non-iOS sa pokúsi automaticky.
export function BiometricUnlockGate() {
  const [location] = useLocation();
  const [state, setState] = useState<GateState>("hidden");
  const autoTried = useRef(false);

  const shouldShow = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    if (sessionStorage.getItem(DISMISS_KEY)) return false;
    if (location.startsWith("/prihlasenie") || location.startsWith("/admin")) return false;
    if (isAdminLoggedIn()) return false;
    if (clientAuth.getLoggedClient()) return false;
    return isBiometricAvailable() && hasClientBiometric();
  }, [location]);

  const runAuth = useCallback(() => {
    setState("pending");
    authenticateClientBiometric().then(result => {
      if (result.ok && result.session) {
        clientAuth.updateSession(result.session);
        setState("hidden");
      } else if (!hasClientBiometric()) {
        // stale credential bol auto-vymazaný → skry, ďalej anonymne
        setState("hidden");
      } else {
        setState("failed");
      }
    });
  }, []);

  // Rozhodni, či zobraziť zámok; na non-iOS skús bio automaticky (zero-tap).
  useEffect(() => {
    if (!shouldShow()) { setState("hidden"); return; }
    setState("locked");
    if (canAutoTriggerBio() && !autoTried.current) {
      autoTried.current = true;
      runAuth();
    }
  }, [shouldShow, runAuth]);

  // Reaguj na zmenu session (logout inde) — vráť zámok
  useEffect(() => {
    const onChange = () => { if (shouldShow()) { autoTried.current = false; setState("locked"); } };
    window.addEventListener("client-session-changed", onChange);
    return () => window.removeEventListener("client-session-changed", onChange);
  }, [shouldShow]);

  const dismiss = () => { sessionStorage.setItem(DISMISS_KEY, "1"); setState("hidden"); };
  const forget = () => { clearClientBiometric(); window.dispatchEvent(new Event("bio-status-changed")); setState("hidden"); };

  if (state === "hidden") return null;

  return (
    <div className="fixed inset-0 z-[100] concrete-navy flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-secondary/95 backdrop-blur rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Header s pulzujúcim Face ID kruhom */}
        <div className="px-8 pt-9 pb-7 text-center">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <span className={`absolute inset-0 rounded-full bg-primary/15 ${state === "pending" ? "animate-ping" : ""}`} />
            <span className="absolute inset-0 rounded-full border-2 border-primary/40 flex items-center justify-center">
              <Fingerprint className={`w-9 h-9 text-primary ${state === "pending" ? "animate-pulse" : ""}`} />
            </span>
            {state === "pending" && (
              <span className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            )}
          </div>
          {state === "pending" ? (
            <>
              <p className="text-white font-black text-lg">Overujem totožnosť…</p>
              <p className="text-white/40 text-sm mt-1">Potvrďte Face ID alebo odtlačok prsta</p>
            </>
          ) : state === "failed" ? (
            <>
              <p className="text-white font-black text-lg">Biometria zlyhala</p>
              <p className="text-white/40 text-sm mt-1">Skúste znova alebo pokračujte bez prihlásenia</p>
            </>
          ) : (
            <>
              <p className="text-white font-black text-lg">Vitajte späť</p>
              <p className="text-white/40 text-sm mt-1">Prihláste sa biometricky — bez hesla</p>
            </>
          )}
        </div>

        {/* Akcie */}
        {state !== "pending" && (
          <div className="px-8 pb-7 space-y-3">
            <button
              onClick={runAuth}
              className="w-full py-4 bg-primary text-secondary font-black text-sm tracking-widest hover:bg-primary/85 active:scale-[0.98] transition-all rounded-lg flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Fingerprint className="w-5 h-5" />
              {state === "failed" ? "Skúsiť znova" : "Odomknúť cez Face ID"}
            </button>
            <button
              onClick={dismiss}
              className="w-full py-3 text-white/45 hover:text-white/80 font-semibold text-sm tracking-wide transition-colors rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Pokračovať bez prihlásenia <ArrowRight className="w-4 h-4" />
            </button>
            {state === "failed" && (
              <button
                onClick={forget}
                className="w-full py-1 text-white/20 hover:text-white/40 font-medium text-xs tracking-wide transition-colors cursor-pointer"
              >
                Zabudnúť toto zariadenie
              </button>
            )}
          </div>
        )}

        {/* Zatváracie X v rohu (rovnaké ako dismiss) */}
        {state !== "pending" && (
          <button onClick={dismiss} aria-label="Zavrieť"
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-white/30 hover:text-white/70 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
