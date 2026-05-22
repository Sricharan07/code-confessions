import { supabase } from "./supabase";
import { setAuthUser } from "./store";
import { createServerFn } from "@tanstack/react-start";

const ADJECTIVES = [
  "Cursed", "Caffeinated", "Sleepy", "Buggy", "Janky", 
  "Based", "Desperate", "Spaghetti", "Hallucinating", "Deprecated", 
  "Unstable", "Refactored", "Crying", "Sinking", "Legacy", 
  "Overclocked", "Underpaid", "Optimized", "Uncaught", "Glitchy", 
  "Serverless", "Dockerized", "Hardcoded", "Recursive", "LazyLoaded", 
  "Decompiled", "Mocked", "Asynchronous", "RateLimited", "Detached", 
  "Minified", "Obfuscated", "Overengineered", "TypoProne", "BurntOut", 
  "Wired", "PanicDriven", "Syntactic", "Tokenized", "Hotfixed", 
  "Unpatched", "Gzipped", "Bloated", "Compiled", "Untested", 
  "Staged", "Production", "Sandbox", "Raw", "SlightlyBroken"
];

const NOUNS = [
  "VibeCoder", "Intern", "Dev", "Agent", "LLM", 
  "PromptEngineer", "Compiler", "StackOverflow", "Regex", "Callback", 
  "NullPointer", "GitForce", "ProdCrash", "MergeConflict", "GitCommit", 
  "Lambda", "Container", "Packet", "SyntaxError", "Debugger", 
  "ConsoleLog", "PullRequest", "MainBranch", "DevOps", "ScrumMaster", 
  "SaaS", "Database", "MemoryLeak", "Thread", "Json", 
  "Boolean", "String", "Array", "CoffeeCup", "Keyboard", 
  "DualMonitor", "DarkTheme", "TechLead", "FullStack", "FrontEnd", 
  "BackEnd", "Cyberpunk", "Codebase", "BugHunter", "Hacker", 
  "Terminal", "Linter", "InfiniteLoop", "SegmentationFault", "Deadlock"
];

export function generateRandomUsername(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 9999);
  return `${adj}_${noun}_${num}`;
}

export const generateLlmUsernames = createServerFn({
  method: "GET",
})
  .handler(async () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Generate exactly 5 highly creative, funny, sarcastic developer-themed usernames in a plain JSON list of strings (e.g. ["BasedIntern_99", "RefactoredSpaghetti_404"]). Do not use markdown backticks or block syntax.`
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        }
      );

      if (!response.ok) {
        console.warn("Gemini API request failed:", response.statusText);
        return null;
      }

      const resData = await response.json();
      const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        return null;
      }

      const usernames = JSON.parse(text.trim());
      if (Array.isArray(usernames) && usernames.length > 0) {
        return usernames;
      }
      return null;
    } catch (err) {
      console.warn("Error calling Gemini API:", err);
      return null;
    }
  }
);

export async function getCuratedUsernameSuggestions(count = 3): Promise<string[]> {
  try {
    const llmNames = await generateLlmUsernames();
    if (llmNames && Array.isArray(llmNames) && llmNames.length >= count) {
      return llmNames.slice(0, count);
    }
  } catch (err) {
    // Fall back to dictionary silently
  }

  const suggestions: string[] = [];
  while (suggestions.length < count) {
    const name = generateRandomUsername();
    if (!suggestions.includes(name)) {
      suggestions.push(name);
    }
  }
  return suggestions;
}

/**
 * Ensures a valid Supabase user session exists before publishing a post.
 * If the current user is a guest (client-side only, no database record), 
 * it triggers an on-demand anonymous signup, registers their ghost profile,
 * updates the client store, and returns the newly generated user ID.
 * 
 * @returns The Supabase user UUID
 */
export async function ensureSessionForPost(): Promise<string> {
  let localUser: any = null;
  
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("vibefail.user.v1");
      if (raw) {
        localUser = JSON.parse(raw);
      }
    } catch (e) {
      console.error("Failed to parse local user session", e);
    }
  }

  // Case A: User is fully authenticated (either registered or already initialized guest)
  if (localUser && localUser.id) {
    return localUser.id;
  }

  // Case B: User is a client-side guest (id is null) or not signed in at all
  const generatedUsername = generateRandomUsername();
  
  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: {
        username: generatedUsername,
        status: "ghost"
      }
    }
  });

  if (error) {
    throw new Error(`Failed to initialize anonymous guest session: ${error.message}`);
  }

  if (!data.user?.id) {
    throw new Error("Supabase auth did not return a valid user ID.");
  }

  // Update client store & localStorage with the registered guest details
  const registeredGuest = {
    username: generatedUsername,
    isGuest: true,
    id: data.user.id
  };
  
  setAuthUser(registeredGuest);
  
  return data.user.id;
}
