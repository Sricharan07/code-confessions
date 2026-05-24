import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore, getAvatarUrl } from "@/lib/store";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "VibeFail — Post the worst thing AI did to your code" },
      { name: "description", content: "Anonymous wall of AI-coding disasters. Confess. React. Survive." },
    ],
  }),
});

function Index() {
  const { posts } = useStore();

  // Curate 3 most popular confessions to showcase as featured disasters
  const featuredDisasters = useMemo(() => {
    return [...posts]
      .filter((p) => !p.hidden)
      .sort((a, b) => {
        const sumA = Object.values(a.reactions || {}).reduce((sum, v) => sum + v, 0);
        const sumB = Object.values(b.reactions || {}).reduce((sum, v) => sum + v, 0);
        return sumB - sumA;
      })
      .slice(0, 3);
  }, [posts]);

  const getToolDisplayName = (tool: string) => {
    const t = tool.toLowerCase();
    if (t === "chatgpt") return "Codex";
    if (t === "claude") return "Claude Code";
    if (t === "gemini") return "Antigravity";
    return tool.charAt(0).toUpperCase() + tool.slice(1);
  };

  const getToolBadgeStyle = (_tool: string) => {
    return "bg-black/[0.06] dark:bg-white/10 backdrop-blur-md text-ink/75 dark:text-zinc-300 border-black/[0.08] dark:border-white/[0.12]";
  };

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 pt-16 pb-24 text-left font-sans">
      
      {/* Left-Aligned Hero Section */}
      <section className="space-y-6 max-w-3xl mb-20 text-left">
        <span className="mono text-[10px] uppercase font-bold tracking-wider inline-block bg-ink dark:bg-zinc-100 text-paper dark:text-zinc-950 px-2.5 py-1 rounded-sm select-none">
          Vol. 01 · Public Wall
        </span>
        <h1 className="font-black text-4xl sm:text-6xl md:text-7xl text-ink dark:text-zinc-50 uppercase tracking-tight leading-[1.05]">
          Post the worst thing
          <br />
          <span className="bg-hot text-paper px-3 inline-block transform -rotate-1 skew-x-1 mt-1.5 rounded-sm pb-1 leading-snug">AI did</span> to your code.
        </h1>
        <p className="text-[15px] sm:text-[16px] leading-relaxed text-ink/75 dark:text-zinc-355 max-w-xl font-normal">
          Welcome to the most chaotic and therapeutic wall of AI-coding disasters. No logins. No karma. Just the receipts from when your autocomplete went rogue, your agent hallucinated database tables, and your production went dark.
        </p>
        <div className="flex flex-wrap gap-4 pt-2 justify-start">
          <Link 
            to="/feed" 
            className="px-6 py-3.5 bg-hot hover:bg-hot/95 text-white font-extrabold text-xs rounded-full transition-all uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <span>Explore</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Featured Disasters Showcase */}
      {featuredDisasters.length > 0 && (
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-4 flex-wrap justify-between">
            <h2 className="font-black text-2xl sm:text-3xl text-ink dark:text-zinc-50 uppercase tracking-tight">
              Featured Disasters
            </h2>
            <Link 
              to="/feed" 
              className="text-[11px] uppercase font-extrabold tracking-wider hover:text-hot transition-colors flex items-center gap-1.5 text-muted-foreground"
            >
              <span>Explore all wreckage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {featuredDisasters.map((post) => {
              const reactionsSum = Object.values(post.reactions || {}).reduce((sum, val) => sum + val, 0);
              return (
                <Link 
                  key={post.id}
                  to="/feed"
                  search={{ post: post.id }}
                  className="group bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between hover:-translate-y-0.5 duration-200 relative h-full text-left"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${getToolBadgeStyle(post.tool)}`}>
                        {getToolDisplayName(post.tool)}
                      </span>
                      <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${getToolBadgeStyle(post.tool)}`}>
                        {post.status === "broken" ? "Still Broken" : "Solved"}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-bold text-lg text-ink dark:text-zinc-150 group-hover:text-hot transition-colors line-clamp-2 leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-xs text-ink/75 dark:text-zinc-355 line-clamp-4 leading-relaxed font-sans font-normal">
                        {post.body}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-zinc-100 dark:border-zinc-850 pt-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img 
                        src={getAvatarUrl(post.author)} 
                        alt="avatar" 
                        className="w-6 h-6 rounded-full bg-zinc-50 border border-zinc-200 dark:border-zinc-800 shrink-0 object-cover" 
                      />
                      <span className="text-[11px] font-bold text-muted-foreground truncate">@{post.author}</span>
                    </div>
                    <span className="text-[10px] font-bold text-hot shrink-0 whitespace-nowrap bg-hot/5 px-2 py-0.5 rounded-full border border-hot/10">{reactionsSum} reactions</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Bottom Sticky CTA Card */}
      <div className="text-left bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-8 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-hot/5 rounded-full filter blur-2xl pointer-events-none" />
        <h3 className="font-black text-2xl sm:text-3xl text-ink dark:text-zinc-50 uppercase tracking-tight mb-3">
          Did AI recently nuke your codebase?
        </h3>
        <p className="text-xs sm:text-sm max-w-lg text-ink/70 dark:text-zinc-355 mb-6 font-sans font-normal">
          Don't suffer in silence. Join thousands of other developers sharing their tragic receipts to heal together in absolute anonymity.
        </p>
        <div className="flex justify-start gap-4 flex-wrap">
          <Link 
            to="/submit" 
            className="px-6 py-3.5 bg-hot hover:bg-hot/95 text-white font-extrabold text-xs rounded-full transition-all uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer"
          >
            Confess
          </Link>
          <Link 
            to="/feed" 
            className="px-6 py-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-ink dark:text-zinc-200 font-extrabold text-xs rounded-full transition-all uppercase tracking-wider text-center cursor-pointer shadow-xs"
          >
            Explore
          </Link>
        </div>
      </div>

    </main>
  );
}
