import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { updatePost, useStore, getAvatarUrl, logout, setTheme, setAuthUser } from "@/lib/store";
import { HeadlineInput } from "@/components/confess/HeadlineInput";
import { SuspectPicker } from "@/components/confess/SuspectPicker";
import { CrimeSceneTextarea } from "@/components/confess/CrimeSceneTextarea";
import { VibePicker } from "@/components/confess/FlairsPickers";
import { AIDefenseInput } from "@/components/confess/AIDefenseInput";
import { MemeCard } from "@/components/confess/MemeCard";
import { SidebarV2 } from "@/components/v2/SidebarV2";
import { AuthModalV2 } from "@/components/v2/AuthModalV2";
import { Home, TrendingUp, BookOpen, Compass, Bell, User, LogOut, Sun, Moon, Monitor } from "lucide-react";

export const Route = createFileRoute("/edit/$id")({
  component: EditPost,
  head: () => ({ meta: [{ title: "Edit confession — VibeFail" }] }),
});

function EditPost() {
  const { id } = Route.useParams();
  const { posts, user, theme } = useStore();
  const post = posts.find((p) => p.id === id);
  const router = useRouter();

  // Redirect if not found
  useEffect(() => {
    if (posts.length > 0 && !post) {
      router.navigate({ to: "/feed" });
    }
  }, [posts, post, router]);

  const [headline, setHeadline] = useState("");
  const [suspect, setSuspect] = useState("other");
  const [crimeScene, setCrimeScene] = useState("");
  const [vibe, setVibe] = useState("");
  const [verdict, setVerdict] = useState("still_broken");
  const [aiDefense, setAiDefense] = useState("");
  const [plea, setPlea] = useState("");
  const [crimeSceneImage, setCrimeSceneImage] = useState<string | null>(null);
  const [aiDefenseImage, setAiDefenseImage] = useState<string | null>(null);

  // Initialize form states when post is loaded
  useEffect(() => {
    if (post) {
      setHeadline(post.title);
      setSuspect(post.tool);
      setCrimeScene(post.body);
      setVibe(post.vibe || "");
      setVerdict(post.verdict || "still_broken");
      setAiDefense(post.aiDefense || "");
      setPlea(post.plea || "");
      setCrimeSceneImage(post.crimeSceneImage || null);
      setAiDefenseImage(post.aiDefenseImage || null);
    }
  }, [post]);

  if (!post) {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-paper">
        <div className="animate-spin h-6 w-6 border-2 border-ink border-t-transparent rounded-full" />
      </div>
    );
  }

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [remixSeed, setRemixSeed] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const refInsta = useRef<HTMLDivElement | null>(null);
  const refTwitter = useRef<HTMLDivElement | null>(null);

  const [authOpen, setAuthOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const activeHandle = post.author;

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

  const validate = () => {
    const newErrors: string[] = [];
    if (!headline.trim()) newErrors.push("Headline is required.");
    if (headline.length > 140) newErrors.push("Headline must be 140 characters or less.");
    if (!crimeScene.trim()) newErrors.push("Crime scene description is required.");
    if (crimeScene.length > 500) newErrors.push("Crime scene must be 500 characters or less.");
    if (aiDefense && aiDefense.length > 280) newErrors.push("AI's Defense must be 280 characters or less.");
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleActualSubmit = async () => {
    setIsSubmitting(true);
    setLoadingStatus("UPDATING UR FAIL...");

    let twitterMemeUrl = post.memeUrl || "";
    // If the title, suspect, or AI defense text/images changed, regenerate the meme
    const isMemeContentChanged = 
      headline.trim() !== post.title || 
      suspect !== post.tool || 
      aiDefense.trim() !== (post.aiDefense || "") ||
      crimeSceneImage !== (post.crimeSceneImage || null) ||
      aiDefenseImage !== (post.aiDefenseImage || null);

    if (isMemeContentChanged && (aiDefense.trim() || aiDefenseImage || crimeSceneImage)) {
      setLoadingStatus("GENERATING THE MEME...");
      try {
        const html2canvas = (await import("html2canvas")).default;
        await new Promise((resolve) => setTimeout(resolve, 150));

        if (refTwitter.current) {
          const canvasTwitter = await html2canvas(refTwitter.current, {
            useCORS: true,
            scale: 2,
          });
          twitterMemeUrl = canvasTwitter.toDataURL("image/png");
        }
      } catch (canvasErr) {
        console.error("Failed to generate meme images via html2canvas:", canvasErr);
      }
    }

    try {
      await updatePost(post.id, {
        title: headline.trim(),
        body: crimeScene.trim(),
        tool: suspect,
        vibe: vibe || null,
        verdict,
        plea: plea || null,
        aiDefense: aiDefense.trim() || null,
        memeUrl: twitterMemeUrl || null,
        crimeSceneImage,
        aiDefenseImage,
      });

      router.navigate({ to: "/feed" });
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "Failed to update the confession. Please try again.";
      setErrors([errMsg]);
    } finally {
      setIsSubmitting(false);
      setLoadingStatus("");
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) {
      return;
    }

    handleActualSubmit();
  };

  const randomize = () => {
    const vibes = ["4am_energy", "vibe_coding", "deadline_panic", "agentic_rogue", "just_woke_up", "worked_5min_ago", "drunk_coded", "trust_the_process", "prod_on_fire"];
    const verdicts = ["still_broken", "nuked", "solved", "cope_mode", "rebuilt"];
    const pleas = ["innocent", "deserve_it", "cooked"];

    setVibe(vibes[Math.floor(Math.random() * vibes.length)]);
    setVerdict(verdicts[Math.floor(Math.random() * verdicts.length)]);
    setPlea(pleas[Math.floor(Math.random() * pleas.length)]);
  };

  return (
    <div className="h-full w-full bg-paper text-ink dark:text-zinc-50 selection:bg-hot/20 font-sans flex flex-col items-center justify-start overflow-hidden relative">
      
      {/* Mobile Top Header */}
      <header className="w-full md:hidden h-14 border-b border-ink/10 flex items-center justify-between px-4 bg-paper shrink-0 z-30 relative">
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
          <span className="font-bold text-[20px] tracking-tight text-ink dark:text-zinc-50">
            VIBE<span className="bg-ink dark:bg-zinc-50 text-paper dark:text-zinc-950 px-1 ml-0.5 pb-0.5 rounded-sm">FAIL</span>
          </span>
        </Link>
        
        {/* Profile/Menu trigger */}
        <div className="relative">
          {user ? (
            <img 
              src={getAvatarUrl(user.displayName || user.username)} 
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
              <div 
                className="fixed inset-0 z-40 cursor-default" 
                onClick={() => setProfileMenuOpen(false)}
              />
              <div className="absolute right-0 top-10 w-60 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
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
                    <div className="px-3 py-1.5 mb-1.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-200/20 dark:border-zinc-800/40">
                      <div className="font-bold text-[13px] text-ink dark:text-zinc-200 truncate">{user.displayName || user.username}</div>
                      <div className="text-[11px] text-muted-foreground truncate">@{user.displayName || user.username}</div>
                    </div>
                  </>
                ) : (
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
              </div>
            </>
          )}
        </div>
      </header>

      <div className="w-full max-w-[1440px] flex flex-1 flex-row h-full overflow-hidden justify-center">
        {/* Left Sidebar - Desktop (hidden on mobile) */}
        <aside className="hidden md:flex w-[310px] h-full flex-col bg-paper shrink-0 border-r border-ink/10">
          <SidebarV2 />
        </aside>

        {/* Form Container */}
        <main className="flex-1 w-full max-w-[1130px] h-full overflow-y-auto p-4 sm:p-8 pb-24 md:pb-8 bg-paper">
          <div className="mx-auto w-full max-w-[700px] px-1 pt-4 pb-20 space-y-8">
            <div className="text-center space-y-2">
              <span className="inline-block mb-2.5 font-sans text-[10px] uppercase bg-hot text-white px-2.5 py-0.5 font-bold rounded-full select-none shadow-sm tracking-wider">
                Editing your confession
              </span>
              <h1 className="font-sans font-black text-3xl sm:text-4xl text-ink dark:text-zinc-100 uppercase tracking-tight">
                Update ur fail.
              </h1>
              <p className="font-sans text-xs text-ink/65 dark:text-zinc-400">
                Fix spelling, update the screenshots, or rewrite your AI defense.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="w-full border border-ink/15 dark:border-zinc-800 p-6 space-y-5 bg-paper rounded-2xl shadow-sm"
            >
              {errors.length > 0 && (
                <div className="bg-hot/10 text-hot p-4 border border-hot/25 rounded-xl">
                  <div className="font-sans text-xs font-bold uppercase mb-1">Validation Error</div>
                  <ul className="list-disc pl-4 font-sans text-[11px] text-hot/90 space-y-0.5">
                    {errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Section 1: The Confession */}
              <div className="space-y-4.5">
                <div className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink/40 dark:text-zinc-500">
                  01. The Confession
                </div>
                <HeadlineInput value={headline} onChange={setHeadline} />
                <SuspectPicker value={suspect} onChange={setSuspect} />
                <CrimeSceneTextarea
                  value={crimeScene}
                  onChange={setCrimeScene}
                  image={crimeSceneImage}
                  onImageChange={setCrimeSceneImage}
                />
              </div>

              {/* Section 2: Optional Flairs */}
              <div className="border-t border-ink/10 dark:border-zinc-800 pt-5 space-y-4.5">
                <div className="flex justify-between items-center">
                  <div className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink/40 dark:text-zinc-500">
                    02. Optional Flairs
                  </div>
                </div>

                <VibePicker value={vibe} onChange={setVibe} />
              </div>

              {/* Section 3: AI's Defense */}
              <div className="border-t border-ink/10 dark:border-zinc-800 pt-5 space-y-4.5">
                <div className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink/40 dark:text-zinc-500">
                  03. AI&apos;s Defense
                </div>
                <AIDefenseInput
                  value={aiDefense}
                  onChange={setAiDefense}
                  image={aiDefenseImage}
                  onImageChange={setAiDefenseImage}
                />
              </div>

              {/* Action Row */}
              <div className="border-t border-ink/10 dark:border-zinc-800 pt-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-sans text-xs text-ink/65 dark:text-zinc-400">
                    Author: <strong className="uppercase text-hot font-extrabold">@{activeHandle}</strong>
                  </span>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <Link
                    to="/"
                    className="font-sans text-xs font-bold py-2 px-4 border border-ink/20 dark:border-zinc-700 text-ink/80 dark:text-zinc-300 rounded-full hover:bg-ink/5 transition-all text-center flex items-center justify-center cursor-pointer"
                  >
                    CANCEL
                  </Link>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="font-sans text-xs font-bold py-2 px-5 bg-hot hover:bg-hot/90 text-white rounded-full transition-all text-center flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer shadow-sm border border-transparent"
                  >
                    {isSubmitting ? "SAVING..." : "SAVE CHANGES"}
                  </button>
                </div>
              </div>
            </form>
            
            {/* Live Preview / Meme Render */}
            <div className="pt-2 border-t border-ink/10 dark:border-zinc-850">
              <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-muted-foreground mb-4 text-center">Live Preview Card</h3>
              <MemeCard
                headline={headline}
                suspect={suspect}
                aiDefense={aiDefense}
                author={activeHandle}
                refInsta={refInsta}
                refTwitter={refTwitter}
                remixStyle={remixSeed}
                crimeSceneImage={crimeSceneImage}
                aiDefenseImage={aiDefenseImage}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-paper/95 backdrop-blur-md border-t border-ink/10 flex items-center justify-around z-30 px-2 shadow-lg">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            search={item.search as any}
            onClick={(e) => handleMobileNavClick(item, e)}
            className="flex flex-col items-center justify-center flex-1 py-1 text-ink dark:text-zinc-200 cursor-pointer"
          >
            <item.icon className="w-5.5 h-5.5 transition-all stroke-[1.5px] text-muted-foreground" />
            <span className="text-[10px] mt-0.5 transition-all font-medium text-muted-foreground">{item.label}</span>
          </Link>
        ))}
      </div>

      <AuthModalV2 isOpen={authOpen} onClose={() => setAuthOpen(false)} onLogin={setAuthUser} />
    </div>
  );
}
