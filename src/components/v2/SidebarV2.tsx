import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { AuthModalV2 } from "./AuthModalV2";
import { Home, Compass, Bell, User, Flame, Activity, Users, Plus } from "lucide-react";
import { useStore, setAuthUser, logout } from "@/lib/store";

export function SidebarV2() {
  const [authOpen, setAuthOpen] = useState(false);
  const { user } = useStore();
  const router = useRouter();

  const navItems = [
    { label: "Home", icon: Home, to: "/v2" },
    { label: "Popular", icon: Flame, to: "/v2?tab=popular" },
    { label: "Following", icon: Users, to: "/v2?tab=following" },
    { label: "Explore", icon: Compass, to: "/v2?tab=explore" },
    { label: "Activity", icon: Activity, to: "/v2?tab=activity" },
  ];

  return (
    <>
      <div className="flex flex-col h-full justify-between py-4 w-full md:w-[240px] ml-auto">
        <div>
          <Link to="/v2" className="flex items-center gap-2 mb-6 w-fit hover:opacity-80 transition-opacity">
            <span className="font-bold text-[28px] tracking-tight">VIBE<span className="bg-ink text-paper px-1.5 ml-0.5 pb-0.5">FAIL</span></span>
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

              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={handleClick}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-ink/10 rounded-full transition-colors w-fit -ml-4"
                >
                  <item.icon className="w-7 h-7 stroke-[1.5px]" />
                  <span className="font-normal text-[19px] hidden md:block">{item.label}</span>
                </Link>
              );
            })}
            
            <div className="w-full mt-4 pr-4">
              <button className="flex items-center justify-center gap-2 w-full py-3.5 bg-hot hover:bg-hot/90 transition-colors rounded-full font-bold text-[17px] text-paper shadow-sm">
                <span className="hidden md:block">Create post</span>
                <Plus className="w-6 h-6 stroke-[2.5px] md:hidden" />
              </button>
            </div>
          </nav>
        </div>

        <div className="mt-8 pr-4">
          {user ? (
            <div className="flex items-center justify-between p-3 -ml-3 cursor-pointer hover:bg-ink/10 rounded-full transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-volt rounded-full flex items-center justify-center font-bold text-ink">
                  {user.username?.[0]?.toUpperCase() || "A"}
                </div>
                <div className="hidden md:block text-left">
                  <div className="font-bold text-[15px] leading-tight">{user.username || "Anonymous"}</div>
                  <div className="text-[15px] text-muted-foreground leading-tight">
                    {user.isGuest ? "Guest Account" : `@${user.username}`}
                  </div>
                </div>
              </div>
              <div 
                className="hidden md:block font-bold hover:text-hot transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  logout();
                }}
              >
                Log Out
              </div>
            </div>
          ) : (
            <div 
              onClick={() => setAuthOpen(true)}
              className="flex items-center justify-between p-3 -ml-3 cursor-pointer hover:bg-ink/5 rounded-full transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-ink/5 border border-ink/10 rounded-full flex items-center justify-center text-ink/60">
                  <User className="w-5 h-5 stroke-[2px]" />
                </div>
                <div className="hidden md:block text-left">
                  <div className="font-bold text-[15px] leading-tight mb-0.5">Login</div>
                  <div className="text-[14px] text-muted-foreground leading-tight">or continue as guest</div>
                </div>
              </div>
              <div className="hidden md:block font-bold text-ink/60">···</div>
            </div>
          )}
        </div>
      </div>

      <AuthModalV2 isOpen={authOpen} onClose={() => setAuthOpen(false)} onLogin={setAuthUser} />
    </>
  );
}
