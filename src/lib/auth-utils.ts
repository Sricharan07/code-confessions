import { supabase } from "./supabase";
import { setAuthUser } from "./store";

const API_URL = import.meta.env.VITE_API_URL || "";

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
  const num = Math.floor(100000 + Math.random() * 899999);
  return `${adj}_${noun}_${num}`;
}

async function generateLlmUsernames(): Promise<string[] | null> {
  try {
    const res = await fetch(`${API_URL}/api/usernames`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
    return null;
  } catch {
    return null;
  }
}

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
