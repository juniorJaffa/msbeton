import { useState, useEffect } from "react";
import { formatPhone } from "@/lib/utils";

interface PhoneInputProps {
  value: string;
  onChange: (formatted: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

// Telefónny vstup – formátuje na blur, nie na každý keystroke.
// Akceptuje 0944123456, +421944123456, 0944 123 456 → vždy uloží 0944 123 456.
export function PhoneInput({ value, onChange, placeholder = "0944 xxx xxx", className, id }: PhoneInputProps) {
  const [raw, setRaw] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setRaw(value);
  }, [value, focused]);

  const handleBlur = () => {
    setFocused(false);
    const formatted = formatPhone(raw);
    setRaw(formatted);
    onChange(formatted);
  };

  return (
    <input
      id={id}
      type="tel"
      inputMode="tel"
      value={focused ? raw : value}
      onChange={e => setRaw(e.target.value.replace(/[^\d+\s\-()]/g, ""))}
      onFocus={() => { setFocused(true); setRaw(value); }}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
    />
  );
}
