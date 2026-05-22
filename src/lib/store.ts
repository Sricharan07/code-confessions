import { useSyncExternalStore, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  createPostFn,
  toggleReactionFn,
  voteCourtFn,
  createCommentFn,
} from "@/server/confess";

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

function setCookie(name: string, value: string, days = 7) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  const secureAttr = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${value}; path=/; expires=${expires}; SameSite=Lax${secureAttr}`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  const secureAttr = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax${secureAttr}`;
}

function mapPostFromDb(p: any): Post {
  return {
    id: p.id,
    title: p.title,
    body: p.body,
    tool: p.tool,
    vibe: p.vibe || undefined,
    verdict: p.verdict,
    plea: p.plea || undefined,
    aiDefense: p.ai_defense || undefined,
    memeUrl: p.meme_url || undefined,
    crimeSceneImage: p.crime_scene_image || undefined,
    aiDefenseImage: p.ai_defense_image || undefined,
    author: p.author,
    authorSessionId: p.author_session_id || undefined,
    reactions: p.reactions || {},
    court: p.court || { ai_wrong: 0, skill_issue: 0 },
    hidden: p.hidden || false,
    createdAt: new Date(p.created_at).getTime(),
    status: p.verdict === "solved" ? "solved" : "broken",
  };
}

function mapCommentFromDb(c: any): Comment {
  return {
    id: c.id,
    postId: c.post_id,
    body: c.body,
    author: c.author,
    createdAt: new Date(c.created_at).getTime(),
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
let latestSnapshot = {
  posts: [] as Post[],
  comments: [] as Comment[],
  user: null as any,
  feedTab: "for-you" as "for-you" | "following" | "my-posts",
  theme: "system" as Theme
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

async function loadUserReactionsAndVotes(userId: string) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, username")
      .eq("id", userId)
      .single();

    if (profile) {
      user = {
        ...user,
        role: profile.role || "user",
        username: profile.username || user?.username,
      };
    }

    const { data: rxLogs } = await supabase
      .from("reaction_logs")
      .select("post_id, reaction_key")
      .eq("session_id", userId);
    
    userReactionsSet.clear();
    if (rxLogs) {
      rxLogs.forEach((r) => {
        userReactionsSet.add(`${r.post_id}:${r.reaction_key}`);
      });
    }

    const { data: votes } = await supabase
      .from("court_votes")
      .select("post_id, verdict")
      .eq("session_id", userId);
    
    userVotesMap.clear();
    if (votes) {
      votes.forEach((v) => {
        userVotesMap.set(v.post_id, v.verdict);
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

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    setCookie("sb-access-token", session.access_token);
    setCookie("sb-refresh-token", session.refresh_token);
    return session;
  }

  const username = generateRandomUsername();
  const email = `guest_${safeUUID().replace(/-/g, "")}@vibefail.local`;
  const password = safeUUID();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        is_guest: true,
      },
    },
  });

  if (error) {
    console.error("Failed to auto-sign in guest:", error);
    throw error;
  }

  if (data.session) {
    setCookie("sb-access-token", data.session.access_token);
    setCookie("sb-refresh-token", data.session.refresh_token);

    const isGuest = data.session.user.user_metadata.is_guest || false;
    const usernameVal = data.session.user.user_metadata.username || data.session.user.email?.split("@")[0] || "anon";
    user = { id: data.session.user.id, username: usernameVal, isGuest };
    persist();
  }

  return data.session;
}

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // Load theme from localStorage on init
  if (typeof window !== "undefined") {
    try {
      const storedTheme = localStorage.getItem("vibefail.theme.v1");
      if (storedTheme) {
        theme = JSON.parse(storedTheme);
      }
    } catch (e) {
      console.error("Failed to load theme during init:", e);
    }
  }

  // 1. Initial auth sync
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      const isGuest = session.user.user_metadata.is_guest || false;
      const username = session.user.user_metadata.username || session.user.email?.split("@")[0] || "anon";
      user = { id: session.user.id, username, isGuest };
      setCookie("sb-access-token", session.access_token);
      setCookie("sb-refresh-token", session.refresh_token);
      loadUserReactionsAndVotes(session.user.id);
      persist();
    } else {
      user = null;
      userReactionsSet.clear();
      userVotesMap.clear();
      persist();
      ensureGuestSession().catch((err) => {
        console.error("Auto guest session failed during init:", err);
      });
    }
  });

  // 2. Auth state change listener
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      const isGuest = session.user.user_metadata.is_guest || false;
      const username = session.user.user_metadata.username || session.user.email?.split("@")[0] || "anon";
      user = { id: session.user.id, username, isGuest };
      setCookie("sb-access-token", session.access_token);
      setCookie("sb-refresh-token", session.refresh_token);
      loadUserReactionsAndVotes(session.user.id);
    } else {
      user = null;
      userReactionsSet.clear();
      userVotesMap.clear();
      deleteCookie("sb-access-token");
      deleteCookie("sb-refresh-token");
    }
    persist();
  });

  // 3. Query posts and comments
  (async () => {
    try {
      const { data: postsData } = await supabase
        .from("posts")
        .select("*")
        .eq("hidden", false);
      if (postsData) {
        posts = postsData.map(mapPostFromDb);
      }

      const { data: commentsData } = await supabase
        .from("comments")
        .select("*")
        .eq("hidden", false);
      if (commentsData) {
        comments = commentsData.map(mapCommentFromDb);
      }
      persist();
    } catch (err) {
      console.error("Failed to load initial data from Supabase:", err);
    }
  })();

  // 4. Realtime subscription
  supabase
    .channel("public:posts")
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "posts",
    }, (payload) => {
      if (payload.eventType === "INSERT") {
        const newPost = mapPostFromDb(payload.new);
        if (!newPost.hidden) {
          if (!posts.some((p) => p.id === newPost.id)) {
            posts = [newPost, ...posts];
            persist();
          }
        }
      } else if (payload.eventType === "UPDATE") {
        const updatedPost = mapPostFromDb(payload.new);
        if (updatedPost.hidden) {
          posts = posts.filter((p) => p.id !== updatedPost.id);
        } else {
          posts = posts.map((p) => (p.id === updatedPost.id ? updatedPost : p));
        }
        persist();
      } else if (payload.eventType === "DELETE") {
        posts = posts.filter((p) => p.id !== payload.old.id);
        persist();
      }
    })
    .subscribe();

  // Subscribe to comments
  supabase
    .channel("public:comments")
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "comments",
    }, (payload) => {
      if (payload.eventType === "INSERT") {
        const newComment = mapCommentFromDb(payload.new);
        if (!comments.some((c) => c.id === newComment.id)) {
          comments = [...comments, newComment];
          persist();
        }
      } else if (payload.eventType === "UPDATE") {
        const updatedComment = mapCommentFromDb(payload.new);
        comments = comments.map((c) => (c.id === updatedComment.id ? updatedComment : c));
        persist();
      } else if (payload.eventType === "DELETE") {
        comments = comments.filter((c) => c.id !== payload.old.id);
        persist();
      }
    })
    .subscribe();
}

function persist() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("vibefail.theme.v1", JSON.stringify(theme));
    } catch (e) {
      console.error("Failed to save theme to localStorage:", e);
    }
  }
  latestSnapshot = { posts, comments, user, feedTab, theme };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  init();
  listeners.add(l);
  return () => listeners.delete(l);
}

function snapshot() {
  init();
  return latestSnapshot;
}

const serverSnapshot = { posts: [] as Post[], comments: [] as Comment[], user: null as any, feedTab: "for-you" as const, theme: "system" as const };

export function useStore() {
  return useSyncExternalStore(subscribe, snapshot, () => serverSnapshot);
}

export function setFeedTab(tab: "for-you" | "following" | "my-posts") {
  init();
  feedTab = tab;
  latestSnapshot = { posts, comments, user, feedTab, theme };
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
  persist();
}

export function logout() {
  init();
  supabase.auth.signOut();
  user = null;
  feedTab = "for-you";
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
  input: Omit<Post, "id" | "createdAt" | "reactions" | "status" | "author" | "court"> & { author?: string }
) {
  init();
  const id = safeUUID();
  const verdict = input.verdict || "still_broken";

  const optimisticPost: Post = {
    id,
    createdAt: Date.now(),
    reactions: {
      cooked: 0,
      relatable: 0,
      skill_issue: 0,
      cursed: 0,
    },
    status: verdict === "solved" ? "solved" : "broken",
    court: { ai_wrong: 0, skill_issue: 0 },
    author: input.author ?? randomHandle(),
    authorSessionId: user?.id || undefined,
    hidden: false,
    ...input,
    verdict,
  };

  posts = [optimisticPost, ...posts];
  persist();

  // background call
  (async () => {
    try {
      await ensureGuestSession();
      const res = await createPostFn({
        data: {
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
        }
      });
      if (res && "error" in res) {
        console.error("Failed to save post to database:", res.error);
      } else if (res) {
        posts = posts.map((p) => p.id === id ? (res as Post) : p);
        persist();
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
    author: user ? user.username : randomHandle(),
    createdAt: Date.now(),
  };

  comments = [...comments, optimisticComment];
  persist();

  (async () => {
    try {
      await ensureGuestSession();
      const res = await createCommentFn({
        data: { postId, body }
      });
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
      const res = await toggleReactionFn({
        data: { postId, reactionKey: r }
      });
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

  await supabase
    .from("posts")
    .update({ verdict: status === "solved" ? "solved" : "still_broken" })
    .eq("id", postId);
}

export async function toggleHidden(postId: string) {
  init();
  await ensureGuestSession();
  const post = posts.find((p) => p.id === postId);
  if (!post) return;
  const newHidden = !post.hidden;
  posts = posts.map((p) => (p.id === postId ? { ...p, hidden: newHidden } : p));
  persist();

  await supabase
    .from("posts")
    .update({ hidden: newHidden })
    .eq("id", postId);
}

export async function deletePost(postId: string) {
  init();
  await ensureGuestSession();
  posts = posts.filter((p) => p.id !== postId);
  comments = comments.filter((c) => c.postId !== postId);
  persist();

  await supabase.from("posts").delete().eq("id", postId);
}

export async function updatePost(
  postId: string,
  updates: Partial<Omit<Post, "id" | "createdAt" | "reactions" | "court" | "author" | "authorSessionId">>
) {
  init();
  await ensureGuestSession();
  posts = posts.map((p) => (p.id === postId ? { ...p, ...updates } : p));
  persist();

  const dbUpdates: Record<string, any> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.body !== undefined) dbUpdates.body = updates.body;
  if (updates.tool !== undefined) dbUpdates.tool = updates.tool;
  if (updates.vibe !== undefined) dbUpdates.vibe = updates.vibe;
  if (updates.verdict !== undefined) dbUpdates.verdict = updates.verdict;
  if (updates.plea !== undefined) dbUpdates.plea = updates.plea;
  if (updates.aiDefense !== undefined) dbUpdates.ai_defense = updates.aiDefense;
  if (updates.memeUrl !== undefined) dbUpdates.meme_url = updates.memeUrl;
  if (updates.crimeSceneImage !== undefined) dbUpdates.crime_scene_image = updates.crimeSceneImage;
  if (updates.aiDefenseImage !== undefined) dbUpdates.ai_defense_image = updates.aiDefenseImage;
  if (updates.status !== undefined) dbUpdates.verdict = updates.status === "solved" ? "solved" : "still_broken";

  const { error } = await supabase.from("posts").update(dbUpdates).eq("id", postId);
  if (error) {
    console.error("Failed to update post in database:", error);
    throw error;
  }
}

export async function deleteComment(commentId: string) {
  init();
  await ensureGuestSession();
  comments = comments.filter((c) => c.id !== commentId);
  persist();

  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) {
    console.error("Failed to delete comment from database:", error);
    throw error;
  }
}

export async function reportContent(targetType: "post" | "comment", targetId: string, reason: string) {
  init();
  await ensureGuestSession();
  
  const { error } = await supabase.from("reports").insert({
    reporter_session_id: user?.id || null,
    target_type: targetType,
    target_id: targetId,
    reason: reason,
  });

  if (error) {
    console.error("Failed to submit report:", error);
    throw error;
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
export function hasLikedComment(commentId: string): boolean {
  return loadLikedComments().has(commentId);
}

const SECRET_REACTIONS = [
  { emoji: "🥲", key: "humbled" },
  { emoji: "🫨", key: "shaken" },
  { emoji: "🤖", key: "betrayed" },
  { emoji: "🧂", key: "salty" },
  { emoji: "🪞", key: "mirrored" },
  { emoji: "🚬", key: "cigarette_break" },
];

export function getActiveSecretReaction() {
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
      const res = await voteCourtFn({
        data: { postId, verdict }
      });
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
  } else if (sort === "new") {
    filtered.sort((a, b) => b.createdAt - a.createdAt);
  } else if (sort === "still_broken") {
    filtered = filtered.filter((p) => p.verdict === "still_broken");
  }

  const tool = options?.filter?.tool;
  if (tool) {
    filtered = filtered.filter((p) => p.tool === tool);
  }

  return filtered;
}

export function usePost(id: string) {
  const { posts, comments } = useStore();

  const post = posts.find((p) => p.id === id) || null;
  const postComments = comments.filter((c) => c.postId === id);

  const userReactions = Array.from(userReactionsSet)
    .filter((k) => k.startsWith(`${id}:`))
    .map((k) => k.split(":")[1]);
  
  const userVote = userVotesMap.get(id) || null;

  return {
    post,
    comments: postComments,
    userReactions,
    userVote,
  };
}
