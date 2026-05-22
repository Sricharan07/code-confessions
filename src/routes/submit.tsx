import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { createPost, randomHandle } from "@/lib/store";
import { useConfessForm } from "@/components/confess/useConfessForm";
import { HeadlineInput } from "@/components/confess/HeadlineInput";
import { SuspectPicker } from "@/components/confess/SuspectPicker";
import { CrimeSceneTextarea } from "@/components/confess/CrimeSceneTextarea";
import { VibePicker, VerdictPicker, PleaPicker } from "@/components/confess/FlairsPickers";
import { AIDefenseInput } from "@/components/confess/AIDefenseInput";
import { LivePreviewCard } from "@/components/confess/LivePreviewCard";
import { MemeCard } from "@/components/confess/MemeCard";
import { PostSuccess } from "@/components/confess/PostSuccess";

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
          // SSR Safe dynamic import of html2canvas
          const html2canvas = (await import("html2canvas")).default;
          
          // Wait a tiny frame for DOM to update and render components fully
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

      // Save post in database
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
        author: sessionAuthor,
      });

      // Clear draft data
      clearDraft();
      setCrimeSceneImage(null);
      setAiDefenseImage(null);

      // Show success screen
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

    // Wait a tiny bit for the component styling theme to refresh
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

  // Keyboard shortcuts
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
  }, [headline, suspect, crimeScene, vibe, verdict, aiDefense, plea, isSubmitting, successData, crimeSceneImage, aiDefenseImage]);

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
        {/* Render hidden meme container offscreen under success state as well to enable remixes! */}
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
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pt-8 pb-20">
      <div className="mb-6 text-center sm:text-left space-y-1">
        <span className="font-sans text-[10px] uppercase bg-volt px-2.5 py-0.5 border border-volt/20 text-ink font-bold rounded-full">
          Step into the booth
        </span>
        <h1 className="font-sans font-black text-3xl sm:text-4xl text-ink uppercase tracking-tight">
          Confess a fail.
        </h1>
        <p className="font-sans text-xs text-ink/60">
          No login. No name. We assign you a handle and forget you ever existed.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form with 3 neat sections */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 border border-ink/15 p-6 space-y-6 bg-paper rounded-2xl shadow-sm"
        >
          {/* Error notifications */}
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
            <div className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink/40">
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
          <div className="border-t border-ink/10 pt-5 space-y-4.5">
            <div className="flex justify-between items-center">
              <div className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink/40">
                02. Optional Flairs
              </div>
              <button
                type="button"
                onClick={randomize}
                className="font-sans text-[10px] font-bold px-3 py-1 bg-volt hover:bg-volt/80 text-ink rounded-full border border-ink/10 transition-colors cursor-pointer"
              >
                🎲 RANDOMIZE FLAIRS
              </button>
            </div>

            <VibePicker value={vibe} onChange={setVibe} />
            <VerdictPicker value={verdict} onChange={setVerdict} />
            <PleaPicker value={plea} onChange={setPlea} />
          </div>

          {/* Section 3: AI's Defense */}
          <div className="border-t border-ink/10 pt-5 space-y-4.5">
            <div className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink/40">
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
          <div className="border-t border-ink/10 pt-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-sans text-xs text-ink/65">
                Handle: <strong className="uppercase text-ink">{sessionAuthor}</strong>
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
                className="font-sans text-xs font-bold py-2 px-4 border border-ink/20 text-ink/80 rounded-full hover:bg-ink/5 transition-all text-center flex items-center justify-center cursor-pointer"
              >
                ✕ RESET
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="font-sans text-xs font-bold py-2 px-5 bg-ink text-paper rounded-full hover:bg-ink/90 transition-all text-center flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "POSTING..." : "CONFESS →"}
              </button>
            </div>
          </div>
        </form>

        {/* Right Column: Live Feed Preview (Sticky on desktop) */}
        <div className="lg:col-span-5 lg:sticky lg:top-8 self-start space-y-3">
          <div className="flex items-center gap-2 opacity-60">
            <span className="h-[1px] bg-ink/10 flex-grow" />
            <h3 className="font-sans text-[10px] uppercase font-bold text-ink/50 tracking-wider">
              👁 LIVE PREVIEW
            </h3>
            <span className="h-[1px] bg-ink/10 flex-grow" />
          </div>
          <LivePreviewCard
            headline={headline}
            suspect={suspect}
            crimeScene={crimeScene}
            vibe={vibe}
            verdict={verdict}
            plea={plea}
            crimeSceneImage={crimeSceneImage}
            aiDefense={aiDefense}
            aiDefenseImage={aiDefenseImage}
          />
        </div>
      </div>

      <div className="text-center font-sans text-[11px] text-ink/40 mt-8">
        shortcuts: <strong className="font-bold">ctrl + enter</strong> to submit | <strong className="font-bold">esc</strong> to clear
      </div>

      {/* Hidden Meme Card component tree wrapper for Canvas capture */}
      <MemeCard
        headline={headline}
        suspect={suspect}
        aiDefense={aiDefense}
        author={sessionAuthor}
        refInsta={refInsta}
        refTwitter={refTwitter}
        remixStyle={remixSeed}
        crimeSceneImage={crimeSceneImage}
        aiDefenseImage={aiDefenseImage}
      />

      {/* Fullscreen submission loader */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-ink/70 backdrop-blur-md z-50 flex flex-col justify-center items-center p-4">
          <div className="bg-paper border border-ink/20 p-6 max-w-xs w-full text-center space-y-3 rounded-2xl shadow-xl flex flex-col items-center">
            <div className="animate-spin h-6 w-6 border-2 border-ink border-t-transparent rounded-full mb-1" />
            <h2 className="font-sans font-bold text-lg text-ink uppercase tracking-wide">{loadingStatus}</h2>
            <p className="font-sans text-[10px] text-ink/60">making it pretty. hold tight bestie...</p>
          </div>
        </div>
      )}
    </main>
  );
}
