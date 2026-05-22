import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { addComment, deletePost, setStatus, timeAgo, useStore } from "@/lib/store";
import { ReactionBar } from "@/components/ReactionBar";
import { ShareCard } from "@/components/ShareCard";

export const Route = createFileRoute("/post/$id")({
  component: PostPage,
  notFoundComponent: () => (
    <main className="mx-auto max-w-2xl px-6 py-20 text-center">
      <p className="display text-5xl mb-3">404 / lost the receipt</p>
      <Link to="/" className="brutal-btn mt-4">Back to the wall</Link>
    </main>
  ),
});

function PostPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { posts, comments, user } = useStore();
  const post = posts.find((p) => p.id === id);
  if (!post) throw notFound();
  const thread = comments.filter((c) => c.postId === id).sort((a, b) => a.createdAt - b.createdAt);
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isAuthorOrMod = user && (post.authorSessionId === user.id || user.role === "moderator");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.trim().length === 0) return;
    addComment(post.id, draft.trim().slice(0, 500));
    setDraft("");
  };

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-10 pb-20 grid md:grid-cols-3 gap-8">
      <article className="md:col-span-2">
        <Link to="/" className="mono text-xs uppercase font-bold hover:bg-volt px-1">← back to wall</Link>
        <div className="flex flex-wrap items-center gap-2 mt-4 mb-3">
          <span className={`brutal-tag ${post.status === "broken" ? "tag-broken" : "tag-solved"}`}>
            {post.status === "broken" ? "★ Still Broken" : "✓ Solved"}
          </span>
          <span className="brutal-tag">{post.tool}</span>
          <span className="brutal-tag">{post.language}</span>
          <span className="mono text-xs text-muted-foreground">{timeAgo(post.createdAt)} · {post.author}</span>
        </div>
        <h1 className="display text-3xl sm:text-5xl mb-5 leading-tight">{post.title}</h1>
        <div className="brutal-card p-5 sm:p-6 mb-6">
          <p className="mono text-sm sm:text-base whitespace-pre-wrap leading-relaxed">{post.body}</p>
        </div>

        <div className="mb-6">
          <ReactionBar post={post} />
        </div>

        <div className="border-2 border-ink p-4 mb-8 flex items-center justify-between gap-3 flex-wrap">
          <p className="mono text-xs uppercase font-bold">Did you fix it?</p>
          {isAuthorOrMod ? (
            <div className="flex gap-2">
              <button onClick={() => setStatus(post.id, "broken")}
                className={`brutal-btn-ghost text-xs ${post.status === "broken" ? "bg-hot text-paper" : ""}`}>★ Still broken</button>
              <button onClick={() => setStatus(post.id, "solved")}
                className={`brutal-btn-ghost text-xs ${post.status === "solved" ? "bg-volt" : ""}`}>✓ Solved</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`brutal-tag text-xs ${post.status === "broken" ? "tag-broken" : "tag-solved"}`}>
                {post.status === "broken" ? "★ Still Broken" : "✓ Solved"}
              </span>
              <span className="mono text-[10px] text-muted-foreground">(only author can change)</span>
            </div>
          )}
        </div>

        {isAuthorOrMod && (
          <div className="border-2 border-hot p-4 mb-8 flex items-center justify-between gap-3 flex-wrap bg-hot/5">
            <p className="mono text-xs uppercase font-bold text-hot font-bold">Danger zone</p>
            <div className="flex gap-2">
              {confirmDelete ? (
                <>
                  <button
                    onClick={async () => {
                      await deletePost(post.id);
                      navigate({ to: "/" });
                    }}
                    className="brutal-btn text-xs bg-hot text-paper"
                  >
                    Confirm delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="brutal-btn-ghost text-xs"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="brutal-btn-ghost text-xs text-hot hover:bg-hot hover:text-paper"
                >
                  Delete Post
                </button>
              )}
            </div>
          </div>
        )}

        <section>
          <h2 className="display text-2xl mb-4">The peanut gallery <span className="mono text-sm text-muted-foreground">({thread.length})</span></h2>
          <form onSubmit={submit} className="brutal-card p-4 mb-5">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="leave a condolence, a roast, or your own war story"
              className="w-full bg-paper mono text-sm focus:outline-none"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="mono text-[10px] text-muted-foreground">{draft.length}/500 · anonymous</span>
              <button className="brutal-btn text-xs">Reply</button>
            </div>
          </form>
          <ul className="space-y-3">
            {thread.map((c) => (
              <li key={c.id} className="border-l-4 border-ink pl-4 py-2">
                <div className="mono text-[10px] uppercase text-muted-foreground mb-1">{c.author} · {timeAgo(c.createdAt)}</div>
                <p className="mono text-sm">{c.body}</p>
              </li>
            ))}
            {thread.length === 0 && <li className="mono text-sm text-muted-foreground">silence. brutal.</li>}
          </ul>
        </section>
      </article>

      <aside className="md:col-span-1 space-y-4">
        <p className="mono text-xs uppercase font-bold">Spread the pain</p>
        <ShareCard post={post} />
      </aside>
    </main>
  );
}
