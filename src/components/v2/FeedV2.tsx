import { useStore, setFeedTab, getAvatarUrl, toggleReaction, hasReacted, REACTION_META, type Reaction, setStatus, addComment, toggleLikeComment, hasLikedComment, toggleSavePost, isPostSaved, updatePost, deletePost, deleteComment, reportContent } from "@/lib/store";
import { timeAgo } from "@/lib/store";
import { useRouter, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, Sparkles, Bell, Award, Heart, MessageSquare, AlertCircle, CheckCircle2, Flame, Settings, Bookmark, MoreHorizontal, Flag, Trash2, Edit2, X } from "lucide-react";
import { SuspectPicker } from "@/components/confess/SuspectPicker";
import { VibePicker, VerdictPicker, PleaPicker } from "@/components/confess/FlairsPickers";
import { AIDefenseInput } from "@/components/confess/AIDefenseInput";
import { CrimeSceneTextarea } from "@/components/confess/CrimeSceneTextarea";

export function FeedV2() {
  const { posts, comments, user } = useStore();
  const router = useRouter();
  
  // Parse search query parameters reactively
  const search = useSearch({ from: "/" }) as any;
  const activeTab = search.tab || "for-you";

  // State for Explore tab
  const [searchQuery, setSearchQuery] = useState("");
  const [exploreSubTab, setExploreSubTab] = useState("for-you");
  const [followedAccounts, setFollowedAccounts] = useState<string[]>(["@vibecoder_9000"]);
  const [followingSubTab, setFollowingSubTab] = useState<"following" | "followers">("following");
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveLightboxImg(null);
      }
    };
    if (activeLightboxImg) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeLightboxImg]);

  // Mock Notification logs for the Activity tab
  const mockActivities = [
    {
      id: 1,
      type: "reaction",
      user: "anon-22aa",
      action: "reacted 🔥 to your confession",
      target: "Asked Gemini to add a loading spinner...",
      time: "3h ago",
      icon: FlameIcon,
    },
    {
      id: 2,
      type: "trending",
      user: "System",
      action: "Your confession is trending in Popular",
      target: "Claude rewrote my entire auth flow...",
      time: "5h ago",
      icon: Sparkles,
    },
    {
      id: 3,
      type: "status",
      user: "anon-ox91",
      action: "marked their confession as",
      target: "Claude rewrote my entire auth flow...",
      time: "1d ago",
      suffix: "SOLVED",
      icon: CheckCircle2,
    },
    {
      id: 4,
      type: "follow",
      user: "SeniorLlama",
      action: "started following you",
      target: "",
      time: "2d ago",
      icon: Heart,
    },
  ];

  // Famous mock follow suggestions for the Explore view
  const mockFollowSuggestions = [
    {
      name: "Hardcoded_ProdCrash_6982",
      handle: "@Hardcoded_ProdCrash_6982",
      bio: "React dev who let Gemini refactor my state engine. 400 lines of hallucinated packages. It still hurts.",
    },
    {
      name: "VibeCoder_9000",
      handle: "@vibecoder_9000",
      bio: "I don't write code, I just review what Claude writes. 10x velocity, 100x bug density. Shipped to prod anyway.",
    },
    {
      name: "gpt_hallucinations_guru",
      handle: "@gpt_guru",
      bio: "Proud author of react-zen-forms@2.4.1 (doesn't exist, hallucinated entirely).",
    }
  ];

  // Mock list of followers who follow the logged-in user
  const mockFollowersList = [
    {
      name: "SeniorLlama",
      handle: "@SeniorLlama",
      bio: "Self-improving AI researcher. I run local LLMs that compile Rust code.",
    },
    {
      name: "anon-aa11",
      handle: "@anon-aa11",
      bio: "Full stack developer. Spent 4 hours debugging a CORS error only to realize the server was offline.",
    },
    {
      name: "Hardcoded_ProdCrash_6982",
      handle: "@Hardcoded_ProdCrash_6982",
      bio: "React dev who let Gemini refactor my state engine. 400 lines of hallucinated packages.",
    }
  ];

  // Filter posts based on activeTab
  const visible = posts
    .filter((p) => {
      if (p.hidden) return false;
      
      if (activeTab === "following") {
        return followedAccounts.some(
          handle => handle.toLowerCase() === `@${p.author.toLowerCase()}`
        );
      }
      
      if (activeTab === "my-posts") {
        return user && (
          (p.authorSessionId && p.authorSessionId === user.id) ||
          (user.displayName && p.author === user.displayName) ||
          (user.username && p.author === user.username)
        );
      }

      if (activeTab === "popular") {
        return true; 
      }
      
      return true;
    })
    .sort((a, b) => {
      if (activeTab === "popular" || activeTab === "for-you") {
        const sa = (Object.values(a.reactions) as number[]).reduce((x, y) => x + y, 0);
        const sb = (Object.values(b.reactions) as number[]).reduce((x, y) => x + y, 0);
        if (activeTab === "popular") {
          return sb - sa;
        }
      }
      return b.createdAt - a.createdAt; 
    });

  // Filter explore posts by search query (keyword OR username) or exploreSubTab curations
  const explorePosts = posts
    .filter((p) => {
      if (p.hidden) return false;

      // Filter by search query if user is actively searching
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesKeyword = p.title.toLowerCase().includes(query) || p.body.toLowerCase().includes(query);
        const matchesUsername = p.author.toLowerCase().includes(query) || `@${p.author.toLowerCase()}`.includes(query);
        return matchesKeyword || matchesUsername;
      }

      // Filter by horizontal sub-tabs category selections
      if (exploreSubTab === "claude") return p.tool.toLowerCase() === "claude";
      if (exploreSubTab === "chatgpt") return p.tool.toLowerCase() === "chatgpt";
      if (exploreSubTab === "gemini") return p.tool.toLowerCase() === "gemini" || p.tool.toLowerCase() === "copilot";

      return true;
    })
    .sort((a, b) => {
      if (exploreSubTab === "trending" && !searchQuery.trim()) {
        const sa = (Object.values(a.reactions) as number[]).reduce((x, y) => x + y, 0);
        const sb = (Object.values(b.reactions) as number[]).reduce((x, y) => x + y, 0);
        return sb - sa;
      }
      return b.createdAt - a.createdAt;
    });

  const subTabs = [
    { id: "for-you", label: "For You" },
    { id: "trending", label: "Trending" },
    { id: "claude", label: "Claude Fails" },
    { id: "chatgpt", label: "GPT Fails" },
    { id: "gemini", label: "Gemini Fails" }
  ];

  return (
    <div className="flex flex-col h-full bg-paper">
      
      {/* EXPLORE STICKY HEADER AND TABS LIKE X */}
      {activeTab === "explore" ? (
        <div className="sticky top-0 bg-paper/95 backdrop-blur-md z-10 border-b border-ink/10 flex flex-col w-full">
          {/* Top Search bar row */}
          <div className="flex items-center gap-4 px-5 pt-3.5 pb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search keywords or usernames..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-900 border border-transparent rounded-full text-[14px] text-ink dark:text-zinc-100 placeholder-muted-foreground focus:outline-none focus:bg-paper dark:focus:bg-zinc-950 focus:border-hot dark:focus:border-hot transition-all shadow-sm"
              />
            </div>
            <button className="text-ink dark:text-zinc-300 hover:bg-ink/5 dark:hover:bg-zinc-900 p-2 rounded-full transition-colors cursor-pointer shrink-0">
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Sub-tabs row */}
          <div className="flex overflow-x-auto scrollbar-none w-full bg-paper">
            {subTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setExploreSubTab(tab.id)}
                className={`flex-1 min-w-[90px] text-center py-3.5 font-bold text-[14px] hover:bg-hot/5 hover:text-hot dark:hover:bg-hot/10 dark:hover:text-hot transition-colors relative whitespace-nowrap ${
                  exploreSubTab === tab.id ? "text-hot dark:text-hot font-extrabold" : "text-muted-foreground font-semibold"
                }`}
              >
                {tab.label}
                {exploreSubTab === tab.id && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-hot rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      ) : activeTab === "activity" ? (
        <div className="sticky top-0 bg-paper/80 backdrop-blur-md z-10 border-b border-ink/10 py-4 px-6 flex items-center justify-between">
          <h2 className="text-[19px] font-bold tracking-tight text-ink dark:text-zinc-50 capitalize">{activeTab}</h2>
          <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 py-0.5 rounded-full">
            Notifications
          </span>
        </div>
      ) : (
        <div className="sticky top-0 bg-paper/80 backdrop-blur-md z-10 border-b border-ink/10 flex w-full">
          <button 
            onClick={() => router.navigate({ to: "/", search: {} as any })}
            className={`flex-1 py-4 font-bold text-[15px] hover:bg-hot/5 hover:text-hot transition-colors relative
              ${(activeTab === "for-you" || !search.tab) ? "text-hot font-bold" : "text-muted-foreground font-medium"}`}
          >
            For you
            {(activeTab === "for-you" || !search.tab) && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-hot rounded-t-full" />}
          </button>
          <button 
            onClick={() => router.navigate({ to: "/", search: { tab: "following" } as any })}
            className={`flex-1 py-4 font-bold text-[15px] hover:bg-hot/5 hover:text-hot transition-colors relative
              ${activeTab === "following" ? "text-hot font-bold" : "text-muted-foreground font-medium"}`}
          >
            Following
            {activeTab === "following" && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-hot rounded-t-full" />}
          </button>
          
          {user && !user.isGuest && (
            <button 
              onClick={() => router.navigate({ to: "/", search: { tab: "my-posts" } as any })}
              className={`flex-1 py-4 font-bold text-[15px] hover:bg-hot/5 hover:text-hot transition-colors relative
                ${activeTab === "my-posts" ? "text-hot font-bold" : "text-muted-foreground font-medium"}`}
            >
              My Fails
              {activeTab === "my-posts" && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-hot rounded-t-full" />}
            </button>
          )}
        </div>
      )}

      {/* Main Column Feed Area */}
      <div className="flex-1 flex flex-col">
        
        {/* EXPLORE PAGE: WHO TO FOLLOW (Only shown when explore is active) */}
        {activeTab === "explore" && (
          <>
            {/* Who to Follow list */}
            <div className="p-5 border-b border-ink/10">
              <h3 className="font-extrabold text-[19px] mb-4 text-ink dark:text-zinc-50">Who to follow</h3>
              <div className="space-y-4">
                {mockFollowSuggestions.map((acc) => {
                  const isFollowed = followedAccounts.includes(acc.handle);
                  return (
                    <div key={acc.handle} className="flex items-start justify-between gap-3 text-left">
                      <div className="flex items-start gap-3 min-w-0">
                        <img 
                          src={getAvatarUrl(acc.name)} 
                          alt="avatar" 
                          className="w-10 h-10 bg-ink/5 dark:bg-zinc-900 rounded-full border border-ink/5 dark:border-zinc-800 shrink-0 object-cover" 
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-extrabold text-[14px] text-ink dark:text-zinc-100 hover:text-hot transition-colors flex items-center gap-0.5 leading-snug">
                              {acc.name}
                            </span>
                          </div>
                          <span className="text-[13px] text-muted-foreground block -mt-0.5 leading-tight">{acc.handle}</span>
                          <p className="text-[13px] text-ink/80 dark:text-zinc-300 mt-1 leading-normal font-normal">{acc.bio}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          if (isFollowed) {
                            setFollowedAccounts(followedAccounts.filter(h => h !== acc.handle));
                          } else {
                            setFollowedAccounts([...followedAccounts, acc.handle]);
                          }
                        }}
                        className={`px-4 py-1.5 rounded-full text-[12px] font-extrabold transition-all shrink-0 shadow-sm uppercase tracking-wider ${
                          isFollowed 
                            ? "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-ink dark:text-zinc-200 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600" 
                            : "bg-ink dark:bg-zinc-100 hover:opacity-90 text-paper dark:text-zinc-950"
                        }`}
                      >
                        {isFollowed ? "Following" : "Follow"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* explore Posts Feed Title */}
            <div className="px-5 py-4 border-b border-ink/5 dark:border-zinc-900 bg-zinc-50/40 dark:bg-zinc-950/20 text-left">
              <h3 className="font-extrabold text-[17px] text-ink dark:text-zinc-100">
                {searchQuery.trim() ? "Search Results" : exploreSubTab === "trending" ? "Trending Confessions" : "Confessions For You"}
              </h3>
            </div>
            
            {/* explore Posts Feed Items */}
            <div className="flex-1">
              {explorePosts.map((p) => <PostCard key={p.id} post={p} comments={comments} onImageClick={setActiveLightboxImg} />)}
              {explorePosts.length === 0 && (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-muted-foreground/60 mb-2" />
                  <h3 className="text-md font-bold text-ink dark:text-zinc-100 mb-1">No confessions found</h3>
                  <p className="text-xs max-w-xs">No code disasters matched "{searchQuery}" or selected category filter. Try searching for something else!</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ACTIVITY VIEW */}
        {activeTab === "activity" && (
          <div className="flex-1 divide-y divide-zinc-100 dark:divide-zinc-900">
            {mockActivities.map((act) => {
              const Icon = act.icon;
              return (
                <div key={act.id} className="p-5 flex items-start gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                  <div className={`p-2.5 rounded-full shrink-0 ${
                    act.type === "reaction" ? "bg-amber-50 dark:bg-amber-950/20 text-amber-500" :
                    act.type === "trending" ? "bg-orange-50 dark:bg-orange-950/20 text-orange-500" :
                    act.type === "status" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400" :
                    "bg-rose-50 dark:bg-rose-950/20 text-rose-500"
                  }`}>
                    <Icon className="w-5 h-5 stroke-[2px]" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-[14px] leading-snug">
                      <span className="font-extrabold text-ink dark:text-zinc-100 mr-1 hover:text-hot transition-colors cursor-pointer">@{act.user}</span>
                      <span className="text-ink/80 dark:text-zinc-300 font-normal">{act.action}</span>
                      {act.suffix && (
                        <span className="ml-1.5 text-[10px] tracking-wider uppercase font-extrabold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700/60">{act.suffix}</span>
                      )}
                    </div>
                    {act.target && (
                      <p className="mt-1 text-[13px] text-muted-foreground truncate italic">"{act.target}"</p>
                    )}
                    <span className="mt-1.5 block text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{act.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* REGULAR FEED TAB VIEWS (Home, Popular, Following, My Fails) */}
        {activeTab !== "explore" && activeTab !== "activity" && (
          <>
            {activeTab === "following" && (!user || user.isGuest) ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <h2 className="text-[20px] font-bold text-ink dark:text-zinc-100 mb-2">Login to see following feed</h2>
                <p className="text-muted-foreground text-xs leading-relaxed max-w-sm mb-6">Create an account or login to follow other vibe coders and see their code confessions right in your feed.</p>
                <button 
                  onClick={() => router.navigate({ to: "/", search: {} as any })}
                  className="bg-ink dark:bg-zinc-100 text-paper dark:text-zinc-950 hover:opacity-90 font-bold py-2.5 px-6 rounded-full text-xs shadow-sm uppercase tracking-wider transition-colors"
                >
                  Return Home
                </button>
              </div>
            ) : activeTab === "followers" ? (
              (!user || user.isGuest) ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                  <h2 className="text-[20px] font-bold text-ink dark:text-zinc-100 mb-2">Login to view followers</h2>
                  <p className="text-muted-foreground text-xs leading-relaxed max-w-sm mb-6">Create an account or login to view your followers and following lists.</p>
                  <button 
                    onClick={() => router.navigate({ to: "/", search: {} as any })}
                    className="bg-ink dark:bg-zinc-100 text-paper dark:text-zinc-950 hover:opacity-90 font-bold py-2.5 px-6 rounded-full text-xs shadow-sm uppercase tracking-wider transition-colors"
                  >
                    Return Home
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  {/* Sub-tabs row for Following page */}
                  <div className="flex border-b border-ink/10 w-full bg-paper sticky top-[57px] md:top-0 z-10">
                    <button
                      onClick={() => setFollowingSubTab("following")}
                      className={`flex-1 text-center py-3.5 font-bold text-[14px] hover:bg-hot/5 hover:text-hot dark:hover:bg-hot/10 dark:hover:text-hot transition-colors relative whitespace-nowrap cursor-pointer ${
                        followingSubTab === "following" ? "text-hot dark:text-hot font-extrabold" : "text-muted-foreground font-semibold"
                      }`}
                    >
                      Following ({followedAccounts.length})
                      {followingSubTab === "following" && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-hot rounded-t-full" />
                      )}
                    </button>
                    <button
                      onClick={() => setFollowingSubTab("followers")}
                      className={`flex-1 text-center py-3.5 font-bold text-[14px] hover:bg-hot/5 hover:text-hot dark:hover:bg-hot/10 dark:hover:text-hot transition-colors relative whitespace-nowrap cursor-pointer ${
                        followingSubTab === "followers" ? "text-hot dark:text-hot font-extrabold" : "text-muted-foreground font-semibold"
                      }`}
                    >
                      Followers ({mockFollowersList.length})
                      {followingSubTab === "followers" && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-hot rounded-t-full" />
                      )}
                    </button>
                  </div>

                  {followingSubTab === "following" ? (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-900 flex-1">
                      {followedAccounts.map((handle) => {
                        const details = [...mockFollowSuggestions, ...mockFollowersList].find(a => a.handle === handle) || {
                          name: handle.replace("@", ""),
                          handle: handle,
                          bio: "A fellow software engineer confessing AI hallucinations and production bugs."
                        };

                        return (
                          <div key={handle} className="p-5 flex items-start justify-between gap-3 text-left hover:bg-zinc-50/30 dark:hover:bg-zinc-900/5 transition-colors">
                            <div className="flex items-start gap-3 min-w-0">
                              <img 
                                src={getAvatarUrl(details.name)} 
                                alt="avatar" 
                                className="w-10 h-10 bg-ink/5 dark:bg-zinc-900 rounded-full border border-ink/5 dark:border-zinc-800 shrink-0 object-cover" 
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="font-extrabold text-[14px] text-ink dark:text-zinc-100 hover:text-hot transition-colors flex items-center gap-0.5 leading-snug">
                                    {details.name}
                                  </span>
                                  <span className="text-hot fill-current shrink-0">
                                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-hot fill-current"><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.941.1-1.348.27C14.825 2.515 13.512 1.5 12 1.5s-2.825 1.015-3.422 2.28c-.407-.17-.868-.27-1.348-.27-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .941-.1 1.348-.27C9.175 21.485 10.488 22.5 12 22.5s2.825-1.015 3.422-2.28c.407.17.868.27 1.348.27 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.72 3.39l-3.21-3.21 1.41-1.42 1.8 1.8 4.8-4.8 1.42 1.42-6.22 6.21z"></path></g></svg>
                                  </span>
                                </div>
                                <span className="text-[13px] text-muted-foreground block -mt-0.5 leading-tight">{details.handle}</span>
                                <p className="text-[13px] text-ink/80 dark:text-zinc-300 mt-1 leading-normal font-normal">{details.bio}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                setFollowedAccounts(followedAccounts.filter(h => h !== handle));
                              }}
                              className="px-4 py-1.5 rounded-full text-[12px] font-extrabold transition-all shrink-0 shadow-sm uppercase tracking-wider bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-ink dark:text-zinc-200 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 cursor-pointer"
                            >
                              Following
                            </button>
                          </div>
                        );
                      })}

                      {followedAccounts.length === 0 && (
                        <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                          <Heart className="w-8 h-8 text-muted-foreground/60 mb-2" />
                          <h3 className="text-md font-bold text-ink dark:text-zinc-100 mb-1">Not following anyone yet</h3>
                          <p className="text-xs max-w-xs mb-4">You haven't followed any developer accounts yet. Find interesting engineers to follow in the Explore tab!</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-900 flex-1">
                      {mockFollowersList.map((details) => {
                        const isFollowing = followedAccounts.includes(details.handle);
                        return (
                          <div key={details.handle} className="p-5 flex items-start justify-between gap-3 text-left hover:bg-zinc-50/30 dark:hover:bg-zinc-900/5 transition-colors">
                            <div className="flex items-start gap-3 min-w-0">
                              <img 
                                src={getAvatarUrl(details.name)} 
                                alt="avatar" 
                                className="w-10 h-10 bg-ink/5 dark:bg-zinc-900 rounded-full border border-ink/5 dark:border-zinc-800 shrink-0 object-cover" 
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="font-extrabold text-[14px] text-ink dark:text-zinc-100 hover:text-hot transition-colors flex items-center gap-0.5 leading-snug">
                                    {details.name}
                                  </span>
                                  <span className="text-hot fill-current shrink-0">
                                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-hot fill-current"><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.941.1-1.348.27C14.825 2.515 13.512 1.5 12 1.5s-2.825 1.015-3.422 2.28c-.407-.17-.868-.27-1.348-.27-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .941-.1 1.348-.27C9.175 21.485 10.488 22.5 12 22.5s2.825-1.015 3.422-2.28c.407.17.868.27 1.348.27 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.72 3.39l-3.21-3.21 1.41-1.42 1.8 1.8 4.8-4.8 1.42 1.42-6.22 6.21z"></path></g></svg>
                                  </span>
                                </div>
                                <span className="text-[13px] text-muted-foreground block -mt-0.5 leading-tight">{details.handle}</span>
                                <p className="text-[13px] text-ink/80 dark:text-zinc-300 mt-1 leading-normal font-normal">{details.bio}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                if (isFollowing) {
                                  setFollowedAccounts(followedAccounts.filter(h => h !== details.handle));
                                } else {
                                  setFollowedAccounts([...followedAccounts, details.handle]);
                                }
                              }}
                              className={`px-4 py-1.5 rounded-full text-[12px] font-extrabold transition-all shrink-0 shadow-sm uppercase tracking-wider cursor-pointer ${
                                isFollowing 
                                  ? "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-ink dark:text-zinc-200 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600" 
                                  : "bg-ink dark:bg-zinc-100 hover:opacity-90 text-paper dark:text-zinc-950"
                              }`}
                            >
                               {isFollowing ? "Following" : "Follow Back"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="flex-1">
                {visible.map((p) => <PostCard key={p.id} post={p} comments={comments} onImageClick={setActiveLightboxImg} />)}
                {visible.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                    {activeTab === "following" ? (
                      <>
                        <Heart className="w-8 h-8 text-muted-foreground/60 mb-2" />
                        <h3 className="text-md font-bold text-ink dark:text-zinc-100 mb-1">No confessions from people you follow</h3>
                        <p className="text-xs mb-4 max-w-xs">Your followed creators haven't posted any code fails recently, or you aren't following anyone yet. Head over to the Explore tab to find and follow vibe coders!</p>
                        <button
                          onClick={() => router.navigate({ to: "/", search: { tab: "explore" } as any })}
                          className="bg-hot hover:bg-hot/90 text-paper font-bold py-2 px-4 rounded-full text-xs transition-colors shadow-sm"
                        >
                          Find Vibe Coders
                        </button>
                      </>
                    ) : activeTab === "my-posts" ? (
                      <>
                        <h3 className="text-md font-bold text-ink dark:text-zinc-100 mb-1">No confessions yet</h3>
                        <p className="text-xs mb-6 max-w-xs">You haven't posted any code confessions yet. Share your first failure and let the community heal together!</p>
                      </>
                    ) : (
                      <p className="text-xs">Nothing to see here — yet.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {activeLightboxImg && (
        <div 
          onClick={() => setActiveLightboxImg(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col justify-center items-center p-4 select-none cursor-zoom-out animate-in fade-in duration-200"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveLightboxImg(null);
            }}
            className="absolute top-4 right-4 p-2 bg-zinc-900/80 hover:bg-zinc-800 hover:scale-105 border border-zinc-800 text-white rounded-full transition-all cursor-pointer z-55"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={activeLightboxImg} 
            alt="Expanded view" 
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200 cursor-default"
          />
        </div>
      )}
    </div>
  );
}

// FlameIcon helper component
function FlameIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" {...props}>
      <g>
        <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path>
      </g>
    </svg>
  );
}

function PostCard({ post, comments, onImageClick }: { post: any; comments: any[]; onImageClick: (url: string) => void }) {
  const router = useRouter();
  const { user } = useStore();
  const commentCount = comments.filter((c: any) => c.postId === post.id).length;

  const [showComments, setShowComments] = useState(false);
  const [newCommentBody, setNewCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);


  // Kebab Menu & Report states
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [showReportPostModal, setShowReportPostModal] = useState(false);
  const [postReportReason, setPostReportReason] = useState("Spam or duplicate");
  const [isSubmittingPostReport, setIsSubmittingPostReport] = useState(false);
  const [reportSuccessToast, setReportSuccessToast] = useState(false);

  const isAuthor = !!(user && (
    (post.authorSessionId && post.authorSessionId === user.id) ||
    (user.displayName && post.author.toLowerCase() === user.displayName.toLowerCase()) ||
    (user.username && post.author.toLowerCase() === user.username.toLowerCase())
  ));


  const handleDeletePost = async () => {
    if (!window.confirm("Are you sure you want to delete this confession forever? This cannot be undone.")) return;
    try {
      await deletePost(post.id);
    } catch (err) {
      console.error("Failed to delete post:", err);
      alert("Failed to delete confession.");
    }
  };

  const postComments = comments.filter((c: any) => c.postId === post.id);
  const isSaved = isPostSaved(post.id);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentBody.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      await addComment(post.id, newCommentBody.trim());
      setNewCommentBody("");
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const getToolBadgeStyle = (tool: string) => {
    const t = tool.toLowerCase();
    if (t === "claude") {
      return "bg-amber-100/40 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300 border-amber-200/40";
    } else if (t === "chatgpt") {
      return "bg-emerald-100/40 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300 border-emerald-200/40";
    } else if (t === "cursor") {
      return "bg-orange-100/40 text-orange-800 dark:bg-orange-950/20 dark:text-orange-300 border-orange-200/40";
    } else if (t === "gemini") {
      return "bg-blue-100/40 text-blue-800 dark:bg-blue-950/20 dark:text-blue-300 border-blue-200/40";
    } else if (t === "copilot") {
      return "bg-orange-100/40 text-orange-800 dark:bg-orange-950/20 dark:text-orange-300 border-orange-200/40";
    } else if (t === "v0") {
      return "bg-zinc-100/50 text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-300 border-zinc-200/50 dark:border-zinc-800";
    }
    return "bg-zinc-100/50 text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-300 border-zinc-200/50 dark:border-zinc-800";
  };

  return (
    <div 
      className="py-5 px-6 border-b border-ink/5 dark:border-zinc-900 hover:bg-ink/[0.005] dark:hover:bg-zinc-900/10 transition-all flex gap-4"
    >
      <div className="w-10 h-10 shrink-0">
        <img 
          src={getAvatarUrl(post.author)} 
          alt="avatar" 
          className="w-full h-full bg-ink/5 dark:bg-zinc-900 rounded-full border border-ink/5 dark:border-zinc-800" 
        />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[14px] text-ink dark:text-zinc-100 hover:text-hot transition-colors">{post.author}</span>
            <span className="text-[13px] text-muted-foreground">@{post.author}</span>
            <span className="text-muted-foreground px-0.5 text-xs">·</span>
            <span className="text-[13px] text-muted-foreground">{timeAgo(post.createdAt)}</span>
          </div>

          {/* Three Dots Post Dropdown Menu */}
          {!isEditing && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPostMenu(!showPostMenu);
                }}
                className="p-1.5 text-muted-foreground hover:text-ink dark:hover:text-zinc-250 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer shrink-0"
                title="Post options"
              >
                <MoreHorizontal className="w-4.5 h-4.5" />
              </button>

              {showPostMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-20 cursor-default" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPostMenu(false);
                    }} 
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-40 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-2xl z-35 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-100">
                    <div className="py-1">
                      {isAuthor ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPostMenu(false);
                              router.navigate({ to: `/edit/${post.id}` });
                            }}
                            className="w-full text-left px-3.5 py-2.5 text-[13px] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors flex items-center gap-2 font-semibold cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                            Edit Post
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPostMenu(false);
                              handleDeletePost();
                            }}
                            className="w-full text-left px-3.5 py-2.5 text-[13px] text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center gap-2 font-semibold cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Post
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowReportPostModal(true);
                            setShowPostMenu(false);
                          }}
                          className="w-full text-left px-3.5 py-2.5 text-[13px] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors flex items-center gap-2 font-semibold cursor-pointer"
                        >
                          <Flag className="w-3.5 h-3.5 text-muted-foreground" />
                          Report Post
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
            <div className="text-[15px] leading-relaxed text-ink/95 dark:text-zinc-200">
          <h4 className="font-extrabold text-[16px] text-ink dark:text-zinc-50 leading-snug mb-1">{post.title}</h4>
          <p className="text-ink/80 dark:text-zinc-300 font-normal mb-1">{post.body}</p>

          {/* Crime Scene Image Media (Reddit/X/Substack Style) */}
          {post.crimeSceneImage && (
            <div className="mt-3.5 overflow-hidden rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 bg-zinc-950/5 dark:bg-zinc-950/30 flex justify-center items-center shadow-sm max-w-full">
              <img 
                src={post.crimeSceneImage} 
                alt="Crime scene" 
                onClick={() => onImageClick(post.crimeSceneImage)}
                className="max-h-[512px] w-full object-contain rounded-2xl hover:scale-[1.005] transition-all duration-300 cursor-zoom-in" 
                loading="lazy"
              />
            </div>
          )}

          {/* AI Defense & Proof Image Section */}
          {post.aiDefense && (
            <div className="mt-3.5 p-4 bg-zinc-50/50 dark:bg-zinc-900/10 rounded-2xl border border-zinc-200/30 dark:border-zinc-800/30">
              <div className="text-[10px] uppercase font-extrabold text-hot tracking-widest mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-hot rounded-full"></span>
                AI&apos;s Defense
              </div>
              <p className="text-[13px] text-ink/75 dark:text-zinc-400 italic leading-relaxed font-normal">
                &ldquo;{post.aiDefense}&rdquo;
              </p>
              {post.aiDefenseImage && (
                <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200/40 dark:border-zinc-800/50 bg-zinc-950/5 dark:bg-zinc-950/30 flex justify-center items-center max-w-full">
                  <img 
                    src={post.aiDefenseImage} 
                    alt="AI defense proof" 
                    onClick={() => onImageClick(post.aiDefenseImage)}
                    className="max-h-[384px] w-full object-contain rounded-xl hover:scale-[1.005] transition-all duration-300 cursor-zoom-in"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          )}

          {/* Generated Meme Image Media */}
          {post.memeUrl && (
            <div className="mt-3.5 overflow-hidden rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 bg-zinc-950/5 dark:bg-zinc-950/30 flex justify-center items-center shadow-sm max-w-full">
              <img 
                src={post.memeUrl} 
                alt="Confession meme" 
                onClick={() => onImageClick(post.memeUrl)}
                className="max-h-[512px] w-full object-contain rounded-2xl hover:scale-[1.005] transition-all duration-300 cursor-zoom-in"
                loading="lazy"
              />
            </div>
          )}
        </div>
        
        {/* Modern Interactive Action Bar */}
        <div className="flex items-center justify-between mt-5 pt-3.5 border-t border-ink/5 dark:border-zinc-900/60 flex-wrap gap-4 select-none">
          {/* Left Side: Reactions, Comments, Share */}
          <div className="flex items-center gap-3 text-muted-foreground text-[13px] flex-1 min-w-0">
            
            {/* Reactions Group */}
            <div className="flex flex-row items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900/40 p-0.5 rounded-full border border-zinc-200/30 dark:border-zinc-800/40">
              {(Object.keys(REACTION_META) as Reaction[]).map((rKey) => {
                const rMeta = REACTION_META[rKey];
                const active = hasReacted(post.id, rKey);
                const count = post.reactions[rKey] || 0;
                
                return (
                  <button
                    key={rKey}
                    onClick={(e) => {
                      e.stopPropagation(); // prevent navigating to details page
                      toggleReaction(post.id, rKey);
                    }}
                    className={`relative group flex items-center gap-1 px-2 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
                      active 
                        ? "bg-hot/15 text-hot font-bold" 
                        : "hover:bg-ink/5 dark:hover:bg-zinc-800/80 hover:text-ink dark:hover:text-zinc-200"
                    }`}
                  >
                    {/* Instant Custom Tooltip */}
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-zinc-900 dark:bg-zinc-850 text-zinc-100 rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-75 whitespace-nowrap z-30 border border-zinc-800 dark:border-zinc-700">
                      {rMeta.label}
                    </span>

                    <span className="text-xs sm:text-sm">{rMeta.emoji}</span>
                    <span className="text-[10px] sm:text-[11px]">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Comments Action Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowComments(!showComments);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer group shrink-0 ${
                showComments 
                  ? "bg-hot/10 text-hot font-bold" 
                  : "hover:bg-hot/10 hover:text-hot dark:hover:bg-hot/15 text-muted-foreground"
              }`}
            >
              <MessageSquare className="w-4.5 h-4.5 transition-transform group-hover:scale-110" />
              <span className="font-semibold text-[12px]">{commentCount}</span>
            </button>

            {/* Share Action Button */}
            <ShareButton postId={post.id} postTitle={post.title} />

            {/* Bookmark/Save Action Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSavePost(post.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer group ${
                isSaved 
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold" 
                  : "hover:bg-hot/10 hover:text-hot dark:hover:bg-hot/15 text-muted-foreground"
              }`}
              title={isSaved ? "Remove Bookmark" : "Save Confession"}
            >
              <Bookmark className={`w-4 h-4 transition-transform group-hover:scale-110 ${isSaved ? "fill-current" : ""}`} />
              <span className="font-semibold text-[12px]">{isSaved ? "Saved" : "Save"}</span>
            </button>

          </div>
          
          {/* Right Side: Tool & Status Badges */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border ${getToolBadgeStyle(post.tool)}`}>
              {post.tool}
            </span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setStatus(post.id, post.status === "broken" ? "solved" : "broken");
              }}
              className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                post.status === "broken" 
                  ? "bg-red-50/50 text-red-700/80 border-red-200/40 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/30 hover:bg-red-100/40" 
                  : "bg-emerald-50/50 text-emerald-700/80 border-emerald-200/40 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/30 hover:bg-emerald-100/40"
              }`}
            >
              {post.status === "broken" ? "Still Broken" : "Solved"}
            </button>
          </div>
        </div>

        {/* Inline Comments Section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-ink/5 dark:border-zinc-900/60 space-y-4">
            {/* Comments List */}
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {postComments.map((c: any) => (
                <CommentItem 
                  key={c.id} 
                  comment={c} 
                  post={post} 
                  onReplyClick={(author) => {
                    setNewCommentBody("@" + author + " ");
                    setTimeout(() => {
                      const el = document.getElementById(`comment-input-${post.id}`) as HTMLInputElement;
                      if (el) el.focus();
                    }, 50);
                  }}
                />
              ))}
              
              {postComments.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No replies yet. Be the first to heal this vibe coder!</p>
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="flex items-start gap-3 mt-3">
              <img 
                src={getAvatarUrl(user?.username || "anonymous")} 
                alt="avatar" 
                className="w-8 h-8 rounded-full bg-ink/5 dark:bg-zinc-900 border border-ink/10 dark:border-zinc-800 object-cover shrink-0" 
              />
              <div className="flex-1 flex gap-2">
                <input
                  id={`comment-input-${post.id}`}
                  type="text"
                  placeholder="Write a supportive reply..."
                  value={newCommentBody}
                  onChange={(e) => setNewCommentBody(e.target.value)}
                  className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-2 text-[13px] text-ink dark:text-zinc-100 placeholder-muted-foreground focus:outline-none focus:border-hot dark:focus:border-hot transition-all"
                />
                <button
                  type="submit"
                  disabled={!newCommentBody.trim() || submittingComment}
                  className="px-4 py-2 bg-hot text-paper text-[12px] font-bold rounded-full transition-all hover:bg-hot/90 disabled:opacity-50 disabled:hover:bg-hot cursor-pointer shrink-0 uppercase tracking-wider shadow-sm"
                >
                  {submittingComment ? "..." : "Reply"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Report Post Modal */}
      {showReportPostModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="font-extrabold text-[16px] text-ink dark:text-zinc-50 mb-1 flex items-center gap-2">
              <Flag className="w-4 h-4 text-hot" /> Report Confession
            </h3>
            <p className="text-[12px] text-muted-foreground mb-4">
              Help us keep the wall of shame high-quality. Why are you reporting this failure?
            </p>
            
            <div className="space-y-3 mb-6">
              {[
                "Spam or duplicate",
                "Harassment or abuse",
                "AI Hallucinations / Fake confession",
                "Not related to developer struggles"
              ].map((reasonOption) => (
                <label 
                  key={reasonOption} 
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                    postReportReason === reasonOption 
                      ? "bg-hot/5 border-hot/30 text-hot dark:bg-hot/10 dark:border-hot/40" 
                      : "border-zinc-150 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 text-ink/80 dark:text-zinc-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="postReportReason"
                    value={reasonOption}
                    checked={postReportReason === reasonOption}
                    onChange={() => setPostReportReason(reasonOption)}
                    className="accent-hot cursor-pointer"
                  />
                  <span className="text-[13px] font-medium leading-none">{reasonOption}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowReportPostModal(false)}
                className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-[12px] font-bold rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors uppercase tracking-wider text-ink dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingPostReport}
                onClick={async () => {
                  setIsSubmittingPostReport(true);
                  try {
                    await reportContent("post", post.id, postReportReason);
                    setShowReportPostModal(false);
                    setReportSuccessToast(true);
                    setTimeout(() => setReportSuccessToast(false), 3000);
                  } catch (err) {
                    alert("Failed to submit report. Please try again.");
                  } finally {
                    setIsSubmittingPostReport(false);
                  }
                }}
                className="px-4 py-2 bg-hot text-paper text-[12px] font-bold rounded-full hover:bg-hot/90 transition-colors uppercase tracking-wider shadow-sm cursor-pointer"
              >
                {isSubmittingPostReport ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {reportSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-650 text-white font-semibold text-[13px] py-3 px-5 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4.5 h-4.5" />
          <span>Report submitted successfully. Thank you!</span>
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, post, onReplyClick }: { comment: any; post: any; onReplyClick: (author: string) => void }) {
  const { user } = useStore();
  const commentLiked = hasLikedComment(comment.id);

  const [showCommentMenu, setShowCommentMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Spam or duplicate");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  // Check if I am the comment author
  const isMyComment = !!(user && (
    (comment.authorSessionId && comment.authorSessionId === user.id) ||
    (user.displayName && comment.author.toLowerCase() === user.displayName.toLowerCase()) ||
    (user.username && comment.author.toLowerCase() === user.username.toLowerCase())
  ));

  // Check if I am the post owner (so I can moderate any comments on my post)
  const isPostOwner = !!(user && (
    (post.authorSessionId && post.authorSessionId === user.id) ||
    (user.displayName && post.author.toLowerCase() === user.displayName.toLowerCase()) ||
    (user.username && post.author.toLowerCase() === user.username.toLowerCase())
  ));

  // Check if this comment is a reply to MY comment (contains my username or my handle)
  const isReplyToMyComment = !!(user && (
    (user.displayName && comment.body.includes(`@${user.displayName}`)) ||
    (user.username && comment.body.includes(`@${user.username}`))
  ));

  // Who can delete this comment? Either the comment author, or the post owner, or if it replies to my comment!
  const canDelete = isMyComment || isPostOwner || isReplyToMyComment;

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this support reply forever?")) return;
    try {
      await deleteComment(comment.id);
    } catch (err) {
      alert("Failed to delete comment.");
    }
  };

  return (
    <div className="flex gap-3 text-left items-start py-1">
      <img 
        src={getAvatarUrl(comment.author)} 
        alt="avatar" 
        className="w-7 h-7 rounded-full bg-ink/5 dark:bg-zinc-900 border border-ink/5 dark:border-zinc-800 object-cover shrink-0" 
      />
      <div className="flex-1 min-w-0 flex items-start gap-2">
        <div className="flex-1 bg-zinc-50/50 dark:bg-zinc-900/20 px-3.5 py-2.5 rounded-2xl border border-zinc-200/20 dark:border-zinc-800/20 relative">
          <div className="flex items-center justify-between gap-1.5 mb-1 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-[12px] text-ink dark:text-zinc-200">@{comment.author}</span>
              <span className="text-[10px] text-muted-foreground">{timeAgo(comment.createdAt)}</span>
            </div>
            
            {/* Comment Three-Dot Kebab Menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCommentMenu(!showCommentMenu);
                }}
                className="p-1 text-muted-foreground hover:text-ink dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer shrink-0"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {showCommentMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-20 cursor-default" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCommentMenu(false);
                    }} 
                  />
                  <div className="absolute right-0 top-full mt-1 w-36 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 shadow-xl z-35 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                    <div className="py-1">
                      {canDelete ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowCommentMenu(false);
                              handleDelete();
                            }}
                            className="w-full text-left px-3 py-1.5 text-[12px] text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center gap-1.5 font-semibold cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            Delete
                          </button>
                          {!isMyComment && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowReportModal(true);
                                setShowCommentMenu(false);
                              }}
                              className="w-full text-left px-3 py-1.5 text-[12px] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors flex items-center gap-1.5 font-semibold cursor-pointer"
                            >
                              <Flag className="w-3.5 h-3.5 text-muted-foreground" />
                              Report
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowReportModal(true);
                            setShowCommentMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-[12px] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors flex items-center gap-1.5 font-semibold cursor-pointer"
                        >
                          <Flag className="w-3.5 h-3.5 text-muted-foreground" />
                          Report
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <p className="text-[13px] text-ink/90 dark:text-zinc-300 leading-normal font-normal">{comment.body}</p>
        </div>
        
        {/* Comment Action Buttons (Like & Reply) */}
        <div className="flex flex-col gap-1 shrink-0 mt-1">
          {/* Like */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleLikeComment(comment.id);
            }}
            className={`p-1.5 rounded-full transition-all cursor-pointer hover:bg-rose-500/10 ${
              commentLiked 
                ? "text-rose-500 bg-rose-500/5" 
                : "text-muted-foreground hover:text-rose-500"
            }`}
            title={commentLiked ? "Unlike" : "Like"}
          >
            <Heart className={`w-3.5 h-3.5 ${commentLiked ? "fill-current" : ""}`} />
          </button>
          
          {/* Reply */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReplyClick(comment.author);
            }}
            className="p-1.5 rounded-full text-muted-foreground hover:text-hot hover:bg-hot/5 transition-all cursor-pointer"
            title={`Reply to @${comment.author}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Report Comment Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="font-extrabold text-[16px] text-ink dark:text-zinc-50 mb-1 flex items-center gap-2">
              <Flag className="w-4 h-4 text-hot" /> Report Reply
            </h3>
            <p className="text-[12px] text-muted-foreground mb-4">
              Help us keep the conversation helpful. Why are you reporting this reply?
            </p>
            
            <div className="space-y-3 mb-6">
              {[
                "Spam or duplicate",
                "Harassment or abuse",
                "Offensive or off-topic content"
              ].map((reasonOption) => (
                <label 
                  key={reasonOption} 
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                    reportReason === reasonOption 
                      ? "bg-hot/5 border-hot/30 text-hot dark:bg-hot/10 dark:border-hot/40" 
                      : "border-zinc-150 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 text-ink/80 dark:text-zinc-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="commentReportReason"
                    value={reasonOption}
                    checked={reportReason === reasonOption}
                    onChange={() => setReportReason(reasonOption)}
                    className="accent-hot cursor-pointer"
                  />
                  <span className="text-[13px] font-medium leading-none">{reasonOption}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-[12px] font-bold rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors uppercase tracking-wider text-ink dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingReport}
                onClick={async () => {
                  setIsSubmittingReport(true);
                  try {
                    await reportContent("comment", comment.id, reportReason);
                    setShowReportModal(false);
                    setSuccessToast(true);
                    setTimeout(() => setSuccessToast(false), 3000);
                  } catch (err) {
                    alert("Failed to submit report. Please try again.");
                  } finally {
                    setIsSubmittingReport(false);
                  }
                }}
                className="px-4 py-2 bg-hot text-paper text-[12px] font-bold rounded-full hover:bg-hot/90 transition-colors uppercase tracking-wider shadow-sm cursor-pointer"
              >
                {isSubmittingReport ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-650 text-white font-semibold text-[13px] py-3 px-5 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4.5 h-4.5" />
          <span>Report submitted successfully. Thank you!</span>
        </div>
      )}
    </div>
  );
}

function ShareButton({ postId, postTitle }: { postId: string; postTitle: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setMenuOpen(false);
    });
  };

  const handleShareX = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${postId}`;
    const text = encodeURIComponent(`"${postTitle}" - A vibe-coding confession on CodeConfessions #VibeFail`);
    const xUrl = `https://x.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`;
    window.open(xUrl, "_blank");
    setMenuOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(!menuOpen);
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer group ${
          menuOpen 
            ? "bg-hot/10 text-hot font-bold" 
            : "hover:bg-hot/10 hover:text-hot dark:hover:bg-hot/15"
        }`}
      >
        <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-none stroke-current stroke-[2px] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
        <span className="font-semibold text-[12px]">Share</span>
      </button>

      {menuOpen && (
        <>
          {/* Click overlay to close dropdown */}
          <div 
            className="fixed inset-0 z-20 cursor-default" 
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
            }} 
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 bottom-full mb-2 w-48 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl z-30 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="py-1">
              <button
                onClick={handleShareX}
                className="w-full text-left px-4 py-2.5 text-[13px] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 font-bold cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Share to X
              </button>
              <button
                onClick={handleCopy}
                className="w-full text-left px-4 py-2.5 text-[13px] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 font-bold cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-none stroke-current stroke-[2.5px]"><polyline points="20 6 9 17 4 12" /></svg>
                Copy Link
              </button>
            </div>
          </div>
        </>
      )}
      
      {copied && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2.5 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-[10px] uppercase tracking-wider font-extrabold rounded shadow-md z-30 pointer-events-none whitespace-nowrap animate-bounce">
          Copied!
        </div>
      )}
    </div>
  );
}
