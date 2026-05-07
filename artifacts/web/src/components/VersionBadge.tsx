import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function VersionBadge({ className }: { className?: string }) {
  const [hash, setHash] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/version", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (d.hash && d.hash !== "unknown") setHash(d.hash); })
      .catch(() => {});
  }, []);
  if (!hash) return null;
  return <span className={cn("font-mono text-[10px] opacity-40 select-none", className)}>v{hash}</span>;
}
