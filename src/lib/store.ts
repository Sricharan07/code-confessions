import { useSyncExternalStore, useState, useEffect } from "react";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "vibefail.auth_token";
const REFRESH_TOKEN_KEY = "vibefail.refresh_token";

let rememberSession = true;

export function setRememberSession(remember: boolean) {
  rememberSession = remember;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

function setToken(token: string, refreshToken?: string) {
  if (rememberSession) {
    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

async function apiCall(path: string, method: "GET" | "POST", body?: any) {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (method === "POST") {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export type AITool = "cursor" | "chatgpt" | "claude" | "copilot" | "gemini" | "other";

export type Vibe =
  | "4am_energy"
  | "vibe_coding"
  | "deadline_panic"
  | "agentic_rogue"
  | "just_woke_up"
  | "worked_5min_ago"
  | "drunk_coded"
  | "trust_the_process"
  | "prod_on_fire";

export type Verdict = "still_broken" | "nuked" | "solved" | "cope_mode" | "rebuilt";

export type Plea = "innocent" | "deserve_it" | "cooked";

export type Reaction =
  | "cooked"
  | "relatable"
  | "skill_issue"
  | "cursed"
  | string; // allows secret reactions

export type Status = "broken" | "solved";

export interface Comment {
  id: string;
  postId: string;
  body: string;
  author: string;
  authorSessionId?: string;
  createdAt: number;
}

export interface Post {
  id: string;
  title: string;
  body: string;
  tool: AITool;
  vibe?: Vibe;
  verdict: Verdict;
  plea?: Plea;
  aiDefense?: string;
  memeUrl?: string;
  crimeSceneImage?: string;
  aiDefenseImage?: string;
  language?: string;
  author: string;
  authorSessionId?: string;
  status: Status;
  createdAt: number;
  reactions: Record<string, number>;
  court: { ai_wrong: number; skill_issue: number };
  hidden?: boolean;
}

const REACTED_KEY = "vibefail.reacted.v1"; // local dedupe
const VOTED_COURT_KEY = "vibefail.voted_court.v1";

export const REACTION_META: Record<string, { label: string; emoji: string }> = {
  cooked: { label: "cooked", emoji: "💀" },
  relatable: { label: "relatable", emoji: "😭" },
  skill_issue: { label: "skill issue", emoji: "🤡" },
  cursed: { label: "cursed", emoji: "🔥" },
};

export const TOOLS = ["cursor", "chatgpt", "claude", "copilot", "gemini", "other"];

function mapPostFromDb(p: any): Post {
  return {
    id: p.id,
    title: p.title,
    body: p.body,
    tool: p.tool,
    vibe: p.vibe || undefined,
    verdict: p.verdict,
    plea: p.plea || undefined,
    aiDefense: p.aiDefense || p.ai_defense || undefined,
    memeUrl: p.memeUrl || p.meme_url || undefined,
    crimeSceneImage: p.crimeSceneImage || p.crime_scene_image || undefined,
    aiDefenseImage: p.aiDefenseImage || p.ai_defense_image || undefined,
    author: p.author,
    authorSessionId: p.authorSessionId || p.author_session_id || undefined,
    reactions: p.reactions || {},
    court: p.court || { ai_wrong: 0, skill_issue: 0 },
    hidden: p.hidden || false,
    createdAt: typeof p.createdAt === "number" ? p.createdAt : new Date(p.created_at || p.createdAt).getTime(),
    status: p.status || (p.verdict === "solved" ? "solved" : "broken"),
  };
}

function mapCommentFromDb(c: any): Comment {
  return {
    id: c.id,
    postId: c.postId || c.post_id,
    body: c.body,
    author: c.author,
    authorSessionId: c.authorSessionId || c.author_session_id || undefined,
    createdAt: typeof c.createdAt === "number" ? c.createdAt : new Date(c.created_at || c.createdAt).getTime(),
  };
}

export type Theme = "light" | "dark" | "system";
let posts: Post[] = [];
let comments: Comment[] = [];
let user: any = null;
let feedTab: "for-you" | "following" | "my-posts" = "for-you";
let theme: Theme = "system";
let initialized = false;
const listeners = new Set<() => void>();
let loading = true;
let latestSnapshot = {
  posts: [] as Post[],
  comments: [] as Comment[],
  user: null as any,
  feedTab: "for-you" as "for-you" | "following" | "my-posts",
  theme: "system" as Theme,
  loading: true
};

export function getAvatarUrl(seed: string) {
  const cleanSeed = (seed || "anon").trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < cleanSeed.length; i++) {
    hash = cleanSeed.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);
  const sets = ["set1", "set2", "set4"];
  const set = sets[hash % sets.length];
  return `https://robohash.org/${encodeURIComponent(cleanSeed)}.png?set=${set}&size=150x150`;
}

let userReactionsSet = new Set<string>();
let userVotesMap = new Map<string, string>();

async function loadUserReactionsAndVotes() {
  const token = getToken();
  if (!token) return;

  try {
    const data = await apiCall("/api/user-data", "GET");

    if (data.profile) {
      user = {
        ...user,
        role: data.profile.role || "user",
        username: data.profile.username || user?.username,
        displayName: data.profile.display_name || user?.displayName,
      };
    }

    userReactionsSet.clear();
    if (data.reactions) {
      data.reactions.forEach((r: any) => {
        userReactionsSet.add(`${r.postId}:${r.reactionKey}`);
      });
    }

    userVotesMap.clear();
    if (data.votes) {
      data.votes.forEach((v: any) => {
        userVotesMap.set(v.postId, v.verdict);
      });
    }
    persist();
  } catch (err) {
    console.error("Failed to load user reactions and votes:", err);
  }
}

const ADJECTIVES = ["Repulsive", "Shoddy", "Cursed", "Based", "Anon", "Lost", "Rogue"];
const NOUNS = ["Course", "Razzmatazz", "Pointer", "Exception", "Dev", "Agent", "LLM"];

export function generateRandomUsername() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  let name = "";
  let attempts = 0;
  
  do {
    const num = Math.floor(100000 + Math.random() * 899999);
    name = `${adj}_${noun}_${num}`;
    attempts++;
  } while (attempts < 100 && (
    posts.some((p) => p.author.toLowerCase() === name.toLowerCase()) ||
    comments.some((c) => c.author.toLowerCase() === name.toLowerCase())
  ));
  
  return name;
}

export async function ensureGuestSession() {
  if (typeof window === "undefined") return null;

  // Already have a token — check if it's valid
  const existingToken = getToken();
  if (existingToken) {
    return existingToken;
  }

  // Create a new guest session via the worker
  const data = await apiCall("/api/auth/guest", "POST");
  if (data.error) {
    console.error("Failed to create guest session:", data.error);
    throw new Error(data.error);
  }

  setToken(data.token, data.refreshToken);
  user = data.user;
  persist();

  return data.token;
}

let pollInterval: any = null;

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // Load theme from localStorage on init
  try {
    const storedTheme = localStorage.getItem("vibefail.theme.v1");
    if (storedTheme) {
      theme = JSON.parse(storedTheme);
    }
  } catch (e) {
    console.error("Failed to load theme during init:", e);
  }

  // 1. Check existing session via worker
  const token = getToken();
  if (token) {
    apiCall("/api/auth/session", "GET").then((data) => {
      if (data.user) {
        user = data.user;
        loadUserReactionsAndVotes();
        persist();
      } else {
        // Token is invalid — clear it and create new guest
        clearToken();
        user = null;
        persist();
        ensureGuestSession().catch((err) => {
          console.error("Auto guest session failed during init:", err);
        });
      }
    });
  } else {
    ensureGuestSession().catch((err) => {
      console.error("Auto guest session failed during init:", err);
    });
  }

  // 2. Fetch initial posts and comments from worker
  (async () => {
    try {
      const [postsData, commentsData] = await Promise.all([
        apiCall("/api/posts", "GET"),
        apiCall("/api/comments", "GET"),
      ]);

      if (Array.isArray(postsData)) {
        posts = postsData.map(mapPostFromDb);
      }
      if (Array.isArray(commentsData)) {
        comments = commentsData.map(mapCommentFromDb);
      }
      loading = false;
      persist();
    } catch (err) {
      console.error("Failed to load initial data:", err);
      loading = false;
      persist();
    }
  })();

  // 3. Poll for updates every 30 seconds (replaces Supabase realtime)
  pollInterval = setInterval(async () => {
    try {
      const [postsData, commentsData] = await Promise.all([
        apiCall("/api/posts", "GET"),
        apiCall("/api/comments", "GET"),
      ]);

      if (Array.isArray(postsData)) {
        posts = postsData.map(mapPostFromDb);
      }
      if (Array.isArray(commentsData)) {
        comments = commentsData.map(mapCommentFromDb);
      }
      persist();
    } catch (err) {
      // Silently fail on polling errors
    }
  }, 30000);
}

function persist() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("vibefail.theme.v1", JSON.stringify(theme));
    } catch (e) {
      console.error("Failed to save theme to localStorage:", e);
    }
  }
  latestSnapshot = { posts, comments, user, feedTab, theme, loading };
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  init();
  listeners.add(l);
  return () => listeners.delete(l);
}

function snapshot() {
  init();
  return latestSnapshot;
}

const serverSnapshot = { posts: [] as Post[], comments: [] as Comment[], user: null as any, feedTab: "for-you" as const, theme: "system" as const, loading: true };

export function useStore() {
  return useSyncExternalStore(subscribe, snapshot, () => serverSnapshot);
}

export function setFeedTab(tab: "for-you" | "following" | "my-posts") {
  init();
  feedTab = tab;
  latestSnapshot = { posts, comments, user, feedTab, theme, loading };
  listeners.forEach((l) => l());
}

export function setTheme(t: Theme) {
  init();
  theme = t;
  persist();
}

export function setAuthUser(u: any) {
  init();
  user = u;
  if (u) {
    loadUserReactionsAndVotes();
  }
  persist();
}

export function logout() {
  init();
  apiCall("/api/auth/logout", "POST").catch(() => {});
  clearToken();
  user = null;
  feedTab = "for-you";
  userReactionsSet.clear();
  userVotesMap.clear();
  persist();
}

function safeUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function randomHandle() {
  let handle = "";
  let attempts = 0;
  
  do {
    const hex = Math.floor(0x100000 + Math.random() * 0xefffff)
      .toString(16)
      .padStart(6, "0");
    handle = `anon-${hex}`;
    attempts++;
  } while (attempts < 100 && (
    posts.some((p) => p.author.toLowerCase() === handle.toLowerCase()) ||
    comments.some((c) => c.author.toLowerCase() === handle.toLowerCase())
  ));
  
  return handle;
}

export function createPost(
  input: Omit<Post, "id" | "createdAt" | "reactions" | "status" | "author" | "court" | "verdict"> & { verdict?: Verdict, author?: string, recaptchaToken?: string }
): Post {
  init();
  const id = safeUUID();
  const optimisticPost: Post = {
    id,
    title: input.title,
    body: input.body,
    tool: input.tool,
    vibe: input.vibe,
    verdict: input.verdict || "still_broken",
    plea: input.plea,
    aiDefense: input.aiDefense,
    memeUrl: input.memeUrl,
    crimeSceneImage: input.crimeSceneImage,
    aiDefenseImage: input.aiDefenseImage,
    author: input.author || user?.displayName || user?.username || randomHandle(),
    authorSessionId: user?.id,
    status: "broken",
    createdAt: Date.now(),
    reactions: { cooked: 0, relatable: 0, skill_issue: 0, cursed: 0 },
    court: { ai_wrong: 0, skill_issue: 0 },
    hidden: false,
  };

  posts = [optimisticPost, ...posts];
  persist();

  (async () => {
    try {
      await ensureGuestSession();
      const res = await apiCall("/api/posts", "POST", {
          title: input.title,
          body: input.body,
          tool: input.tool,
          vibe: input.vibe,
          verdict: input.verdict,
          plea: input.plea,
          aiDefense: input.aiDefense,
          memeUrl: input.memeUrl,
          crimeSceneImage: input.crimeSceneImage,
          aiDefenseImage: input.aiDefenseImage,
          recaptchaToken: input.recaptchaToken,
      });
      if (res && "error" in res) {
        console.error("Failed to save post to database:", res.error);
      }
    } catch (err) {
      console.error("Error creating post server side:", err);
    }
  })();

  return optimisticPost;
}

export async function addComment(postId: string, body: string) {
  init();
  const id = safeUUID();
  const optimisticComment: Comment = {
    id,
    postId,
    body,
    author: user ? (user.displayName || user.username) : randomHandle(),
    authorSessionId: user?.id,
    createdAt: Date.now(),
  };

  comments = [...comments, optimisticComment];
  persist();

  (async () => {
    try {
      await ensureGuestSession();
      const res = await apiCall("/api/comments", "POST", { postId, body });
      if (res && "error" in res) {
        console.error("Failed to save comment to database:", res.error);
      }
    } catch (err) {
      console.error("Error creating comment server side:", err);
    }
  })();

  return optimisticComment;
}

export async function toggleReaction(postId: string, r: Reaction) {
  init();
  const key = `${postId}:${r}`;
  // Find any existing reaction for this post
  let previousReaction: string | null = null;
  for (const entry of userReactionsSet) {
    if (entry.startsWith(`${postId}:`)) {
      previousReaction = entry.split(":")[1];
      break;
    }
  }

  const active = previousReaction === r;

  posts = posts.map((p) => {
    if (p.id !== postId) return p;
    const reactions = { ...p.reactions };

    if (previousReaction) {
      reactions[previousReaction] = Math.max(0, (reactions[previousReaction] || 0) - 1);
    }
    if (!active) {
      reactions[r] = (reactions[r] || 0) + 1;
    }
    return { ...p, reactions };
  });

  if (previousReaction) {
    userReactionsSet.delete(`${postId}:${previousReaction}`);
  }
  if (!active) {
    userReactionsSet.add(key);
  }
  persist();

  (async () => {
    try {
      await ensureGuestSession();
      const res = await apiCall("/api/reactions", "POST", { postId, reactionKey: r });
      if (res && "error" in res) {
        console.error("Failed to toggle reaction on database:", res.error);
        // rollback optimistic updates on failure
        posts = posts.map((p) => {
          if (p.id !== postId) return p;
          const reactions = { ...p.reactions };
          if (!active) {
            reactions[r] = Math.max(0, (reactions[r] || 0) - 1);
          }
          if (previousReaction) {
            reactions[previousReaction] = (reactions[previousReaction] || 0) + 1;
          }
          return { ...p, reactions };
        });
        if (!active) {
          userReactionsSet.delete(key);
        }
        if (previousReaction) {
          userReactionsSet.add(`${postId}:${previousReaction}`);
        }
        persist();
      }
    } catch (err) {
      console.error("Error toggling reaction server side:", err);
    }
  })();
}

export function hasReacted(postId: string, r: Reaction) {
  return userReactionsSet.has(`${postId}:${r}`);
}

export async function setStatus(postId: string, status: Status) {
  init();
  await ensureGuestSession();
  posts = posts.map((p) =>
    p.id === postId ? { ...p, status, verdict: status === "solved" ? "solved" : "still_broken" } : p
  );
  persist();

  await apiCall("/api/posts/status", "POST", { postId, status });
}

export async function toggleHidden(postId: string) {
  init();
  await ensureGuestSession();
  const post = posts.find((p) => p.id === postId);
  if (!post) return;
  const newHidden = !post.hidden;
  posts = posts.map((p) => (p.id === postId ? { ...p, hidden: newHidden } : p));
  persist();

  await apiCall("/api/posts/hide", "POST", { postId });
}

export async function deletePost(postId: string) {
  init();
  await ensureGuestSession();
  posts = posts.filter((p) => p.id !== postId);
  comments = comments.filter((c) => c.postId !== postId);
  persist();

  await apiCall("/api/posts/delete", "POST", { postId });
}

export async function updatePost(
  postId: string,
  updates: Partial<Omit<Post, "id" | "createdAt" | "reactions" | "court" | "author" | "authorSessionId">>
) {
  init();
  await ensureGuestSession();
  posts = posts.map((p) => (p.id === postId ? { ...p, ...updates } : p));
  persist();

  const res = await apiCall("/api/posts/update", "POST", { postId, updates });
  if (res.error) {
    console.error("Failed to update post in database:", res.error);
    throw new Error(res.error);
  }
}

export async function deleteComment(commentId: string) {
  init();
  await ensureGuestSession();
  comments = comments.filter((c) => c.id !== commentId);
  persist();

  const res = await apiCall("/api/comments/delete", "POST", { commentId });
  if (res.error) {
    console.error("Failed to delete comment from database:", res.error);
    throw new Error(res.error);
  }
}

export async function reportContent(targetType: "post" | "comment", targetId: string, reason: string) {
  init();
  await ensureGuestSession();
  
  const res = await apiCall("/api/reports", "POST", { targetType, targetId, reason });
  if (res.error) {
    console.error("Failed to submit report:", res.error);
    throw new Error(res.error);
  }
}

export function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export interface SecretReaction {
  emoji: string;
  key: string;
  expiresAt: number;
}


// Bookmark/Save Confessions
const SAVED_POSTS_KEY = "vibefail.saved_posts.v1";
function loadSavedPosts(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(SAVED_POSTS_KEY) || "[]")); }
  catch { return new Set(); }
}
export function toggleSavePost(postId: string) {
  init();
  const s = loadSavedPosts();
  if (s.has(postId)) {
    s.delete(postId);
  } else {
    s.add(postId);
  }
  localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify([...s]));
  persist();
}
export function isPostSaved(postId: string): boolean {
  return loadSavedPosts().has(postId);
}

// Liked Comments
const LIKED_COMMENTS_KEY = "vibefail.liked_comments.v1";
function loadLikedComments(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_COMMENTS_KEY) || "[]")); }
  catch { return new Set(); }
}
export function toggleLikeComment(commentId: string) {
  init();
  const s = loadLikedComments();
  if (s.has(commentId)) {
    s.delete(commentId);
  } else {
    s.add(commentId);
  }
  localStorage.setItem(LIKED_COMMENTS_KEY, JSON.stringify([...s]));
  persist();
}
export function isCommentLiked(commentId: string): boolean {
  return loadLikedComments().has(commentId);
}
export const hasLikedComment = isCommentLiked;

// Secret reaction of the week
const SECRET_REACTIONS = [
  { emoji: "🥲", key: "humbled" },
  { emoji: "🫨", key: "shaken" },
  { emoji: "🤖", key: "betrayed" },
  { emoji: "🧂", key: "salty" },
  { emoji: "🪞", key: "mirrored" },
  { emoji: "🚬", key: "cigarette_break" },
];

export function getSecretReactionOfTheWeek(): SecretReaction {
  const MS_PER_WEEK = 604800000;
  const TUESDAY_OFFSET = 5 * 24 * 60 * 60 * 1000; // Jan 6, 1970 was a Tuesday
  const now = Date.now();
  const shiftedTime = now - TUESDAY_OFFSET;
  const weekBucket = Math.floor(shiftedTime / MS_PER_WEEK);
  const index = ((weekBucket % SECRET_REACTIONS.length) + SECRET_REACTIONS.length) % SECRET_REACTIONS.length;

  const reaction = SECRET_REACTIONS[index];
  const nextTuesday = getNextTuesdayUTC();

  return {
    ...reaction,
    expiresAt: nextTuesday,
  };
}

function getNextTuesdayUTC(): number {
  const now = new Date()
  const day = now.getUTCDay()
  const daysUntilTuesday = (2 - day + 7) % 7 || 7
  const next = new Date(now)
  next.setUTCDate(now.getUTCDate() + daysUntilTuesday)
  next.setUTCHours(0, 0, 0, 0)
  return next.getTime()
}

export function voteCourt(postId: string, verdict: "ai_wrong" | "skill_issue") {
  init();
  const previousVerdict = userVotesMap.get(postId);
  if (previousVerdict === verdict) return; // no change

  posts = posts.map((p) => {
    if (p.id !== postId) return p;
    const court = { ...(p.court || { ai_wrong: 0, skill_issue: 0 }) };
    
    if (previousVerdict === "ai_wrong" || previousVerdict === "skill_issue") {
      court[previousVerdict] = Math.max(0, (court[previousVerdict] || 0) - 1);
    }
    court[verdict] = (court[verdict] || 0) + 1;
    
    return { ...p, court };
  });

  userVotesMap.set(postId, verdict);
  persist();

  (async () => {
    try {
      await ensureGuestSession();
      const res = await apiCall("/api/votes", "POST", { postId, verdict });
      if (res && "error" in res) {
        console.error("Failed to vote court on server:", res.error);
        // rollback
        posts = posts.map((p) => {
          if (p.id !== postId) return p;
          const court = { ...(p.court || { ai_wrong: 0, skill_issue: 0 }) };
          court[verdict] = Math.max(0, (court[verdict] || 0) - 1);
          if (previousVerdict === "ai_wrong" || previousVerdict === "skill_issue") {
            court[previousVerdict] = (court[previousVerdict] || 0) + 1;
          }
          return { ...p, court };
        });
        if (previousVerdict) {
          userVotesMap.set(postId, previousVerdict);
        } else {
          userVotesMap.delete(postId);
        }
        persist();
      }
    } catch (err) {
      console.error("Error voting court server side:", err);
    }
  })();
}

export function getCourtRatio(postId: string) {
  init();
  const post = posts.find((p) => p.id === postId);
  const court = post?.court || { ai_wrong: 0, skill_issue: 0 };
  const total = (court.ai_wrong || 0) + (court.skill_issue || 0);
  if (total === 0) {
    return { aiWrongPct: 0, skillIssuePct: 0, total: 0 };
  }
  const aiWrongPct = Math.round((court.ai_wrong / total) * 100);
  const skillIssuePct = 100 - aiWrongPct;
  return { aiWrongPct, skillIssuePct, total };
}

// React hooks to rewrite as per prompt
export function usePosts(options?: { sort?: string; filter?: { tool?: string } }) {
  const { posts } = useStore();

  let filtered = [...posts];

  const sort = options?.sort;
  if (sort === "hot") {
    filtered.sort((a, b) => {
      const score = (p: Post) => {
        const total = Object.values(p.reactions).reduce((sum, v) => sum + v, 0);
        const hoursAgo = (Date.now() - p.createdAt) / (1000 * 60 * 60);
        return total / Math.pow(hoursAgo + 2, 1.5);
      };
      return score(b) - score(a);
    });
  } else if (sort === "top") {
    filtered.sort((a, b) => {
      const totalA = Object.values(a.reactions).reduce((sum, v) => sum + v, 0);
      const totalB = Object.values(b.reactions).reduce((sum, v) => sum + v, 0);
      return totalB - totalA;
    });
  } else {
    // default: newest
    filtered.sort((a, b) => b.createdAt - a.createdAt);
  }

  if (options?.filter?.tool) {
    filtered = filtered.filter((p) => p.tool === options.filter!.tool);
  }

  return filtered;
}

export function useComments(postId: string) {
  const { comments } = useStore();
  return comments.filter((c) => c.postId === postId);
}

export async function refreshFeed() {
  try {
    const [postsData, commentsData] = await Promise.all([
      apiCall("/api/posts", "GET"),
      apiCall("/api/comments", "GET"),
    ]);

    if (Array.isArray(postsData)) {
      posts = postsData.map(mapPostFromDb);
    }
    if (Array.isArray(commentsData)) {
      comments = commentsData.map(mapCommentFromDb);
    }
    persist();
  } catch (err) {
    console.error("Failed to refresh feed:", err);
  }
}

// Export apiCall and token helpers for other modules
export { apiCall, getToken, setToken, clearToken };
