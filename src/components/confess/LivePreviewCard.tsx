import type { AITool, Vibe, Verdict, Plea } from "@/lib/store";
import guiltyBotImg from "./guilty_bot.png";

interface LivePreviewCardProps {
  headline: string;
  suspect: AITool;
  crimeScene: string;
  vibe: Vibe | "";
  verdict: Verdict;
  plea: Plea | "";
  crimeSceneImage: string | null;
  aiDefense: string;
  aiDefenseImage: string | null;
}

const VIBE_LABELS: Record<string, string> = {
  "vibe_coding": "Vibe Coding",
  "deadline_panic": "Deadline Panic",
  "drunk_coded": "Drunk Coded",
  "prod_on_fire": "Prod On Fire",
  "4am_energy": "4AM Energy",
};

const PLEA_LABELS: Record<string, string> = {
  innocent: "Innocent",
  deserve_it: "I Deserve It",
  cooked: "Cooked AF",
};

const VERDICT_LABELS: Record<string, string> = {
  still_broken: "Still Broken",
  nuked: "Nuked",
  solved: "Solved",
  cope_mode: "Cope Active",
  rebuilt: "Rebuilt",
};

export function LivePreviewCard({
  headline,
  suspect,
  crimeScene,
  vibe,
  verdict,
  plea,
  crimeSceneImage,
  aiDefense,
  aiDefenseImage,
}: LivePreviewCardProps) {
  const isEmpty = 
    !headline.trim() && 
    !crimeScene.trim() && 
    !vibe && 
    !plea && 
    !crimeSceneImage && 
    !aiDefense.trim() && 
    !aiDefenseImage;

  if (isEmpty) {
    return (
      <div className="border border-dashed border-ink/20 rounded-xl p-6 text-center flex flex-col justify-center items-center min-h-[140px] bg-paper">
        <p className="font-sans text-sm font-semibold text-ink/50 mb-1">Your confession preview will appear here.</p>
        <p className="font-mono text-[10px] text-ink/40">Start typing above...</p>
      </div>
    );
  }

  // Determine tags
  const tags = [];
  tags.push({ text: VERDICT_LABELS[verdict], type: verdict === "solved" ? "solved" : "broken" });
  tags.push({ text: suspect.charAt(0).toUpperCase() + suspect.slice(1), type: "neutral" });
  if (vibe) {
    tags.push({ text: VIBE_LABELS[vibe] || vibe, type: "neutral" });
  }
  if (plea) {
    tags.push({ text: PLEA_LABELS[plea] || plea, type: "neutral" });
  }

  return (
    <article className="border border-ink/15 rounded-xl p-5 bg-paper relative shadow-sm hover:border-ink/25 transition-all space-y-4">
      <div className="absolute top-3 right-3 text-[9px] font-mono font-semibold text-ink/40 bg-ink/5 px-1.5 py-0.5 rounded border border-ink/10 z-10">
        PREVIEW
      </div>
      
      <div>
        {/* Top Meta info */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5 pr-14">
          {tags.map((t, idx) => (
            <span
              key={idx}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-sans font-semibold border transition-colors ${
                t.type === "broken"
                  ? "border-hot/30 bg-hot/10 text-hot"
                  : t.type === "solved"
                  ? "border-volt/40 bg-volt/20 text-ink"
                  : "border-ink/15 bg-ink/5 text-ink/70"
              }`}
            >
              {t.text}
            </span>
          ))}
          <span className="font-sans text-[11px] text-ink/40 ml-1">• just now</span>
        </div>
        
        {/* Post Title */}
        <h2 className="text-base sm:text-lg font-bold text-ink mb-1.5 leading-snug font-sans">
          {headline.trim() || "Untitled Trauma"}
        </h2>
        
        {/* Post Body text */}
        <p className="text-sm text-ink/80 font-sans whitespace-pre-wrap leading-relaxed">
          {crimeScene.trim() || "No details entered yet..."}
        </p>

        {/* Attached Crime Scene Image */}
        {crimeSceneImage && (
          <div className="mt-3 border border-ink/10 rounded-xl overflow-hidden bg-ink/5 max-h-72 flex items-center justify-center">
            <img src={crimeSceneImage} className="w-full max-h-72 object-contain" alt="Crime Scene evidence" />
          </div>
        )}
      </div>

      {/* AI Defense Thread Reply */}
      {(aiDefense.trim() || aiDefenseImage) && (
        <div className="border-t border-ink/10 pt-4 flex gap-3 relative">
          {/* Thread connector line */}
          <div className="absolute left-4.5 top-0 bottom-4 w-[2px] bg-ink/10" />
          
          <div className="w-9 h-9 rounded-full bg-ink/5 flex items-center justify-center font-bold text-sm select-none border border-ink/10 flex-shrink-0 z-10">
            🤖
          </div>
          <div className="flex-1 min-w-0 space-y-1.5 relative pr-14">
            <div className="flex items-center gap-1.5">
              <span className="font-sans text-xs font-bold text-ink uppercase tracking-wide">@{suspect}</span>
              <span className="font-sans text-[9px] bg-volt px-1.5 py-0.2 border border-volt/20 text-ink font-bold rounded-full select-none">BOT</span>
              <span className="font-sans text-[11px] text-ink/40">• reply thread</span>
            </div>
            
            {aiDefense.trim() && (
              <p className="text-xs text-ink/85 italic font-mono bg-ink/5 p-2.5 rounded-lg border border-ink/5 leading-relaxed">
                &ldquo;{aiDefense}&rdquo;
              </p>
            )}
            
            {aiDefenseImage && (
              <div className="border border-ink/10 rounded-xl overflow-hidden bg-ink/5 max-h-60 mt-1.5 flex items-center justify-center">
                <img src={aiDefenseImage} className="w-full max-h-60 object-contain" alt="AI Defense attachment" />
              </div>
            )}

            {/* Sweating robot sticker absolute overlay */}
            <div className="absolute -right-4 -bottom-3 w-16 h-16 pointer-events-none transform rotate-[8deg] z-20">
              <img src={guiltyBotImg} className="w-full h-full object-contain drop-shadow-md" alt="Guilty bot sticker" />
            </div>
          </div>
        </div>
      )}

      {/* Reactions bar */}
      <div className="border-t border-ink/10 pt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-2.5">
          {["💀 0", "😭 0", "🫥 0", "🤡 0", "🪦 0", "🔥 0", "🫠 0"].map((r, i) => (
            <span key={i} className="font-sans text-[11px] text-ink/65 hover:text-ink transition-colors cursor-pointer">
              {r}
            </span>
          ))}
        </div>
        <span className="font-mono text-[10px] text-ink/40">anon-preview</span>
      </div>
    </article>
  );
}
