import { createFileRoute, Link, useRouter, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SidebarV2 } from "@/components/v2/SidebarV2";
import { FeedV2 } from "@/components/v2/FeedV2";
import { useStore, setAuthUser, getAvatarUrl, logout, setTheme, setFeedTab } from "@/lib/store";
import { AuthModalV2 } from "@/components/v2/AuthModalV2";
import { Home, TrendingUp, BookOpen, Compass, Bell, User, LogOut, Sun, Moon, Monitor, Bookmark } from "lucide-react";

type FeedSearchParams = {
  tab?: string;
  compose?: string;
  post?: string;
};

export const Route = createFileRoute("/feed")({
  validateSearch: (search: Record<string, unknown>): FeedSearchParams => {
    return {
      tab: search.tab as string | undefined,
      compose: search.compose as string | undefined,
      post: search.post as string | undefined,
    };
  },
  component: V2Layout,
  head: () => ({
    meta: [
      { title: "Feed — VibeFail" },
      { name: "description", content: "Anonymous wall of AI-coding disasters. Confess. React. Survive." },
    ],
  }),
});

function V2Layout() {
  const [authOpen, setAuthOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { posts, user, theme } = useStore();
  const search = useSearch({ from: "/feed" }) as any;
  const activeTab = search.tab || "for-you";
  const router = useRouter();

  useEffect(() => {
    document.body.classList.add("v2-body");
    return () => {
      document.body.classList.remove("v2-body");
    };
  }, []);

  const navItems = [
    { label: "Home", icon: Home, to: "/feed", search: {} },
    { label: "Popular", icon: TrendingUp, to: "/feed", search: { tab: "popular" } },
    { label: "Following", icon: BookOpen, to: "/feed", search: { tab: "followers" } },
    { label: "Explore", icon: Compass, to: "/feed", search: { tab: "explore" } },
    { label: "Activity", icon: Bell, to: "/feed", search: { tab: "activity" } },
  ];

  const handleMobileNavClick = (item: any, e: any) => {
    const requiresAuth = item.label === "Following";
    const isGuest = user?.isGuest;
    const isLoggedOut = !user;
    if (requiresAuth && (isGuest || isLoggedOut)) {
      e.preventDefault();
      setAuthOpen(true);
    }
  };

  // Sort posts by popularity (overall reactions sum)
  const popularConfessions = [...posts]
    .filter((p) => !p.hidden)
    .sort((a, b) => {
      const sumA = (Object.values(a.reactions || {}) as number[]).reduce((sum, v) => sum + v, 0);
      const sumB = (Object.values(b.reactions || {}) as number[]).reduce((sum, v) => sum + v, 0);
      return sumB - sumA;
    })
    .slice(0, 4);

  return (
    <div className="h-full w-full bg-paper text-ink dark:text-zinc-50 selection:bg-hot/20 font-sans flex flex-col items-center justify-start overflow-hidden relative">
      
      {/* Mobile Top Header */}
      <header className="w-full md:hidden h-14 border-b border-ink/10 flex items-center justify-between px-4 bg-paper shrink-0 z-30 relative">
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
          <span className="font-bold text-[20px] tracking-tight text-ink dark:text-zinc-50">
            VIBE<span className="bg-ink dark:bg-zinc-50 text-paper dark:text-zinc-950 px-1 ml-0.5 pb-0.5 rounded-sm">FAIL</span>
          </span>
        </Link>
        {/* Right side controls: Confess button + Profile/Menu trigger */}
        <div className="flex items-center gap-3.5">
          <Link 
            to="/submit"
            className="px-3.5 py-1.5 bg-hot hover:bg-hot/90 text-paper text-xs font-extrabold rounded-full transition-all uppercase tracking-wider shrink-0 shadow-sm"
          >
            + Confess
          </Link>
          
          <div className="relative">
          {user ? (
            <img 
              src={getAvatarUrl(user.username)} 
              alt="avatar" 
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="w-8 h-8 bg-ink/5 dark:bg-zinc-900 rounded-full border border-ink/10 dark:border-zinc-800 cursor-pointer object-cover" 
            />
          ) : (
            <button 
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="w-8 h-8 bg-ink/5 dark:bg-zinc-900 border border-ink/10 dark:border-zinc-800 rounded-full flex items-center justify-center text-ink/60 dark:text-zinc-400 cursor-pointer"
            >
              <User className="w-4 h-4 stroke-[2px]" />
            </button>
          )}

          {profileMenuOpen && (
            <>
              {/* Invisible Click-Outside Backdrop */}
              <div 
                className="fixed inset-0 z-40 cursor-default" 
                onClick={() => setProfileMenuOpen(false)}
              />
              
              {/* Floating Profile Popover */}
              <div className="absolute right-0 top-10 w-60 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                {/* Theme Selector */}
                <div className="px-1 py-1">
                  <div className="text-[10px] text-muted-foreground dark:text-zinc-500 font-extrabold mb-2 uppercase tracking-widest">Theme</div>
                  <div className="grid grid-cols-3 gap-1 bg-zinc-50 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800">
                    {[
                      { key: "light", label: "Light", icon: Sun },
                      { key: "dark", label: "Dark", icon: Moon },
                      { key: "system", label: "System", icon: Monitor },
                    ].map((t) => {
                      const Icon = t.icon;
                      const isActive = theme === t.key;
                      return (
                        <button
                          key={t.key}
                          onClick={() => setTheme(t.key as any)}
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all gap-1 cursor-pointer ${
                            isActive
                              ? "bg-white dark:bg-zinc-800 text-hot dark:text-zinc-50 shadow-sm border border-zinc-200/40 dark:border-zinc-700/50"
                              : "text-muted-foreground hover:text-ink dark:hover:text-zinc-200"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-[9px] font-bold tracking-wide uppercase">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-zinc-100 dark:border-zinc-900 my-2" />

                {user ? (
                  <>
                    <div className="px-3 py-1.5 mb-1.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-200/20 dark:border-zinc-800/40">
                      <div className="font-bold text-[13px] text-ink dark:text-zinc-200 truncate">{user.isGuest ? "Guest" : user.username}</div>
                      <div className="text-[11px] text-muted-foreground truncate">@{user.username}</div>
                    </div>
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setFeedTab("my-posts");
                        router.navigate({ to: "/feed", search: { tab: "my-posts" } as any });
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-left text-[14px] font-semibold transition-colors text-ink dark:text-zinc-200"
                    >
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>My Fails</span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setFeedTab("saved-posts" as any);
                        router.navigate({ to: "/feed", search: { tab: "saved-posts" } as any });
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-left text-[14px] font-semibold transition-colors text-ink dark:text-zinc-200"
                    >
                      <Bookmark className="w-4 h-4 text-muted-foreground" />
                      <span>Saved Fails</span>
                    </button>
                    {user.isGuest && (
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setAuthOpen(true);
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-left text-[14px] font-semibold transition-colors text-ink dark:text-zinc-200"
                      >
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>Log In / Sign Up</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setAuthOpen(true);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-left text-[14px] font-semibold transition-colors text-ink dark:text-zinc-200"
                    >
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>Log In / Sign Up</span>
                    </button>
                  </>
                )}

                {user && !user.isGuest && (
                  <>
                    <div className="border-t border-zinc-100 dark:border-zinc-900 my-2" />
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        logout();
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-left text-[14px] font-bold transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>

      <div className="w-full max-w-[1440px] flex flex-1 flex-row min-h-0 overflow-hidden justify-center">
        {/* Left Sidebar - Desktop (hidden on mobile) */}
        <aside className="hidden md:flex w-[360px] h-full flex-col bg-paper shrink-0 border-r border-ink/10">
          <SidebarV2 />
        </aside>

        {/* Main Feed Column */}
        <main className="flex-1 w-full max-w-[850px] border-r border-ink/10 h-full overflow-y-auto pb-20 md:pb-0">
          <FeedV2 />
        </main>
        
        {/* Right Column for large screens */}
        <aside className="hidden lg:block w-[365px] shrink-0 h-full overflow-y-auto p-6 pl-8">
          {(!user || user.isGuest) && (
            <div className="bg-white dark:bg-zinc-950 border border-ink/5 dark:border-zinc-800/80 rounded-2xl p-6 text-center mb-8 shadow-sm">
              <div className="mb-4 flex justify-center select-none">
                <span className="font-bold text-[22px] tracking-tight text-ink dark:text-zinc-50">
                  VIBE<span className="bg-ink dark:bg-zinc-50 text-paper dark:text-zinc-950 px-1.5 ml-0.5 pb-0.5 rounded-sm">FAIL</span>
                </span>
              </div>
              <p className="font-extrabold text-[17px] mb-2 text-ink dark:text-zinc-50 leading-tight">Log in or sign up</p>
              <p className="text-muted-foreground text-xs leading-relaxed mb-5">
                Join the most chaotic and hilarious developer community. Share receipts, read code disasters, and feel less alone.
              </p>
              <Link 
                to="/submit"
                className="block w-full py-2 bg-hot hover:bg-hot/90 text-paper font-bold text-xs rounded-full transition-colors mb-2.5 shadow-sm uppercase tracking-wider text-center cursor-pointer"
              >
                Start Confessing
              </Link>
              <button 
                onClick={() => setAuthOpen(true)}
                className="w-full py-2 bg-ink dark:bg-zinc-800 text-paper dark:text-zinc-100 hover:opacity-90 font-bold text-xs rounded-full transition-colors border border-ink/10 uppercase tracking-wider"
              >
                Sign In
              </button>
            </div>
          )}

          <div className="p-1">
            <h3 className="font-bold text-[12px] mb-4 text-muted-foreground uppercase tracking-widest border-b border-ink/5 dark:border-zinc-800/80 pb-2">Popular Confessions</h3>
            <div className="space-y-5">
              {popularConfessions.map((post) => {
                const totalReactions = Object.values(post.reactions || {}).reduce((a, b) => a + b, 0);
                return (
                  <Link 
                    key={post.id} 
                    to="/feed" 
                    search={{ post: post.id }} 
                    className="group block text-left"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="text-hot">@{post.author}</span>
                        <span>·</span>
                        <span>{post.tool}</span>
                      </div>
                      
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <p className="font-bold text-[14px] text-ink dark:text-zinc-100 group-hover:text-hot leading-snug line-clamp-2 transition-colors">
                            {post.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                            <span>🔥 {totalReactions} reactions</span>
                            <span>·</span>
                            <span className="capitalize">{post.status}</span>
                          </div>
                        </div>
                        
                        <img 
                          src={getAvatarUrl(post.author)} 
                          alt={post.author} 
                          className="w-10 h-10 bg-ink/5 dark:bg-zinc-800 rounded-lg border border-ink/5 dark:border-zinc-800 shrink-0 object-cover"
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-paper/95 backdrop-blur-md border-t border-ink/10 flex items-center justify-around z-30 px-2 shadow-lg">
        {navItems.map((item) => {
          const isActive = 
            (item.label === "Home" && (activeTab === "for-you" || !search.tab)) ||
            (item.label === "Popular" && activeTab === "popular") ||
            (item.label === "Following" && activeTab === "followers") ||
            (item.label === "Explore" && activeTab === "explore") ||
            (item.label === "Activity" && activeTab === "activity");

          return (
            <Link
              key={item.label}
              to={item.to}
              search={item.search as any}
              onClick={(e) => handleMobileNavClick(item, e)}
              className="flex flex-col items-center justify-center flex-1 py-1 text-ink dark:text-zinc-200 cursor-pointer"
            >
              <item.icon className={`w-5.5 h-5.5 transition-all ${isActive ? "stroke-[2.5px] text-hot scale-110" : "stroke-[1.5px] text-muted-foreground"}`} />
              <span className={`text-[10px] mt-0.5 transition-all ${isActive ? "font-bold text-hot" : "font-medium text-muted-foreground"}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <AuthModalV2 isOpen={authOpen} onClose={() => setAuthOpen(false)} onLogin={setAuthUser} />
    </div>
  );
}
