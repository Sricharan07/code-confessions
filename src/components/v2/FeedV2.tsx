import { useState } from "react";
import { useStore } from "@/lib/store";
import { timeAgo } from "@/lib/store";

export function FeedV2() {
  const [tab, setTab] = useState<"for-you" | "following">("for-you");
  const { posts } = useStore();

  const visible = posts.filter(p => !p.hidden).sort((a, b) => {
    if (tab === "for-you") {
      const sa = Object.values(a.reactions).reduce((x, y) => x + y, 0);
      const sb = Object.values(b.reactions).reduce((x, y) => x + y, 0);
      return sb - sa;
    }
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Tab Header */}
      <div className="sticky top-0 bg-paper/80 backdrop-blur-md z-10 border-b border-ink/10 flex">
        <button 
          onClick={() => setTab("for-you")}
          className={`flex-1 py-4 font-bold text-[15px] hover:bg-ink/5 transition-colors relative
            ${tab === "for-you" ? "text-ink" : "text-muted-foreground font-medium"}`}
        >
          For you
          {tab === "for-you" && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-volt rounded-t-full" />}
        </button>
        <button 
          onClick={() => setTab("following")}
          className={`flex-1 py-4 font-bold text-[15px] hover:bg-ink/5 transition-colors relative
            ${tab === "following" ? "text-ink" : "text-muted-foreground font-medium"}`}
        >
          Following
          {tab === "following" && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-volt rounded-t-full" />}
        </button>
      </div>


      <div className="flex-1 flex flex-col">
        {visible.map((p) => {
          const total = Object.values(p.reactions).reduce((a, b) => a + b, 0);
          return (
            <div key={p.id} className="p-4 border-b border-ink/10 hover:bg-ink/[0.02] transition-colors cursor-pointer flex gap-3">
              <div className="w-10 h-10 bg-volt rounded-full shrink-0 flex items-center justify-center font-bold text-ink">
                {p.author?.[0]?.toUpperCase() || "A"}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-1">
                  <span className="font-bold text-[15px]">{p.author}</span>
                  <span className="text-[15px] text-muted-foreground">@{p.author}</span>
                  <span className="text-muted-foreground px-1">·</span>
                  <span className="text-[15px] text-muted-foreground">{timeAgo(p.createdAt)}</span>
                </div>
                <div className="text-[15px] mb-2 leading-tight">
                  <span className="font-bold">{p.title}</span> — {p.body}
                </div>
                <div className="flex items-center gap-4 text-muted-foreground text-[13px] mt-3">
                  <div className="flex items-center gap-2 hover:text-hot transition-colors cursor-pointer">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><g><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zM5.885 3.88c-1.814 1.41-2.926 3.6-2.926 5.92 0 4.18 3.367 7.56 7.546 7.56h1.22v3.36l6.607-3.66c1.93-1.07 3.12-3.1 3.12-5.27 0-3.39-2.75-6.13-6.129-6.13H9.756c-1.42 0-2.82.38-4.07 1.11l.2-.89z"></path></g></svg>
                    <span>{p.reactions.lol + p.reactions.rip}</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-volt transition-colors cursor-pointer">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><g><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zm-3.5-6H14a.5.5 0 100-1H8.5a.5.5 0 100 1zm0-3h7a.5.5 0 100-1h-7a.5.5 0 100 1zm0-3h5a.5.5 0 100-1h-5a.5.5 0 100 1z"></path></g></svg>
                    <span>{total}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[11px] uppercase tracking-wider font-bold bg-ink/5 px-2 py-0.5 rounded-full">{p.tool}</span>
                    <span className={`text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${p.status === "broken" ? "bg-hot/10 text-hot" : "bg-volt/20 text-ink"}`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {visible.length === 0 && (
          <div className="p-10 text-center text-muted-foreground text-[15px]">
            Nothing to see here — yet.
          </div>
        )}
      </div>
    </div>
  );
}
