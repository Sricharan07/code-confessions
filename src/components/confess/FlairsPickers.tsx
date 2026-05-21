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
    <div className="space-y-2">
      <label className="font-sans text-xs font-semibold text-ink/75 block">
        Vibe (Optional)
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {VIBES.map((v) => {
          const isSelected = value === v.key;
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => toggle(v.key as Vibe)}
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-150 scale-[1.0] hover:scale-[1.01] active:scale-[0.98] cursor-pointer ${
                isSelected
                  ? "bg-volt/10 border-ink text-ink font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                  : "bg-paper border-ink/15 text-ink hover:bg-ink/5 hover:border-ink/30"
              }`}
            >
              <span className="text-xl select-none leading-none mt-0.5">{v.emoji}</span>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-ink uppercase tracking-tight leading-tight">{v.label}</span>
                <span className="text-[9px] text-ink/50 leading-tight mt-0.5 truncate">{v.desc}</span>
              </div>
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
    <div className="space-y-2">
      <label className="font-sans text-xs font-semibold text-ink/75 block">
        Verdict (Optional, defaults to Still Broken)
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {VERDICTS.map((vd) => {
          const isSelected = value === vd.key;
          return (
            <button
              key={vd.key}
              type="button"
              onClick={() => onChange(vd.key as Verdict)}
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-150 scale-[1.0] hover:scale-[1.01] active:scale-[0.98] cursor-pointer ${
                isSelected
                  ? "bg-volt/10 border-ink text-ink font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                  : "bg-paper border-ink/15 text-ink hover:bg-ink/5 hover:border-ink/30"
              }`}
            >
              <span className="text-xl select-none leading-none mt-0.5">{vd.emoji}</span>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-ink uppercase tracking-tight leading-tight">{vd.label}</span>
                <span className="text-[9px] text-ink/50 leading-tight mt-0.5 truncate">{vd.desc}</span>
              </div>
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
    <div className="space-y-2">
      <label className="font-sans text-xs font-semibold text-ink/75 block">
        Your Plea (Optional)
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {PLEAS.map((p) => {
          const isSelected = value === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => toggle(p.key as Plea)}
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-150 scale-[1.0] hover:scale-[1.01] active:scale-[0.98] cursor-pointer ${
                isSelected
                  ? "bg-volt/10 border-ink text-ink font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                  : "bg-paper border-ink/15 text-ink hover:bg-ink/5 hover:border-ink/30"
              }`}
            >
              <span className="text-xl select-none leading-none mt-0.5">{p.emoji}</span>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-ink uppercase tracking-tight leading-tight">{p.label}</span>
                <span className="text-[9px] text-ink/50 leading-tight mt-0.5 truncate">{p.desc}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
