import { cn } from "@/lib/utils";

interface Props {
  mode: "faktura" | "hotovost";
  onChange: (m: "faktura" | "hotovost") => void;
  showHotovost?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PriceModeToggle({ mode, onChange, showHotovost = true, size = "md", className }: Props) {
  const pad = size === "sm" ? "py-1.5 px-3 text-xs" : size === "lg" ? "py-3 px-6 text-sm" : "py-2 px-4 text-xs";
  return (
    <div className={cn("flex bg-[#1a2535] rounded-xl p-1 gap-1 border border-white/10", className)}>
      <button
        onClick={() => onChange("faktura")}
        className={cn(
          "flex-1 rounded-lg font-black tracking-widest transition-all",
          pad,
          mode === "faktura" ? "bg-primary text-navy shadow-sm" : "text-white/40 hover:text-white/70"
        )}
      >
        FAKTÚRA
      </button>
      {showHotovost && (
        <button
          onClick={() => onChange("hotovost")}
          className={cn(
            "flex-1 rounded-lg font-black tracking-widest transition-all",
            pad,
            mode === "hotovost" ? "bg-primary text-navy shadow-sm" : "text-white/40 hover:text-white/70"
          )}
        >
          HOTOVOSŤ
        </button>
      )}
    </div>
  );
}
