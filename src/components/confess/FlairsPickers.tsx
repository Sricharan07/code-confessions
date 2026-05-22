import type { Vibe, Verdict, Plea } from "@/lib/store";

// Reduced and curated Vibe options
const VIBES = [
  { key: "vibe_coding", label: "Vibe Coding", emoji: "🫠", desc: "No thoughts, just vibes" },
  { key: "deadline_panic", label: "Deadline Panic", emoji: "🚨", desc: "Shipping in 5 mins" },
  { key: "drunk_coded", label: "Drunk Coded", emoji: "🍺", desc: "Will fix tomorrow" },
  { key: "prod_on_fire", label: "Prod on Fire", emoji: "🔥", desc: "Everything is burning" },
  { key: "4am_energy", label: "4AM Energy", emoji: "☕", desc: "Hallucinating code" },
] as const;

// Curated Verdict options
const VERDICTS = [
  { key: "still_broken", label: "Still Broken", emoji: "💣", desc: "Zero progress made" },
  { key: "nuked", label: "Nuked it", emoji: "🪦", desc: "Deleted the folder" },
  { key: "solved", label: "Actually Solved", emoji: "✅", desc: "It works now" },
  { key: "cope_mode", label: "Cope Active", emoji: "🎭", desc: "Works on my machine" },
  { key: "rebuilt", label: "Rebuilt", emoji: "⚰️", desc: "Started from scratch" },
] as const;

// Curated Plea options
const PLEAS = [
  { key: "innocent", label: "Plead Innocent", emoji: "😇", desc: "The AI lied to me" },
  { key: "deserve_it", label: "Deserve This", emoji: "🤡", desc: "Blind copy-paste" },
  { key: "cooked", label: "Cooked AF", emoji: "🤐", desc: "No further comments" },
] as const;

// VIBE PICKER
interface VibePickerProps {
  value: Vibe | "";
  onChange: (val: Vibe | "") => void;
}

export function VibePicker({ value, onChange }: VibePickerProps) {
  const toggle = (k: Vibe) => {
    if (value === k) {
      onChange("");
    } else {
      onChange(k);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="font-sans text-xs font-semibold text-ink/70 dark:text-zinc-400 block">
        Vibe (Optional)
      </label>
      <div className="flex flex-wrap gap-1.5">
        {VIBES.map((v) => {
          const isSelected = value === v.key;
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => toggle(v.key as Vibe)}
              className={`flex items-center gap-1.5 py-1 px-3 rounded-full border text-[11px] font-semibold transition-all duration-150 scale-[1.0] hover:scale-[1.01] active:scale-[0.98] cursor-pointer ${
                isSelected
                  ? "bg-hot/10 dark:bg-hot/15 border-hot/45 dark:border-hot/50 text-hot font-bold shadow-sm"
                  : "bg-paper dark:bg-zinc-950/40 border-ink/10 dark:border-zinc-800 text-ink/80 dark:text-zinc-300 hover:bg-ink/5 dark:hover:bg-zinc-900/60"
              }`}
            >
              <span className="text-sm select-none leading-none">{v.emoji}</span>
              <span className="uppercase tracking-tight leading-none">{v.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// VERDICT PICKER
interface VerdictPickerProps {
  value: Verdict;
  onChange: (val: Verdict) => void;
}

export function VerdictPicker({ value, onChange }: VerdictPickerProps) {
  return (
    <div className="space-y-1.5">
      <label className="font-sans text-xs font-semibold text-ink/70 dark:text-zinc-400 block">
        Verdict (Optional, defaults to Still Broken)
      </label>
      <div className="flex flex-wrap gap-1.5">
        {VERDICTS.map((vd) => {
          const isSelected = value === vd.key;
          return (
            <button
              key={vd.key}
              type="button"
              onClick={() => onChange(vd.key as Verdict)}
              className={`flex items-center gap-1.5 py-1 px-3 rounded-full border text-[11px] font-semibold transition-all duration-150 scale-[1.0] hover:scale-[1.01] active:scale-[0.98] cursor-pointer ${
                isSelected
                  ? "bg-hot/10 dark:bg-hot/15 border-hot/45 dark:border-hot/50 text-hot font-bold shadow-sm"
                  : "bg-paper dark:bg-zinc-950/40 border-ink/10 dark:border-zinc-800 text-ink/80 dark:text-zinc-300 hover:bg-ink/5 dark:hover:bg-zinc-900/60"
              }`}
            >
              <span className="text-sm select-none leading-none">{vd.emoji}</span>
              <span className="uppercase tracking-tight leading-none">{vd.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// PLEA PICKER
interface PleaPickerProps {
  value: Plea | "";
  onChange: (val: Plea | "") => void;
}

export function PleaPicker({ value, onChange }: PleaPickerProps) {
  const toggle = (k: Plea) => {
    if (value === k) {
      onChange("");
    } else {
      onChange(k);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="font-sans text-xs font-semibold text-ink/70 dark:text-zinc-400 block">
        Your Plea (Optional)
      </label>
      <div className="flex flex-wrap gap-1.5">
        {PLEAS.map((p) => {
          const isSelected = value === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => toggle(p.key as Plea)}
              className={`flex items-center gap-1.5 py-1 px-3 rounded-full border text-[11px] font-semibold transition-all duration-150 scale-[1.0] hover:scale-[1.01] active:scale-[0.98] cursor-pointer ${
                isSelected
                  ? "bg-hot/10 dark:bg-hot/15 border-hot/45 dark:border-hot/50 text-hot font-bold shadow-sm"
                  : "bg-paper dark:bg-zinc-950/40 border-ink/10 dark:border-zinc-800 text-ink/80 dark:text-zinc-300 hover:bg-ink/5 dark:hover:bg-zinc-900/60"
              }`}
            >
              <span className="text-sm select-none leading-none">{p.emoji}</span>
              <span className="uppercase tracking-tight leading-none">{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
