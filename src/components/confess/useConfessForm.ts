import { useState, useEffect } from "react";
import type { AITool, Vibe, Verdict, Plea } from "@/lib/store";

export interface FormState {
  headline: string;
  suspect: AITool;
  crimeScene: string;
  vibe: Vibe | "";
  verdict: Verdict;
  aiDefense: string;
  plea: Plea | "";
}

const AUTOSAVE_KEY = "vibefail.submit.draft.v1";

const VIBES: Vibe[] = [
  "4am_energy", "vibe_coding", "deadline_panic",
  "agentic_rogue", "just_woke_up", "worked_5min_ago",
  "drunk_coded", "trust_the_process", "prod_on_fire"
];

const VERDICTS: Verdict[] = [
  "still_broken", "nuked", "solved", "cope_mode", "rebuilt"
];

const PLEAS: Plea[] = [
  "innocent", "deserve_it", "cooked"
];

export function useConfessForm() {
  const [headline, setHeadline] = useState("");
  const [suspect, setSuspect] = useState<AITool>("cursor");
  const [crimeScene, setCrimeScene] = useState("");
  const [vibe, setVibe] = useState<Vibe | "">("");
  const [verdict, setVerdict] = useState<Verdict>("still_broken");
  const [aiDefense, setAiDefense] = useState("");
  const [plea, setPlea] = useState<Plea | "">("");
  const [errors, setErrors] = useState<string[]>([]);

  // Load draft on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as FormState;
        setHeadline(parsed.headline || "");
        setSuspect(parsed.suspect || "cursor");
        setCrimeScene(parsed.crimeScene || "");
        setVibe(parsed.vibe || "");
        setVerdict(parsed.verdict || "still_broken");
        setAiDefense(parsed.aiDefense || "");
        setPlea(parsed.plea || "");
      }
    } catch (e) {
      console.error("Failed to load draft", e);
    }
  }, []);

  // Autosave draft every 2s
  useEffect(() => {
    if (typeof window === "undefined") return;
    const interval = setInterval(() => {
      const state: FormState = {
        headline,
        suspect,
        crimeScene,
        vibe,
        verdict,
        aiDefense,
        plea
      };
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state));
    }, 2000);

    return () => clearInterval(interval);
  }, [headline, suspect, crimeScene, vibe, verdict, aiDefense, plea]);

  const clearDraft = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTOSAVE_KEY);
    }
    setHeadline("");
    setSuspect("cursor");
    setCrimeScene("");
    setVibe("");
    setVerdict("still_broken");
    setAiDefense("");
    setPlea("");
    setErrors([]);
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    const hl = headline.trim();
    const cs = crimeScene.trim();
    const aid = aiDefense.trim();

    if (hl.length < 10) {
      errs.push("ur headline is too short bestie");
    } else if (hl.length > 140) {
      errs.push("chill on the headline — 140 chars max");
    }

    if (cs.length < 20) {
      errs.push("crime scene needs at least 20 chars. give us SOMETHING.");
    } else if (cs.length > 500) {
      errs.push("crime scene too long. keep it under 500 characters.");
    }

    if (aid.length > 280) {
      errs.push("the AI's defense is over 280 chars. trim it down, this is a meme not a thesis.");
    }

    setErrors(errs);
    return errs.length === 0;
  };

  const randomize = () => {
    const randomVibe = VIBES[Math.floor(Math.random() * VIBES.length)];
    const randomVerdict = VERDICTS[Math.floor(Math.random() * VERDICTS.length)];
    const randomPlea = PLEAS[Math.floor(Math.random() * PLEAS.length)];

    setVibe(randomVibe);
    setVerdict(randomVerdict);
    setPlea(randomPlea);
  };

  return {
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
    randomize
  };
}
