import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { createPost, randomHandle, useStore, logout, setTheme, getAvatarUrl, setAuthUser } from "@/lib/store";
import { useConfessForm } from "@/components/confess/useConfessForm";
import { HeadlineInput } from "@/components/confess/HeadlineInput";
import { SuspectPicker } from "@/components/confess/SuspectPicker";
import { CrimeSceneTextarea } from "@/components/confess/CrimeSceneTextarea";
import { VibePicker, VerdictPicker, PleaPicker } from "@/components/confess/FlairsPickers";
import { AIDefenseInput } from "@/components/confess/AIDefenseInput";
import { LivePreviewCard } from "@/components/confess/LivePreviewCard";
import { MemeCard } from "@/components/confess/MemeCard";
import { PostSuccess } from "@/components/confess/PostSuccess";
import { SidebarV2 } from "@/components/v2/SidebarV2";
import { AuthModalV2 } from "@/components/v2/AuthModalV2";
import { Home, TrendingUp, BookOpen, Compass, Bell, User, LogOut, Sun, Moon, Monitor } from "lucide-react";

export const Route = createFileRoute("/submit")({
  component: Submit,
  head: () => ({ meta: [{ title: "Confess a fail — VibeFail" }] }),
});

function Submit() {
  const {
    headline,
    setHeadline,
    suspect,
    setSuspect,
    crimeScene,
    setCrimeScene,
    vibe,
    setVibe,
    verdict,
    setVerdict,
    aiDefense,
    setAiDefense,
    plea,
    setPlea,
    errors,
    setErrors,
    validate,
    clearDraft,
    randomize,
  } = useConfessForm();

  const [crimeSceneImage, setCrimeSceneImage] = useState<string | null>(null);
  const [aiDefenseImage, setAiDefenseImage] = useState<string | null>(null);

  const [sessionAuthor] = useState(() => randomHandle());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [remixSeed, setRemixSeed] = useState(0);

  const [successData, setSuccessData] = useState<{
    postId: string;
    headline: string;
    twitterMemeUrl?: string;
    instaMemeUrl?: string;
    author: string;
  } | null>(null);

  const refInsta = useRef<HTMLDivElement | null>(null);
  const refTwitter = useRef<HTMLDivElement | null>(null);

  // V2 Layout and Profile popup states
  const [authOpen, setAuthOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { user, theme } = useStore();
  const activeHandle = user ? user.username : sessionAuthor;
  const router = useRouter();

  useEffect(() => {
    document.body.classList.add("v2-body");
    return () => {
      document.body.classList.remove("v2-body");
    };
  }, []);

  const navItems = [
    { label: "Home", icon: Home, to: "/", search: {} },
    { label: "Popular", icon: TrendingUp, to: "/", search: { tab: "popular" } },
    { label: "Following", icon: BookOpen, to: "/", search: { tab: "followers" } },
    { label: "Explore", icon: Compass, to: "/", search: { tab: "explore" } },
    { label: "Activity", icon: Bell, to: "/", search: { tab: "activity" } },
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setLoadingStatus("POSTING UR L...");

    let twitterMemeUrl = "";
    let instaMemeUrl = "";

    try {
      if (aiDefense.trim() || aiDefenseImage || crimeSceneImage) {
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

          if (refInsta.current) {
            const canvasInsta = await html2canvas(refInsta.current, {
              useCORS: true,
              scale: 2,
            });
            instaMemeUrl = canvasInsta.toDataURL("image/png");
          }
        } catch (canvasErr) {
          console.error("Failed to generate meme images via html2canvas:", canvasErr);
        }
      }

      const post = await createPost({
        title: headline.trim(),
        body: crimeScene.trim(),
        tool: suspect,
        vibe: vibe || undefined,
        verdict,
        plea: plea || undefined,
        aiDefense: aiDefense.trim() || undefined,
        memeUrl: twitterMemeUrl || undefined,
        crimeSceneImage: crimeSceneImage || undefined,
        aiDefenseImage: aiDefenseImage || undefined,
        language: "Other",
        author: activeHandle,
      });

      clearDraft();
      setCrimeSceneImage(null);
      setAiDefenseImage(null);

      setSuccessData({
        postId: post.id,
        headline: post.title,
        twitterMemeUrl,
        instaMemeUrl,
        author: post.author,
      });
    } catch (err) {
      console.error(err);
      setErrors(["Failed to submit the confession. Please try again."]);
    } finally {
      setIsSubmitting(false);
      setLoadingStatus("");
    }
  };

  const handleRemix = async () => {
    if (!successData) return;
    setLoadingStatus("REMIXING MEME LAYOUT...");
    setIsSubmitting(true);

    const nextSeed = remixSeed + 1;
    setRemixSeed(nextSeed);

    await new Promise((resolve) => setTimeout(resolve, 200));

    let newTwitterMemeUrl = "";
    let newInstaMemeUrl = "";

    try {
      const html2canvas = (await import("html2canvas")).default;
      if (refTwitter.current) {
        const canvasTwitter = await html2canvas(refTwitter.current, {
          useCORS: true,
          scale: 2,
        });
        newTwitterMemeUrl = canvasTwitter.toDataURL("image/png");
      }

      if (refInsta.current) {
        const canvasInsta = await html2canvas(refInsta.current, {
          useCORS: true,
          scale: 2,
        });
        newInstaMemeUrl = canvasInsta.toDataURL("image/png");
      }
    } catch (err) {
      console.error("Meme remix capture failed", err);
    }

    setSuccessData((prev) =>
      prev
        ? {
            ...prev,
            twitterMemeUrl: newTwitterMemeUrl || prev.twitterMemeUrl,
            instaMemeUrl: newInstaMemeUrl || prev.instaMemeUrl,
          }
        : null
    );
    setIsSubmitting(false);
    setLoadingStatus("");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (window.confirm("Abandon this confession? All draft progress will be cleared.")) {
          clearDraft();
          setCrimeSceneImage(null);
          setAiDefenseImage(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [headline, suspect, crimeScene, vibe, verdict, aiDefense, plea, isSubmitting, successData, crimeSceneImage, aiDefenseImage, activeHandle]);

  const renderContent = () => {
    if (successData) {
      return (
        <div className="relative">
          <PostSuccess
            postId={successData.postId}
            headline={successData.headline}
            twitterMemeUrl={successData.twitterMemeUrl}
            instaMemeUrl={successData.instaMemeUrl}
            author={successData.author}
            onRemixLayout={aiDefense.trim() || aiDefenseImage || successData.twitterMemeUrl ? handleRemix : undefined}
          />
          <MemeCard
            headline={successData.headline}
            suspect={suspect}
            aiDefense={aiDefense}
            author={successData.author}
            refInsta={refInsta}
            refTwitter={refTwitter}
            remixStyle={remixSeed}
            crimeSceneImage={crimeSceneImage}
            aiDefenseImage={aiDefenseImage}
          />
          {isSubmitting && (
            <div className="fixed inset-0 bg-ink/70 backdrop-blur-md z-50 flex flex-col justify-center items-center p-4">
              <div className="bg-paper border border-ink/20 p-8 max-w-sm w-full text-center space-y-4 rounded-2xl shadow-xl flex flex-col items-center">
                <div className="animate-spin h-8 w-8 border-3 border-ink border-t-transparent rounded-full mb-1" />
                <h2 className="font-sans font-bold text-xl text-ink uppercase tracking-wide">{loadingStatus}</h2>
                <p className="font-sans text-xs text-ink/60">making it pretty. hold tight bestie...</p>
              </div>
            </div>
          )}
        </div>
      );
    }    return (
      <div className="mx-auto w-full max-w-2xl px-1 pt-4 pb-20 space-y-8">
        <div className="text-center space-y-2">
          <span className="inline-block mb-2.5 font-sans text-[10px] uppercase bg-hot/10 px-2.5 py-0.5 border border-hot/20 text-hot font-bold rounded-full">
            Step into the booth
          </span>
          <h1 className="font-sans font-black text-3xl sm:text-4xl text-ink dark:text-zinc-100 uppercase tracking-tight">
            Confess a fail.
          </h1>
          <p className="font-sans text-xs text-ink/60 dark:text-zinc-400">
            No login. No name. We assign you a handle or use your registered username.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full border border-ink/15 dark:border-zinc-800 p-6 space-y-5 bg-paper rounded-2xl shadow-sm"
        >
          {errors.length > 0 && (
            <div className="bg-hot/10 text-hot p-4 border border-hot/25 rounded-xl">
              <div className="font-sans text-xs font-bold uppercase mb-1">Submission Error</div>
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
              <button
                type="button"
                onClick={randomize}
                className="font-sans text-[10px] font-bold px-3 py-1 bg-hot/10 hover:bg-hot/20 text-hot rounded-full border border-hot/25 transition-colors cursor-pointer"
              >
                🎲 RANDOMIZE FLAIRS
              </button>
            </div>

            <VibePicker value={vibe} onChange={setVibe} />
            <VerdictPicker value={verdict} onChange={setVerdict} />
            <PleaPicker value={plea} onChange={setPlea} />
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
                Handle: <strong className="uppercase text-hot font-extrabold">@{activeHandle}</strong>
              </span>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Clear this confession draft? All progress will be lost.")) {
                    clearDraft();
                    setCrimeSceneImage(null);
                    setAiDefenseImage(null);
                  }
                }}
                className="font-sans text-xs font-bold py-2 px-4 border border-ink/20 dark:border-zinc-700 text-ink/80 dark:text-zinc-300 rounded-full hover:bg-ink/5 transition-all text-center flex items-center justify-center cursor-pointer"
              >
                ✕ RESET
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="font-sans text-xs font-bold py-2 px-5 bg-hot hover:bg-hot/90 text-white rounded-full transition-all text-center flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer shadow-sm border border-transparent"
              >
                {isSubmitting ? "POSTING..." : "CONFESS →"}
              </button>
            </div>
          </div>
        </form>

        <div className="text-center font-sans text-[11px] text-ink/40 dark:text-zinc-500 mt-8">
          shortcuts: <strong className="font-bold">ctrl + enter</strong> to submit | <strong className="font-bold">esc</strong> to clear
        </div>

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

        {isSubmitting && (
          <div className="fixed inset-0 bg-ink/70 backdrop-blur-md z-50 flex flex-col justify-center items-center p-4">
            <div className="bg-paper border border-ink/20 p-6 max-w-xs w-full text-center space-y-3 rounded-2xl shadow-xl flex flex-col items-center">
              <div className="animate-spin h-6 w-6 border-2 border-ink border-t-transparent rounded-full mb-1" />
              <h2 className="font-sans font-bold text-lg text-ink uppercase tracking-wide">{loadingStatus}</h2>
              <p className="font-sans text-[10px] text-ink/60">making it pretty. hold tight bestie...</p>
            </div>
          </div>
        )}
      </div>
    );
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

                {user && !user.isGuest ? (
                  <>
                    <div className="px-3 py-1.5 mb-1.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-200/20 dark:border-zinc-800/40">
                      <div className="font-bold text-[13px] text-ink dark:text-zinc-200 truncate">{user.username}</div>
                      <div className="text-[11px] text-muted-foreground truncate">@{user.username}</div>
                    </div>
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        router.navigate({ to: "/", search: { tab: "my-posts" } as any });
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
        </div>
      </header>

      <div className="w-full max-w-[1440px] flex flex-1 flex-row h-full overflow-hidden justify-center">
        {/* Left Sidebar - Desktop (hidden on mobile) */}
        <aside className="hidden md:flex w-[310px] h-full flex-col bg-paper shrink-0 border-r border-ink/10">
          <SidebarV2 />
        </aside>

        {/* Form Container */}
        <main className="flex-1 w-full max-w-[1130px] overflow-y-auto p-4 sm:p-8 pb-24 md:pb-8 bg-paper">
          {renderContent()}
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
