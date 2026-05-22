import { createFileRoute, Link } from "@tanstack/react-router";
import { deletePost, toggleHidden, useStore, timeAgo } from "@/lib/store";
import { useState } from "react";

export const Route = createFileRoute("/admin")({
  component: Admin,
  head: () => ({ meta: [{ title: "Mod tools — VibeFail" }] }),
});

function Admin() {
  const { posts, comments, user } = useStore();
  const [confirm, setConfirm] = useState<string | null>(null);

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="display text-3xl mb-3">Authenticating...</p>
        <p className="mono text-sm text-muted-foreground">Checking credentials at the door.</p>
      </main>
    );
  }

  const isMod = user.role === "moderator" || user.username === "admin";
  if (!isMod) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="display text-5xl mb-3 text-hot">403 / Access Denied</p>
        <p className="mono text-sm mb-6">This desk is restricted to moderators only. Your credentials do not grant access to these tools.</p>
        <Link to="/" className="brutal-btn mt-4">Return to safety</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-20">
      <p className="mono text-xs uppercase mb-2 inline-block bg-hot text-paper px-2 py-1">Restricted-ish</p>
      <h1 className="display text-5xl mb-2">Mod desk</h1>
      <p className="mono text-sm text-ink/80 mb-8">Hide spam. Nuke abuse. This is the local prototype — wired to your browser only.</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[
          ["Posts", posts.length],
          ["Hidden", posts.filter(p => p.hidden).length],
          ["Comments", comments.length],
        ].map(([k, v]) => (
          <div key={k as string} className="brutal-card p-4">
            <div className="mono text-xs uppercase">{k}</div>
            <div className="display text-4xl">{v}</div>
          </div>
        ))}
      </div>

      <div className="brutal-card p-0 overflow-hidden">
        <table className="w-full text-left mono text-sm">
          <thead className="bg-ink text-paper">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Tool</th>
              <th className="p-3">Status</th>
              <th className="p-3">Age</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className={`border-t-2 border-ink ${p.hidden ? "opacity-40" : ""}`}>
                <td className="p-3 max-w-xs truncate">{p.title}</td>
                <td className="p-3">{p.tool}</td>
                <td className="p-3 uppercase">{p.status}</td>
                <td className="p-3 text-muted-foreground">{timeAgo(p.createdAt)}</td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => toggleHidden(p.id)} className="brutal-btn-ghost text-[10px]">
                    {p.hidden ? "Unhide" : "Hide"}
                  </button>
                  {confirm === p.id ? (
                    <button onClick={() => { deletePost(p.id); setConfirm(null); }} className="brutal-btn text-[10px] bg-hot">
                      Confirm delete
                    </button>
                  ) : (
                    <button onClick={() => setConfirm(p.id)} className="brutal-btn-ghost text-[10px]">Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
