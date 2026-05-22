import { useEffect, useState } from "react";
import { apiCall, getToken, ensureGuestSession } from "@/lib/store";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function MigrationBanner() {
  const [visible, setVisible] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [oldPostsCount, setOldPostsCount] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const migrated = localStorage.getItem("vf_migrated");
    if (migrated === "true") {
      return;
    }

    const rawPosts = localStorage.getItem("vibefail.posts.v1");
    let posts = [];
    try {
      posts = rawPosts ? JSON.parse(rawPosts) : [];
    } catch {
      posts = [];
    }

    if (!Array.isArray(posts) || posts.length === 0) {
      localStorage.setItem("vf_migrated", "true");
      return;
    }

    setOldPostsCount(posts.length);
    setVisible(true);
  }, []);

  const handleImport = async () => {
    if (isImporting) return;
    setIsImporting(true);

    try {
      const rawPosts = localStorage.getItem("vibefail.posts.v1");
      const posts = rawPosts ? JSON.parse(rawPosts) : [];
      const postsToMigrate = posts.slice(0, 20); // max 20
      const total = postsToMigrate.length;

      for (let i = 0; i < total; i++) {
        setProgress(`IMPORTING UR SHAME... (${i + 1}/${total})`);
        const oldPost = postsToMigrate[i];
        
        // map potential missing values
        let tool = oldPost.tool || "other";
        if (tool === "v0") tool = "other";
        const tools = ["cursor", "chatgpt", "claude", "copilot", "gemini", "other"];
        if (!tools.includes(tool)) {
          tool = "other";
        }

        await ensureGuestSession();
        const token = getToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch(`${API_URL}/api/posts`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            title: oldPost.title || "confession from local storage",
            body: oldPost.body || "no body provided in the local history.",
            tool: tool,
            vibe: oldPost.vibe || undefined,
            verdict: oldPost.verdict || "still_broken",
            plea: oldPost.plea || undefined,
            aiDefense: oldPost.aiDefense || undefined,
            memeUrl: oldPost.memeUrl || undefined,
          }),
        });
        await res.json();
      }

      setProgress("★ done. ur fails are now public. cope.");
      localStorage.setItem("vf_migrated", "true");
      
      setTimeout(() => {
        setVisible(false);
      }, 3000);
    } catch (err) {
      console.error("Migration failed:", err);
      setProgress("migration went through it. try again.");
      setIsImporting(false);
    }
  };

  const handleForget = () => {
    localStorage.setItem("vf_migrated", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="w-full bg-ink text-volt py-2.5 px-4 flex flex-wrap items-center justify-between gap-4 border-b-2 border-ink z-50 text-xs sm:text-sm font-mono tracking-tight select-none">
      <div className="flex items-center gap-2">
        <span>
          {isImporting
            ? progress
            : `★ you have ${oldPostsCount} confessions saved in this browser only. import them so the world can witness?`}
        </span>
      </div>
      {!isImporting && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleImport}
            className="bg-hot text-paper border-2 border-ink font-bold px-3 py-1 text-xs uppercase hover:-translate-y-0.5 active:translate-y-0.5 transition-transform cursor-pointer shadow-[2px_2px_0_0_#000]"
          >
            [★ IMPORT MY SHAME]
          </button>
          <button
            onClick={handleForget}
            className="text-volt/70 hover:text-volt underline text-xs cursor-pointer"
          >
            [nah forget it]
          </button>
        </div>
      )}
    </div>
  );
}
