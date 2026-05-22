import type { AITool } from "@/lib/store";

interface SuspectPickerProps {
  value: AITool;
  onChange: (val: AITool) => void;
}

const SUSPECTS: { key: AITool; label: string; class: string }[] = [
  { key: "cursor", label: "Cursor", class: "bg-orange-100/40 text-orange-800 dark:bg-orange-950/20 dark:text-orange-300 border-orange-200/40" },
  { key: "chatgpt", label: "ChatGPT", class: "bg-emerald-100/40 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300 border-emerald-200/40" },
  { key: "claude", label: "Claude", class: "bg-amber-100/40 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300 border-amber-200/40" },
  { key: "copilot", label: "Copilot", class: "bg-orange-100/40 text-orange-800 dark:bg-orange-950/20 dark:text-orange-300 border-orange-200/40" },
  { key: "gemini", label: "Gemini", class: "bg-blue-100/40 text-blue-800 dark:bg-blue-950/20 dark:text-blue-300 border-blue-200/40" },
  { key: "other", label: "Other", class: "bg-zinc-100/50 text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-300 border-zinc-200/50 dark:border-zinc-800" },
];

export function SuspectPicker({ value, onChange }: SuspectPickerProps) {
  return (
    <div className="space-y-1.5">
      <label className="font-sans text-xs font-semibold text-ink/70 dark:text-zinc-400 block">
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
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                isSelected
                  ? `${s.class} shadow-sm border-zinc-300 dark:border-zinc-700 scale-105`
                  : "bg-paper dark:bg-zinc-950 border-ink/10 dark:border-zinc-800 text-ink/70 dark:text-zinc-400 hover:bg-ink/5 dark:hover:bg-zinc-900/60"
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
