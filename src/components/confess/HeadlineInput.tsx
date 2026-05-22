import { useState, useEffect } from "react";
import { HEADLINE_PLACEHOLDERS } from "./placeholders";

interface HeadlineInputProps {
  value: string;
  onChange: (val: string) => void;
}

export function HeadlineInput({ value, onChange }: HeadlineInputProps) {
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % HEADLINE_PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const charsLeft = 140 - value.length;
  const isNearLimit = charsLeft <= 20;

  return (
    <div className="space-y-1.5">
      <label className="font-sans text-xs font-semibold text-ink/70 block">
        Title (Required)
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={140}
          placeholder={HEADLINE_PLACEHOLDERS[placeholderIdx]}
          className="w-full bg-paper border border-ink/20 rounded-lg px-3.5 py-2 text-sm font-medium focus:outline-none focus:border-ink/40 focus:ring-1 focus:ring-ink/10 transition-all placeholder:text-ink/45"
        />
        <div
          className={`absolute bottom-2 right-3 font-mono text-[9px] font-medium px-1 ${
            isNearLimit ? "bg-hot text-paper rounded border border-hot" : "text-ink/40"
          }`}
        >
          {value.length}/140
        </div>
      </div>
    </div>
  );
}
