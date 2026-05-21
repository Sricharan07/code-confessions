import { Link } from "@tanstack/react-router";
import { REACTION_META, type Post, timeAgo } from "@/lib/store";

export function PostCard({ post, rank }: { post: Post; rank?: number }) {
  const total = Object.values(post.reactions).reduce((a, b) => a + b, 0);
  return (
    <Link to="/post/$id" params={{ id: post.id }} className="block">
      <article className="brutal-card p-5 sm:p-6 relative">
        {typeof rank === "number" && (
          <div className="absolute -top-3 -left-3 bg-ink text-paper mono font-bold text-xs px-2 py-1 brutal-border">
            #{String(rank).padStart(2, "0")}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`brutal-tag ${post.status === "broken" ? "tag-broken" : "tag-solved"}`}>
            {post.status === "broken" ? "★ Still Broken" : "✓ Solved"}
          </span>
          <span className="brutal-tag">{post.tool}</span>
          <span className="brutal-tag">{post.language}</span>
          <span className="mono text-xs text-muted-foreground ml-auto">{timeAgo(post.createdAt)}</span>
        </div>
        <h2 className="display text-xl sm:text-2xl mb-2 leading-tight">{post.title}</h2>
        <p className="text-sm sm:text-base text-ink/80 line-clamp-3">{post.body}</p>
        <div className="mt-4 flex items-center justify-between border-t-2 border-ink pt-3">
          <div className="flex gap-3">
            {(Object.keys(REACTION_META) as (keyof typeof REACTION_META)[]).map((k) => (
              <span key={k} className="mono text-xs font-bold flex items-center gap-1">
                <span>{REACTION_META[k].emoji}</span>
                <span>{post.reactions[k]}</span>
              </span>
            ))}
          </div>
          <span className="mono text-xs text-muted-foreground">{total} reactions · {post.author}</span>
        </div>
      </article>
    </Link>
  );
}
