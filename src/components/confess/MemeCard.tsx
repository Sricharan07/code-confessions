import React from "react";
import type { AITool } from "@/lib/store";
import guiltyBotImg from "./guilty_bot.png";

interface MemeCardProps {
  headline: string;
  suspect: AITool;
  aiDefense: string;
  author: string;
  refInsta: React.RefObject<HTMLDivElement | null>;
  refTwitter: React.RefObject<HTMLDivElement | null>;
  remixStyle?: number; // 0: Normal, 1: Dark/Cursed, 2: Volt/Cyberpunk
  crimeSceneImage?: string | null;
  aiDefenseImage?: string | null;
}

export const MemeCard = React.forwardRef<unknown, MemeCardProps>(
  ({ headline, suspect, aiDefense, author, refInsta, refTwitter, remixStyle = 0, crimeSceneImage, aiDefenseImage }, _ref) => {
    const suspectUpper = suspect.toUpperCase();

    // Theme values
    let bg = "oklch(0.965 0.012 85)"; // --paper
    let fg = "oklch(0.16 0.005 0)"; // --ink
    let accent = "oklch(0.93 0.21 100)"; // --volt (yellow)
    let altAccent = "oklch(0.68 0.22 38)"; // --hot (red)
    let gridOpacity = "0.03";

    if (remixStyle % 3 === 1) {
      // Cursed Dark theme
      bg = "oklch(0.16 0.005 0)"; // --ink
      fg = "oklch(0.965 0.012 85)"; // --paper
      accent = "oklch(0.68 0.22 38)"; // --hot (red)
      altAccent = "oklch(0.93 0.21 100)"; // --volt (yellow)
      gridOpacity = "0.08";
    } else if (remixStyle % 3 === 2) {
      // Cyberpunk Volt theme
      bg = "oklch(0.93 0.21 100)"; // --volt (yellow)
      fg = "oklch(0.16 0.005 0)"; // --ink
      accent = "oklch(0.68 0.22 38)"; // --hot (red)
      altAccent = "oklch(0.965 0.012 85)"; // --paper
      gridOpacity = "0.05";
    }

    const cardStyles: React.CSSProperties = {
      background: bg,
      color: fg,
      borderColor: fg,
    };

    return (
      <div className="absolute top-[-9999px] left-[-9999px] pointer-events-none select-none">
        {/* Instagram Size: 1080 x 1080 */}
        <div
          ref={refInsta}
          style={{
            ...cardStyles,
            width: "1080px",
            height: "1080px",
            fontFamily: '"Space Grotesk", sans-serif',
          }}
          className="flex flex-col justify-between p-16 border-[12px] relative overflow-hidden"
        >
          {/* Subtle brutalist grid overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: gridOpacity,
              backgroundImage: `repeating-linear-gradient(45deg, ${fg} 0 4px, transparent 4px 24px)`,
            }}
          />

          {/* Top Header */}
          <div className="flex justify-between items-center z-10">
            <span className="font-display text-5xl tracking-tighter uppercase">
              VIBE<span style={{ background: fg, color: bg }} className="px-2 py-0.5 ml-1">FAIL</span>
            </span>
            <span
              style={{ background: accent, color: fg, borderColor: fg }}
              className="font-mono text-xl font-bold px-4 py-2 border-4 shadow-[4px_4px_0_0_#000] uppercase"
            >
              ★ EXHIBIT A
            </span>
          </div>

          {/* Middle Content */}
          <div className="space-y-8 z-10 flex-grow flex flex-col justify-center">
            <h1
              style={{
                fontFamily: '"Archivo Black", sans-serif',
                lineHeight: "1.0",
                borderColor: fg,
                color: fg,
              }}
              className="text-5xl uppercase tracking-tight border-b-8 pb-6"
            >
              {headline.trim() || "UNTITLED TRAUMA"}
            </h1>

            {/* Polaroid frame for crime scene image if present */}
            {crimeSceneImage && (
              <div 
                style={{ borderColor: fg }} 
                className="border-[6px] bg-white p-4 shadow-[10px_10px_0_0_#000] rotate-[-1.5deg] max-w-[420px] mx-auto flex flex-col items-center"
              >
                <div className="border-[3px] border-black w-full aspect-video overflow-hidden">
                  <img src={crimeSceneImage} className="w-full h-full object-cover" alt="Attached evidence" />
                </div>
                <div className="text-center font-mono text-sm text-black mt-3 uppercase tracking-wider font-bold">
                  📸 EVIDENCE ATTACHED
                </div>
              </div>
            )}

            {/* Speech Bubble / Quote */}
            {(aiDefense.trim() || aiDefenseImage) && (
              <div
                style={{ borderColor: fg, background: bg }}
                className="border-[6px] p-8 relative shadow-[12px_12px_0_0_#000] space-y-4"
              >
                <div
                  style={{ color: altAccent }}
                  className="font-mono text-lg font-bold tracking-wide uppercase"
                >
                  ⚡ {suspectUpper} SAID:
                </div>
                {aiDefense.trim() && (
                  <p
                    style={{ fontFamily: '"Space Mono", monospace', color: fg }}
                    className="text-2xl leading-relaxed italic"
                  >
                    &ldquo;{aiDefense.trim()}&rdquo;
                  </p>
                )}

                {aiDefenseImage && (
                  <div style={{ borderColor: fg }} className="border-4 rounded-lg overflow-hidden max-h-48 mt-2 bg-black/5 flex items-center justify-center">
                    <img src={aiDefenseImage} className="max-h-48 max-w-full object-contain" alt="AI evidence" />
                  </div>
                )}

                {/* Sticker overlay on speech bubble */}
                <div className="absolute -right-8 -bottom-10 w-44 h-44 transform rotate-[10deg] z-20">
                  <img src={guiltyBotImg} className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)]" alt="Guilty Bot" />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Watermark */}
          <div style={{ borderColor: fg }} className="flex justify-between items-center border-t-8 pt-8 z-10">
            <span className="font-mono text-xl font-bold uppercase">— {author}</span>
            <span style={{ color: fg }} className="font-mono text-xl font-bold opacity-75 uppercase">
              vibefail.app
            </span>
          </div>
        </div>

        {/* Twitter Size: 1200 x 675 */}
        <div
          ref={refTwitter}
          style={{
            ...cardStyles,
            width: "1200px",
            height: "675px",
            fontFamily: '"Space Grotesk", sans-serif',
          }}
          className="flex flex-col justify-between p-12 border-[10px] relative overflow-hidden"
        >
          {/* Subtle grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: gridOpacity,
              backgroundImage: `repeating-linear-gradient(45deg, ${fg} 0 4px, transparent 4px 24px)`,
            }}
          />

          {/* Top Header */}
          <div className="flex justify-between items-center z-10">
            <span className="font-display text-4xl tracking-tighter uppercase">
              VIBE<span style={{ background: fg, color: bg }} className="px-2 py-0.5 ml-1">FAIL</span>
            </span>
            <span
              style={{ background: accent, color: fg, borderColor: fg }}
              className="font-mono text-lg font-bold px-4 py-2 border-4 shadow-[4px_4px_0_0_#000] uppercase"
            >
              ★ EXHIBIT A
            </span>
          </div>

          {/* Middle Content */}
          <div className="space-y-6 z-10 flex-grow flex flex-col justify-center">
            <h1
              style={{
                fontFamily: '"Archivo Black", sans-serif',
                lineHeight: "1.0",
                borderColor: fg,
                color: fg,
              }}
              className="text-4xl uppercase tracking-tight border-b-6 pb-4"
            >
              {headline.trim() || "UNTITLED TRAUMA"}
            </h1>

            {crimeSceneImage ? (
              /* Two column side-by-side layout when screenshot evidence is present */
              <div className="grid grid-cols-12 gap-8 items-center">
                <div className="col-span-7">
                  {/* Speech Bubble / Quote */}
                  {(aiDefense.trim() || aiDefenseImage) && (
                    <div
                      style={{ borderColor: fg, background: bg }}
                      className="border-4 p-6 relative shadow-[10px_10px_0_0_#000] space-y-2"
                    >
                      <div
                        style={{ color: altAccent }}
                        className="font-mono text-sm font-bold tracking-wide uppercase"
                      >
                        ⚡ {suspectUpper} SAID:
                      </div>
                      {aiDefense.trim() && (
                        <p
                          style={{ fontFamily: '"Space Mono", monospace', color: fg }}
                          className="text-lg leading-relaxed italic"
                        >
                          &ldquo;{aiDefense.trim()}&rdquo;
                        </p>
                      )}

                      {aiDefenseImage && (
                        <div style={{ borderColor: fg }} className="border-2 rounded-lg overflow-hidden max-h-36 mt-2 bg-black/5 flex items-center justify-center">
                          <img src={aiDefenseImage} className="max-h-36 max-w-full object-contain" alt="AI evidence" />
                        </div>
                      )}

                      {/* Sticker overlay on speech bubble */}
                      <div className="absolute -right-6 -bottom-8 w-32 h-32 transform rotate-[10deg] z-20">
                        <img src={guiltyBotImg} className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)]" alt="Guilty Bot" />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="col-span-5 flex justify-center">
                  <div 
                    style={{ borderColor: fg }} 
                    className="border-4 bg-white p-3 shadow-[8px_8px_0_0_#000] rotate-[1.5deg] max-w-[280px]"
                  >
                    <div className="border-[2px] border-black aspect-video overflow-hidden">
                      <img src={crimeSceneImage} className="w-full h-full object-cover" alt="Evidence file" />
                    </div>
                    <div className="text-center font-mono text-[10px] text-black mt-2 uppercase tracking-wide font-bold">
                      📸 EVIDENCE ATTACHED
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Single column standard layout */
              (aiDefense.trim() || aiDefenseImage) && (
                <div
                  style={{ borderColor: fg, background: bg }}
                  className="border-4 p-6 relative shadow-[10px_10px_0_0_#000] space-y-2"
                >
                  <div
                    style={{ color: altAccent }}
                    className="font-mono text-sm font-bold tracking-wide uppercase"
                  >
                    ⚡ {suspectUpper} SAID:
                  </div>
                  {aiDefense.trim() && (
                    <p
                      style={{ fontFamily: '"Space Mono", monospace', color: fg }}
                      className="text-xl leading-relaxed italic"
                    >
                      &ldquo;{aiDefense.trim()}&rdquo;
                    </p>
                  )}

                  {aiDefenseImage && (
                    <div style={{ borderColor: fg }} className="border-4 rounded-lg overflow-hidden max-h-40 mt-2 bg-black/5 flex items-center justify-center">
                      <img src={aiDefenseImage} className="max-h-40 max-w-full object-contain" alt="AI evidence" />
                    </div>
                  )}

                  {/* Sticker overlay on speech bubble */}
                  <div className="absolute -right-8 -bottom-10 w-36 h-36 transform rotate-[10deg] z-20">
                    <img src={guiltyBotImg} className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)]" alt="Guilty Bot" />
                  </div>
                </div>
              )
            )}
          </div>

          {/* Bottom Watermark */}
          <div style={{ borderColor: fg }} className="flex justify-between items-center border-t-[6px] pt-4 z-10">
            <span className="font-mono text-lg font-bold uppercase">— {author}</span>
            <span style={{ color: fg }} className="font-mono text-lg font-bold opacity-75 uppercase">
              vibefail.app
            </span>
          </div>
        </div>
      </div>
    );
  }
);

MemeCard.displayName = "MemeCard";
