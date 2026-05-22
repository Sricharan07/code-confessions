import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";

export type Reaction = "rip" | "lol" | "samehere" | "fire";
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
  tool: string; // which AI made the mess
  language: string;
  author: string; // anon handle
  status: Status;
  createdAt: number;
  reactions: Record<Reaction, number>;
  hidden?: boolean;
}

const POSTS_KEY = "vibefail.posts.v1";
const COMMENTS_KEY = "vibefail.comments.v1";
const REACTED_KEY = "vibefail.reacted.v1"; // local dedupe

const SEED: Post[] = [
  {
    id: "p6",
    title: "Claude wrote my entire landing page but used absolute links to its own dev server",
    body: "I asked Claude to build a gorgeous landing page. It looked absolutely stunning. I deployed it. Half of the images and links were pointing to 'http://localhost:5173/assets/...'. Peak vibe coding.",
    tool: "Claude",
    language: "React",
    author: "VibeCoder_9000",
    status: "solved",
    createdAt: Date.now() - 1000 * 60 * 60 * 1,
    reactions: { rip: 512, lol: 921, samehere: 430, fire: 89 },
  },
  {
    id: "p1",
    title: "Claude rewrote my entire auth flow because I asked it to 'tidy up'",
    body: "I asked for a one-line cleanup. It deleted my JWT middleware, replaced it with localStorage tokens, and confidently told me it was 'more idiomatic'. Shipped to prod. Found out from a customer.",
    tool: "Claude",
    language: "TypeScript",
    author: "anon-0x91",
    status: "broken",
    createdAt: Date.now() - 1000 * 60 * 60 * 3,
    reactions: { rip: 142, lol: 88, samehere: 211, fire: 12 },
  },
  {
    id: "p2",
    title: "Cursor deleted my .env then committed it",
    body: "Agent mode. 'Cleaning up unused files.' Force pushed. The .env was the only copy of my Stripe live keys. I am writing this from a bathroom floor.",
    tool: "Cursor",
    language: "Node",
    author: "anon-7e2a",
    status: "broken",
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    reactions: { rip: 904, lol: 312, samehere: 88, fire: 41 },
  },
];

const SEED_COMMENTS: Comment[] = [
  { id: "c1", postId: "p2", body: "the bathroom floor part hits", author: "anon-aa11", createdAt: Date.now() - 1000 * 60 * 30 },
  { id: "c2", postId: "p2", body: "rotate keys. cry later.", author: "anon-bb22", createdAt: Date.now() - 1000 * 60 * 15 },
];

function load<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
}

export type Theme = "light" | "dark" | "system";
let posts: Post[] = [];
let comments: Comment[] = [];
let user: any = null;
let feedTab: "for-you" | "following" | "my-posts" = "for-you";
let theme: Theme = "system";
let initialized = false;
const listeners = new Set<() => void>();
let latestSnapshot: { 
  posts: Post[]; 
  comments: Comment[]; 
  user: any; 
  feedTab: "for-you" | "following" | "my-posts";
  theme: Theme;
} = { 
  posts: SEED, 
  comments: SEED_COMMENTS, 
  user: null,
  feedTab: "for-you",
  theme: "system"
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

export async function fetchFromBackend() {
  if (typeof window === "undefined") return;
  try {
    // 1. Fetch posts and join with profiles
    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select(`
        id,
        title,
        body,
        tool,
        status,
        created_at,
        author_id,
        profiles:author_id (username)
      `)
      .order("created_at", { ascending: false });

    if (postsError) throw postsError;

    // 2. Fetch comments and join with profiles
    const { data: commentsData, error: commentsError } = await supabase
      .from("comments")
      .select(`
        id,
        post_id,
        body,
        created_at,
        author_id,
        profiles:author_id (username)
      `)
      .order("created_at", { ascending: true });

    if (commentsError) throw commentsError;

    // 3. Fetch reactions
    const { data: reactionsData, error: reactionsError } = await supabase
      .from("reactions")
      .select("post_id, reaction_type");

    if (reactionsError) throw reactionsError;

    // Process reaction counts
    const reactionsMap: Record<string, Record<Reaction, number>> = {};
    if (reactionsData) {
      for (const rx of reactionsData) {
        if (!reactionsMap[rx.post_id]) {
          reactionsMap[rx.post_id] = { rip: 0, lol: 0, samehere: 0, fire: 0 };
        }
        const type = rx.reaction_type as Reaction;
        if (reactionsMap[rx.post_id][type] !== undefined) {
          reactionsMap[rx.post_id][type]++;
        }
      }
    }

    // Map database posts to client Post models
    const mappedPosts: Post[] = (postsData || []).map((p: any) => {
      const reactions = reactionsMap[p.id] || { rip: 0, lol: 0, samehere: 0, fire: 0 };
      return {
        id: p.id,
        title: p.title,
        body: p.body,
        tool: p.tool,
        language: "Other",
        author: p.profiles?.username || "anonymous",
        status: (p.status || "broken") as Status,
        createdAt: new Date(p.created_at).getTime(),
        reactions,
        hidden: false
      };
    });

    // Map database comments to client Comment models
    const mappedComments: Comment[] = (commentsData || []).map((c: any) => ({
      id: c.id,
      postId: c.post_id,
      body: c.body,
      author: c.profiles?.username || "anonymous",
      createdAt: new Date(c.created_at).getTime()
    }));

    posts = mappedPosts;
    comments = mappedComments;
    
    // Save to LocalStorage local fallback
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));

    latestSnapshot = { posts, comments, user, feedTab, theme };
    listeners.forEach((l) => l());
  } catch (err) {
    console.error("Supabase sync failed, using local offline copy.", err);
  }
}

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;
  
  if (user?.id) return user.id;
  
  // Sign in anonymously on demand
  const username = `anon-${Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0")}`;
  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: { username, status: "ghost" }
    }
  });
  if (error || !data.user?.id) {
    throw new Error("Failed to authenticate anonymous session");
  }
  
  const registeredGuest = {
    username,
    isGuest: true,
    id: data.user.id
  };
  user = registeredGuest;
  persist();
  return data.user.id;
}

function init() {
  if (initialized || typeof window === "undefined") return;
  posts = load(POSTS_KEY, SEED);
  comments = load(COMMENTS_KEY, SEED_COMMENTS);
  user = load("vibefail.user.v1", null);
  theme = load<Theme>("vibefail.theme.v1", "system");
  latestSnapshot = { posts, comments, user, feedTab, theme };
  initialized = true;

  // Asynchronously query database
  fetchFromBackend();

  // Background polling every 15s
  setInterval(() => {
    fetchFromBackend();
  }, 15000);
}

function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem("vibefail.user.v1", JSON.stringify(user));
  localStorage.setItem("vibefail.theme.v1", JSON.stringify(theme));
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

const serverSnapshot = { posts: SEED, comments: SEED_COMMENTS, user: null, feedTab: "for-you" as const, theme: "system" as const };

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
  user = null;
  feedTab = "for-you";
  persist();
}

export function randomHandle() {
  const hex = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0");
  return `anon-${hex}`;
}

export async function createPost(input: Omit<Post, "id" | "createdAt" | "reactions" | "status" | "author"> & { author?: string }) {
  init();
  try {
    const authorId = await getUserId();
    const { data, error } = await supabase
      .from("posts")
      .insert({
        author_id: authorId,
        title: input.title,
        body: input.body,
        tool: input.tool,
        status: "broken"
      })
      .select()
      .single();

    if (error) throw error;
    
    // Optimistic local state update
    const newPost: Post = {
      id: data.id,
      createdAt: new Date(data.created_at).getTime(),
      reactions: { rip: 0, lol: 0, samehere: 0, fire: 0 },
      status: "broken",
      author: user?.username || "anonymous",
      title: input.title,
      body: input.body,
      tool: input.tool,
      language: "Other"
    };

    posts = [newPost, ...posts];
    latestSnapshot = { posts, comments, user, feedTab, theme };
    listeners.forEach((l) => l());

    fetchFromBackend();
    return newPost;
  } catch (err) {
    console.error("Backend post creation failed, writing locally.", err);
    const post: Post = {
      id: `p${Date.now()}`,
      createdAt: Date.now(),
      reactions: { rip: 0, lol: 0, samehere: 0, fire: 0 },
      status: "broken",
      author: input.author ?? randomHandle(),
      ...input,
      language: "Other"
    };
    posts = [post, ...posts];
    persist();
    return post;
  }
}

export async function addComment(postId: string, body: string) {
  init();
  try {
    const authorId = await getUserId();
    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        author_id: authorId,
        body: body
      })
      .select()
      .single();

    if (error) throw error;

    const newComment: Comment = {
      id: data.id,
      postId: data.post_id,
      body: data.body,
      author: user?.username || "anonymous",
      createdAt: new Date(data.created_at).getTime()
    };

    comments = [...comments, newComment];
    latestSnapshot = { posts, comments, user, feedTab, theme };
    listeners.forEach((l) => l());

    fetchFromBackend();
    return newComment;
  } catch (err) {
    console.error("Backend comment submission failed, saving locally.", err);
    const c: Comment = {
      id: `c${Date.now()}`,
      postId,
      body,
      author: randomHandle(),
      createdAt: Date.now(),
    };
    comments = [...comments, c];
    persist();
    return c;
  }
}

function reactedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(REACTED_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveReacted(s: Set<string>) {
  localStorage.setItem(REACTED_KEY, JSON.stringify([...s]));
}

export async function toggleReaction(postId: string, r: Reaction) {
  init();
  const key = `${postId}:${r}`;
  const s = reactedSet();

  // Enforce single reaction rule locally
  const otherActiveTypes = (["rip", "lol", "samehere", "fire"] as Reaction[]).filter(
    (type) => type !== r && s.has(`${postId}:${type}`)
  );

  // Optimistically toggle states in store
  posts = posts.map((p) => {
    if (p.id !== postId) return p;
    const newReactions = { ...p.reactions };

    // 1. Remove other active reactions if any
    for (const type of otherActiveTypes) {
      const otherKey = `${postId}:${type}`;
      s.delete(otherKey);
      newReactions[type] = Math.max(0, newReactions[type] - 1);
    }

    // 2. Toggle current reaction type
    const hadCurrent = s.has(key);
    if (hadCurrent) {
      s.delete(key);
      newReactions[r] = Math.max(0, newReactions[r] - 1);
    } else {
      s.add(key);
      newReactions[r] = newReactions[r] + 1;
    }

    return { ...p, reactions: newReactions };
  });

  saveReacted(s);
  latestSnapshot = { posts, comments, user, feedTab, theme };
  listeners.forEach((l) => l());

  try {
    const authorId = await getUserId();

    // 1. Nuke other active reaction records from the backend first
    for (const type of otherActiveTypes) {
      await supabase
        .from("reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", authorId)
        .eq("reaction_type", type);
    }

    // 2. Toggle the new reaction in the database
    if (s.has(key)) {
      await supabase
        .from("reactions")
        .insert({
          post_id: postId,
          user_id: authorId,
          reaction_type: r
        });
    } else {
      await supabase
        .from("reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", authorId)
        .eq("reaction_type", r);
    }
  } catch (err) {
    console.error("Backend database reaction toggle failed.", err);
  }
  
  // Re-fetch to ensure counts align
  fetchFromBackend();
}

export function hasReacted(postId: string, r: Reaction) {
  return reactedSet().has(`${postId}:${r}`);
}

export async function setStatus(postId: string, status: Status) {
  init();
  // Optimistic local toggle
  posts = posts.map((p) => (p.id === postId ? { ...p, status } : p));
  latestSnapshot = { posts, comments, user, feedTab, theme };
  listeners.forEach((l) => l());

  try {
    const { error } = await supabase
      .from("posts")
      .update({ status })
      .eq("id", postId);
      
    if (error) throw error;
  } catch (err) {
    console.error("Backend status change failed.", err);
  }
  fetchFromBackend();
}

export function toggleHidden(postId: string) {
  init();
  posts = posts.map((p) => (p.id === postId ? { ...p, hidden: !p.hidden } : p));
  persist();
}

export async function deletePost(postId: string) {
  init();
  posts = posts.filter((p) => p.id !== postId);
  comments = comments.filter((c) => c.postId !== postId);
  latestSnapshot = { posts, comments, user, feedTab, theme };
  listeners.forEach((l) => l());

  try {
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);
      
    if (error) throw error;
  } catch (err) {
    console.error("Backend post delete failed.", err);
  }
  fetchFromBackend();
}

export function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const REACTION_META: Record<Reaction, { label: string; emoji: string }> = {
  rip: { label: "F", emoji: "💀" },
  lol: { label: "LOL", emoji: "😂" },
  samehere: { label: "same", emoji: "🫠" },
  fire: { label: "cursed", emoji: "🔥" },
};

export const TOOLS = ["Claude", "ChatGPT", "Cursor", "Copilot", "Gemini", "v0", "Other"];

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
  latestSnapshot = { posts, comments, user, feedTab, theme };
  listeners.forEach((l) => l());
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
  latestSnapshot = { posts, comments, user, feedTab, theme };
  listeners.forEach((l) => l());
}
export function hasLikedComment(commentId: string): boolean {
  return loadLikedComments().has(commentId);
}
