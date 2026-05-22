import { Link, useRouter } from "@tanstack/react-router";

export function Header() {
  const router = useRouter();
  const currentPath = router.state.location.pathname;
  const isV2 = currentPath === '/' || currentPath === '/submit';
  const isSubmitPage = currentPath === '/submit';

  return (
    <header className={isV2 ? "z-40 bg-paper" : "brutal-border border-x-0 border-t-0 bg-paper sticky top-0 z-40"}>
      {!isV2 && (
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="display text-2xl sm:text-3xl">VIBE<span className="bg-ink text-paper px-1">FAIL</span></span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link to="/" className="mono text-xs uppercase font-bold hover:bg-volt px-2 py-1" activeOptions={{ exact: true }} activeProps={{ className: "bg-volt" }}>Feed</Link>
            <Link to="/admin" className="mono text-xs uppercase font-bold hover:bg-volt px-2 py-1" activeProps={{ className: "bg-volt" }}>Mod</Link>
            <Link to="/submit" className="brutal-btn text-xs sm:text-sm">+ Confess</Link>
          </nav>
        </div>
      )}
      {!isSubmitPage && (
        <div className={isV2 ? "overflow-hidden bg-ink text-paper py-2" : "marquee"}>
          <div className={isV2 ? "flex gap-10 whitespace-nowrap animate-[scroll_40s_linear_infinite] font-sans text-[13px] font-bold uppercase tracking-wider" : "marquee-track"}>
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i} className="flex gap-10">
                <span>POST THE WORST THING AI DID TO YOUR CODE</span>
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
      )}
    </header>
  );
}
