import { setAuthUser, apiCall, setToken } from "./store";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

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

export async function loginWithCredentials(username: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Login failed");
  }
  setToken(data.token, data.refreshToken);
  setAuthUser(data.user);
  return data.user;
}

export async function signupWithCredentials(username: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Signup failed");
  }
  setToken(data.token, data.refreshToken);
  setAuthUser(data.user);
  return data.user;
}

export async function loginAsGuest() {
  const res = await fetch(`${API_URL}/api/auth/guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Guest login failed");
  }
  setToken(data.token, data.refreshToken);
  setAuthUser(data.user);
  return data.user;
}
