import { Link, useRouter } from "@tanstack/react-router";
import { useStore, setTheme } from "@/lib/store";
import { Sun, Moon } from "lucide-react";

export function Header() {
  const router = useRouter();
  const { theme } = useStore();
  const currentPath = router.state.location.pathname;
  const isV2 = currentPath === '/feed' || currentPath === '/submit';

  return (
    <header className={isV2 ? "z-40 bg-paper w-full overflow-hidden shrink-0" : "brutal-border border-x-0 border-t-0 bg-paper sticky top-0 z-40"}>
      {!isV2 && (
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <span className="font-bold text-[24px] tracking-tight text-ink dark:text-zinc-50">
              VIBE<span className="bg-ink dark:bg-zinc-50 text-paper dark:text-zinc-950 px-1.5 ml-0.5 pb-0.5 rounded-sm">FAIL</span>
            </span>
          </Link>
          <button
            onClick={() => {
              const nextTheme = theme === "dark" ? "light" : "dark";
              setTheme(nextTheme);
            }}
            className="p-2 bg-ink/5 dark:bg-zinc-900 border border-ink/10 dark:border-zinc-800 rounded-full text-ink dark:text-zinc-250 hover:bg-ink/10 dark:hover:bg-zinc-800 transition-all cursor-pointer flex items-center justify-center gap-1.5 px-3"
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-500" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Dark</span>
              </>
            )}
          </button>
        </div>
      )}
      <div className={isV2 ? "overflow-hidden bg-ink text-paper py-1" : "marquee"}>
        <div className={isV2 ? "flex gap-10 whitespace-nowrap animate-[scroll_40s_linear_infinite] font-sans text-[11px] font-bold uppercase tracking-wider" : "marquee-track"}>
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="flex gap-10">
              <span className="bg-hot px-1.5 py-0.5 rounded-sm">POST THE WORST THING AI DID TO YOUR CODE</span>
              <span>·</span>
              <span>NO LOGINS · NO JUDGMENT · ONLY PAIN</span>
              <span>·</span>
              <span>YOU ARE NOT ALONE</span>
              <span>·</span>
              <span>SHIP IT &amp; CRY</span>
              <span>·</span>
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
