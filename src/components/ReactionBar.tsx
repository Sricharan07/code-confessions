import { REACTION_META, hasReacted, toggleReaction, type Post, type Reaction } from "@/lib/store";

export function ReactionBar({ post }: { post: Post }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(REACTION_META) as Reaction[]).map((k) => {
        const active = hasReacted(post.id, k);
        return (
          <button
            key={k}
            onClick={() => toggleReaction(post.id, k)}
            className={`brutal-btn-ghost text-xs flex items-center gap-2 ${active ? "bg-volt" : ""}`}
          >
            <span className="text-base">{REACTION_META[k].emoji}</span>
            <span>{REACTION_META[k].label}</span>
            <span className="opacity-60">{post.reactions[k]}</span>
          </button>
        );
      })}
    </div>
  );
}
