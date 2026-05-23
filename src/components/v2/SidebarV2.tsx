import { Link, useRouter, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { AuthModalV2 } from "./AuthModalV2";
import { Home, TrendingUp, BookOpen, Compass, Bell, User, Plus, LogOut, Sun, Moon, Monitor } from "lucide-react";
import { useStore, setAuthUser, logout, setFeedTab, setTheme, getAvatarUrl } from "@/lib/store";

export function SidebarV2() {
  const [authOpen, setAuthOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { user, theme } = useStore();
  const router = useRouter();
  const search = useSearch({ strict: false }) as any;
  const activeTab = search.tab || "for-you";

  const navItems = [
    { label: "Home", icon: Home, to: "/", search: {} },
    { label: "Popular", icon: TrendingUp, to: "/", search: { tab: "popular" } },
    { label: "Following", icon: BookOpen, to: "/", search: { tab: "followers" } },
    { label: "Explore", icon: Compass, to: "/", search: { tab: "explore" } },
    { label: "Activity", icon: Bell, to: "/", search: { tab: "activity" } },
  ];

  return (
    <>
      <div className="flex flex-col h-full justify-between pt-4 pb-8 w-full px-2 md:px-4">
        <div>
          <Link to="/" className="flex items-center mb-6 w-fit hover:opacity-80 transition-opacity">
            <span className="font-bold text-[24px] tracking-tight text-ink dark:text-zinc-50">
              VIBE<span className="bg-ink dark:bg-zinc-50 text-paper dark:text-zinc-950 px-1.5 ml-0.5 pb-0.5 rounded-sm">FAIL</span>
            </span>
          </Link>

          <nav className="flex flex-col items-start space-y-1">
            {navItems.map((item) => {
              const requiresAuth = item.label === "Following";
              const isGuest = user?.isGuest;
              const isLoggedOut = !user;

              const handleClick = (e: any) => {
                if (requiresAuth && (isGuest || isLoggedOut)) {
                  e.preventDefault();
                  setAuthOpen(true);
                }
              };

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
                  onClick={handleClick}
                  className={`group flex items-center gap-4 px-4 py-3 hover:bg-hot/10 dark:hover:bg-hot/10 rounded-full transition-all w-[220px] -ml-4 ${
                    isActive 
                      ? "font-bold text-hot dark:text-hot" 
                      : "font-normal text-ink dark:text-zinc-200"
                  }`}
                >
                  <item.icon className={`w-7 h-7 group-hover:text-hot transition-colors ${isActive ? "stroke-[2.5px] text-hot" : "text-ink dark:text-zinc-200 stroke-[1.5px]"}`} />
                  <span className={`text-[19px] hidden md:block group-hover:text-hot transition-colors ${isActive ? "font-bold text-hot" : "text-ink dark:text-zinc-200 font-normal"}`}>{item.label}</span>
                </Link>
              );
            })}
            
            <div className="w-full mt-4">
              <Link 
                to="/submit"
                className="flex items-center justify-center gap-2 w-[85%] py-2.5 bg-hot hover:bg-hot/90 transition-colors rounded-full font-bold text-[15px] text-paper shadow-sm cursor-pointer"
              >
                <span className="hidden md:block">Confess</span>
                <Plus className="w-5 h-5 stroke-[2.5px] md:hidden" />
              </Link>
            </div>
          </nav>
        </div>

        <div className="mt-auto pt-3 border-t border-ink/5 dark:border-zinc-800/80 relative">
          {profileMenuOpen && (
            <>
              {/* Invisible Click-Outside Backdrop */}
              <div 
                className="fixed inset-0 z-40 cursor-default" 
                onClick={() => setProfileMenuOpen(false)}
              />
              
              {/* Floating Profile Popover */}
              <div className="absolute bottom-16 left-0 w-60 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                {/* Theme Selector - Top Position */}
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

                {user && !user.isGuest ? (
                  <>
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setFeedTab("my-posts");
                        router.navigate({ to: "/" });
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-left text-[14px] font-semibold transition-colors text-ink dark:text-zinc-200"
                    >
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>My Fails</span>
                    </button>
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

          {user ? (
            <div 
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-ink/5 dark:hover:bg-zinc-800 rounded-2xl transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <img 
                  src={getAvatarUrl(user.displayName || user.username)} 
                  alt="avatar" 
                  className="w-10 h-10 bg-ink/5 dark:bg-zinc-900 rounded-full border border-ink/10 dark:border-zinc-800 shrink-0" 
                />
                <div className="hidden md:block text-left min-w-0 flex-1">
                  <div className="font-bold text-[14px] leading-tight text-ink dark:text-zinc-200 whitespace-nowrap">{user.isGuest ? "Guest" : (user.displayName || user.username || "Anonymous")}</div>
                  <div className="text-[13px] text-muted-foreground leading-tight whitespace-nowrap">
                    {user.isGuest ? (
                      <span className="text-hot hover:opacity-80 transition-opacity font-semibold">Login</span>
                    ) : (
                      `@${user.displayName || user.username}`
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-ink/5 dark:hover:bg-zinc-800 rounded-2xl transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 bg-ink/5 dark:bg-zinc-900 border border-ink/10 dark:border-zinc-800 rounded-full flex items-center justify-center text-ink/60 dark:text-zinc-400 shrink-0">
                  <User className="w-5 h-5 stroke-[2px]" />
                </div>
                <div className="hidden md:block text-left min-w-0 flex-1">
                  <div className="font-bold text-[14px] leading-tight mb-0.5 text-ink dark:text-zinc-200 whitespace-nowrap">Login</div>
                  <div className="text-[13px] text-muted-foreground leading-tight whitespace-nowrap">or continue as guest</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AuthModalV2 isOpen={authOpen} onClose={() => setAuthOpen(false)} onLogin={setAuthUser} />
    </>
  );
}
