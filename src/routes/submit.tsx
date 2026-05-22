import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createPost, TOOLS } from "@/lib/store";

export const Route = createFileRoute("/submit")({
  component: Submit,
  head: () => ({ meta: [{ title: "Confess a fail — VibeFail" }] }),
});

function Submit() {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tool, setTool] = useState(TOOLS[0]);
  const [language, setLanguage] = useState("TypeScript");
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const b = body.trim();
    if (t.length < 10 || t.length > 140) return setErr("Title: 10–140 characters.");
    if (b.length < 20 || b.length > 2000) return setErr("Story: 20–2000 characters.");
    const post = await createPost({ title: t, body: b, tool, language: language.trim().slice(0, 40) || "Other" });
    nav({ to: "/post/$id", params: { id: post.id } });
  };

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-10 pb-20">
      <p className="mono text-xs uppercase mb-2 inline-block bg-volt px-2 py-1 brutal-border">Step into the booth</p>
      <h1 className="display text-5xl sm:text-6xl mb-4">Confess.</h1>
      <p className="mono text-sm text-ink/80 mb-8">
        No login. No name. We assign you a handle and forget you ever existed.
      </p>

      <form onSubmit={submit} className="brutal-card p-6 sm:p-8 space-y-5">
        <div>
          <label className="mono text-xs uppercase font-bold block mb-2">Headline</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            placeholder='e.g. "Cursor deleted my .env then committed it"'
            className="w-full brutal-border bg-paper px-3 py-3 text-lg display"
          />
          <p className="mono text-[10px] text-right text-muted-foreground">{title.length}/140</p>
        </div>

        <div>
          <label className="mono text-xs uppercase font-bold block mb-2">The crime scene</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={8}
            placeholder="What did the AI do. What did you ask for. How bad was the blast radius."
            className="w-full brutal-border bg-paper px-3 py-3 mono text-sm"
          />
          <p className="mono text-[10px] text-right text-muted-foreground">{body.length}/2000</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mono text-xs uppercase font-bold block mb-2">Suspect</label>
            <select value={tool} onChange={(e) => setTool(e.target.value)}
              className="w-full brutal-border bg-paper px-3 py-3 mono font-bold uppercase">
              {TOOLS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="mono text-xs uppercase font-bold block mb-2">Language / Stack</label>
            <input value={language} onChange={(e) => setLanguage(e.target.value)} maxLength={40}
              className="w-full brutal-border bg-paper px-3 py-3 mono uppercase font-bold" />
          </div>
        </div>

        {err && <p className="mono text-sm text-paper bg-hot p-2 brutal-border">{err}</p>}

        <div className="flex items-center justify-between border-t-2 border-ink pt-4">
          <p className="mono text-xs text-muted-foreground">By posting you agree it's true-ish.</p>
          <button type="submit" className="brutal-btn">Post the wreckage →</button>
        </div>
      </form>
    </main>
  );
}
