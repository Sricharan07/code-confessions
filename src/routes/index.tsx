import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PostCard } from "@/components/PostCard";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "VibeFail — Post the worst thing AI did to your code" },
      { name: "description", content: "Anonymous wall of AI-coding disasters. Confess. React. Survive." },
    ],
  }),
});

type Sort = "hot" | "new" | "broken";

function Index() {
  const { posts } = useStore();
  const [sort, setSort] = useState<Sort>("hot");
  const [tool, setTool] = useState<string>("All");

  const visible = useMemo(() => {
    let p = posts.filter((x) => !x.hidden);
    if (tool !== "All") p = p.filter((x) => x.tool === tool);
    if (sort === "new") p = [...p].sort((a, b) => b.createdAt - a.createdAt);
    else if (sort === "broken") p = p.filter((x) => x.status === "broken").sort((a, b) => b.createdAt - a.createdAt);
    else p = [...p].sort((a, b) => {
      const sa = Object.values(a.reactions).reduce((x, y) => x + y, 0);
      const sb = Object.values(b.reactions).reduce((x, y) => x + y, 0);
      return sb - sa;
    });
    return p;
  }, [posts, sort, tool]);

  const tools = ["All", ...Array.from(new Set(posts.map((p) => p.tool)))];

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-20">
      {/* Hero */}
      <section className="grid md:grid-cols-12 gap-6 mb-12 items-end">
        <div className="md:col-span-8">
          <p className="mono text-xs uppercase mb-3 inline-block bg-ink text-paper px-2 py-1">Vol. 01 · Public Wall</p>
          <h1 className="display text-5xl sm:text-7xl md:text-8xl mb-4">
            Post the worst thing
            <br />
            <span className="bg-hot text-paper px-2">AI did</span> to your code.
          </h1>
          <p className="text-base sm:text-lg max-w-xl text-ink/80">
            No accounts. No karma. No mods (mostly). Just the receipts from when your agent went rogue, your autocomplete grew a soul, and your prod went dark.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/submit" className="brutal-btn">＋ Confess anonymously</Link>
            <a href="#feed" className="brutal-btn-ghost">↓ Read the wreckage</a>
          </div>
        </div>
        <aside className="md:col-span-4 brutal-card p-5">
          <p className="mono text-xs uppercase mb-2">— Today on the wall</p>
          <div className="space-y-2 mono text-sm">
            <div className="flex justify-between"><span>Confessions</span><span className="font-bold">{posts.length}</span></div>
            <div className="flex justify-between"><span>Still broken</span><span className="font-bold text-hot">{posts.filter(p => p.status === "broken").length}</span></div>
            <div className="flex justify-between"><span>Solved</span><span className="font-bold">{posts.filter(p => p.status === "solved").length}</span></div>
            <div className="flex justify-between"><span>Reactions</span><span className="font-bold">{posts.reduce((s, p) => s + Object.values(p.reactions).reduce((a, b) => a + b, 0), 0)}</span></div>
          </div>
          <div className="mt-4 border-t-2 border-ink pt-3 mono text-xs">
            "I have seen things you people wouldn't believe. <span className="bg-volt px-1">Tabs on fire</span> off the shoulder of Vercel."
          </div>
        </aside>
      </section>

      {/* Filters */}
      <div id="feed" className="flex flex-wrap items-center justify-between gap-3 mb-6 border-y-2 border-ink py-3">
        <div className="flex gap-2">
          {(["hot", "new", "broken"] as Sort[]).map((s) => (
            <button key={s} onClick={() => setSort(s)}
              className={`mono text-xs font-bold uppercase px-3 py-1 border-2 border-ink ${sort === s ? "bg-ink text-paper" : "bg-paper"}`}>
              {s === "hot" ? "🔥 Hot" : s === "new" ? "⌁ New" : "★ Still Broken"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="mono text-xs uppercase">Filter:</span>
          <select value={tool} onChange={(e) => setTool(e.target.value)}
            className="brutal-border bg-paper mono text-xs uppercase font-bold px-2 py-1">
            {tools.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Feed */}
      <div className="grid md:grid-cols-2 gap-6">
        {visible.map((p, i) => <PostCard key={p.id} post={p} rank={sort === "hot" ? i + 1 : undefined} />)}
      </div>

      {visible.length === 0 && (
        <div className="brutal-card p-10 text-center">
          <p className="display text-3xl mb-2">No fails. Yet.</p>
          <p className="mono text-sm mb-4">Suspicious. Be the first to confess.</p>
          <Link to="/submit" className="brutal-btn">＋ Confess</Link>
        </div>
      )}
    </main>
  );
}
