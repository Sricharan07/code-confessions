import type { AITool } from "@/lib/store";

interface SuspectPickerProps {
  value: AITool;
  onChange: (val: AITool) => void;
}

const SUSPECTS: { key: AITool; label: string }[] = [
  { key: "cursor", label: "CURSOR" },
  { key: "chatgpt", label: "CHATGPT" },
  { key: "claude", label: "CLAUDE" },
  { key: "copilot", label: "COPILOT" },
  { key: "gemini", label: "GEMINI" },
  { key: "other", label: "OTHER" },
];

export function SuspectPicker({ value, onChange }: SuspectPickerProps) {
  return (
    <div className="space-y-1.5">
      <label className="font-sans text-xs font-semibold text-ink/70 block">
        Suspect (Required)
      </label>
      <div className="flex flex-wrap gap-2">
        {SUSPECTS.map((s) => {
          const isSelected = value === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onChange(s.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                isSelected
                  ? "bg-volt text-ink border-ink/40 font-semibold shadow-sm"
                  : "bg-paper border-ink/20 text-ink/80 hover:bg-ink/5 hover:border-ink/35"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
