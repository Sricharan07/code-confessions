import { Link } from "@tanstack/react-router";
import { useState } from "react";

interface PostSuccessProps {
  postId: string;
  headline: string;
  twitterMemeUrl?: string;
  instaMemeUrl?: string;
  author: string;
  onRemixLayout?: () => void; // Stretch goal: Remix layout
}

export function PostSuccess({
  postId,
  headline,
  twitterMemeUrl,
  instaMemeUrl,
  author,
  onRemixLayout,
}: PostSuccessProps) {
  const [downloadFormat, setDownloadFormat] = useState<"twitter" | "insta">("twitter");

  const downloadUrl = downloadFormat === "insta" ? instaMemeUrl : twitterMemeUrl;
  const fileName = `vibefail-${postId}-${downloadFormat}.png`;

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShareToX = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/feed?post=${postId}` : "";
    const shareText = `"${headline}" — confessed on @vibefail ${url}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "VibeFail Confession",
          text: shareText,
          url: url,
        });
        return;
      } catch (err) {
        // Fallback to intent URL if sharing is cancelled or fails
      }
    }

    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(xUrl, "_blank");
  };

  const currentPreviewMeme = downloadFormat === "insta" ? instaMemeUrl : twitterMemeUrl;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-8 animate-fade-in">
      <div className="text-center space-y-2.5">
        <span className="font-sans text-[10px] uppercase bg-volt px-2.5 py-0.5 border border-volt/20 text-ink font-bold rounded-full">
          Exhibit Recorded
        </span>
        <h1 className="font-sans font-black text-4xl sm:text-5xl text-ink uppercase tracking-tight">
          IT&apos;S ON THE WALL. COPE.
        </h1>
        <p className="font-sans text-xs text-ink/60">
          Ur fail is now public. Share the receipt:
        </p>
      </div>

      {currentPreviewMeme && (
        <div className="space-y-4">
          <div className="border border-ink/15 p-0 bg-ink overflow-hidden max-w-lg mx-auto rounded-2xl shadow-sm">
            {/* Aspect Ratio box for preview */}
            <div className={`relative ${downloadFormat === "insta" ? "aspect-square" : "aspect-[1200/675]"} bg-paper flex items-center justify-center`}>
              <img
                src={currentPreviewMeme}
                alt="Generated VibeFail Meme"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <div className="flex justify-center gap-2">
            <button
              onClick={() => setDownloadFormat("twitter")}
              className={`font-sans text-xs px-4 py-1.5 rounded-full border transition-all cursor-pointer ${
                downloadFormat === "twitter" ? "bg-ink text-paper border-ink" : "bg-paper text-ink border-ink/20 hover:bg-ink/5"
              }`}
            >
              🐦 X Size (1200×675)
            </button>
            <button
              onClick={() => setDownloadFormat("insta")}
              className={`font-sans text-xs px-4 py-1.5 rounded-full border transition-all cursor-pointer ${
                downloadFormat === "insta" ? "bg-ink text-paper border-ink" : "bg-paper text-ink border-ink/20 hover:bg-ink/5"
              }`}
            >
              📸 Insta Size (1080×1080)
            </button>
          </div>
        </div>
      )}

      <div className="border border-ink/15 p-6 space-y-4 bg-paper max-w-lg mx-auto rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownload}
            disabled={!downloadUrl}
            className="font-sans text-xs font-bold py-2.5 px-4 bg-ink text-paper rounded-full hover:bg-ink/90 transition-colors disabled:opacity-50 flex-grow sm:flex-initial flex items-center justify-center gap-1 cursor-pointer"
          >
            ★ DOWNLOAD MEME
          </button>
          <button
            onClick={handleShareToX}
            className="font-sans text-xs font-bold py-2.5 px-4 border border-ink/20 text-ink rounded-full hover:bg-ink/5 transition-colors flex-grow sm:flex-initial flex items-center justify-center gap-1 cursor-pointer"
          >
            ★ POST TO X
          </button>
        </div>

        {onRemixLayout && (
          <button
            onClick={onRemixLayout}
            className="w-full font-sans text-xs font-bold py-2.5 px-4 border border-dashed border-ink/20 text-ink rounded-full hover:border-ink/40 hover:bg-volt/10 transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            ★ NEW MEME LAYOUT (REMIX)
          </button>
        )}

        <div className="border-t border-ink/10 pt-4 text-center">
          <Link
            to="/feed"
            search={{ post: postId } as any}
            className="inline-block font-sans text-xs font-semibold hover:text-hot text-ink/75 hover:underline transition-colors"
          >
            → SEE UR POST DETAIL PAGE
          </Link>
        </div>
      </div>
    </div>
  );
}
