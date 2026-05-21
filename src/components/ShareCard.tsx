import type { Post } from "@/lib/store";
import { useRef } from "react";

export function ShareCard({ post }: { post: Post }) {
  const ref = useRef<HTMLDivElement>(null);

  const copyText = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/post/${post.id}` : "";
    await navigator.clipboard.writeText(`"${post.title}"\n\nvia VibeFail — ${url}`);
    alert("Copied to clipboard");
  };

  const shareX = () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/post/${post.id}` : "";
    const text = encodeURIComponent(`"${post.title}" — confessed on @vibefail ${url}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  return (
    <div>
      <div ref={ref} className="brutal-card p-8 bg-paper relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
             style={{ backgroundImage: "repeating-linear-gradient(45deg, #000 0 2px, transparent 2px 12px)" }} />
        <div className="flex items-center justify-between mb-6">
          <span className="display text-xl">VIBE<span className="bg-ink text-paper px-1">FAIL</span></span>
          <span className="mono text-xs">/ confession #{post.id.slice(-4)}</span>
        </div>
        <div className="flex gap-2 mb-4">
          <span className={`brutal-tag ${post.status === "broken" ? "tag-broken" : "tag-solved"}`}>
            {post.status === "broken" ? "★ Still Broken" : "✓ Solved"}
          </span>
          <span className="brutal-tag">{post.tool}</span>
        </div>
        <p className="display text-2xl sm:text-3xl leading-tight mb-6">"{post.title}"</p>
        <div className="border-t-2 border-ink pt-3 mono text-xs flex justify-between">
          <span>— {post.author}</span>
          <span>vibefail.app</span>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={copyText} className="brutal-btn-ghost text-xs">Copy link</button>
        <button onClick={shareX} className="brutal-btn text-xs">Post to X</button>
      </div>
    </div>
  );
}
